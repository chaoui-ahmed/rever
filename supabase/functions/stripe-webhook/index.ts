import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Internal pricing configuration (adjust these values as needed)
const COST_PER_SCREENSHOT = 50;
const COST_PER_1000_INPUT_TOKENS = 3;
const COST_PER_1000_OUTPUT_TOKENS = 15;
const MINIMUM_CREDITS_REQUIRED = 100; // Minimum balance needed to start generation

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // 2) Parse & validate URL input
    const body = await req.json();
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return new Response(JSON.stringify({ error: 'A valid URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Only http and https URLs are allowed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3) Check balance BEFORE starting (replaces atomic deduct_credit)
    const { data: profile } = await supabaseAdmin.from('profiles').select('credits').eq('id', userId).single();
    if (!profile || profile.credits < MINIMUM_CREDITS_REQUIRED) {
      return new Response(JSON.stringify({ error: `Not enough credits (Minimum ${MINIMUM_CREDITS_REQUIRED} required to start)` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Call ScreenshotAPI.net
    const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY');
    if (!screenshotApiKey) throw new Error('Screenshot API not configured');

    const screenshotParams = new URLSearchParams({
      token: screenshotApiKey,
      url: parsedUrl.href,
      output: 'image',
      file_type: 'png',
      wait_for_event: 'load',
      full_page: 'true',
    });
    
    const screenshotResponse = await fetch(`https://shot.screenshotapi.net/screenshot?${screenshotParams.toString()}`);
    const screenshotData = await screenshotResponse.json();
    const imageUrl = screenshotData?.screenshot;
    
    if (!screenshotResponse.ok || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Failed to capture screenshot' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5) Send to Anthropic
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) throw new Error('Anthropic API not configured');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620', // Recommended stable Claude 3.5 Sonnet
        max_tokens: 4096,
        system: `You are an expert UI/UX reverse-engineer. Given a screenshot of a website, produce a detailed, actionable prompt that a developer could paste into Lovable or v0 to recreate the UI faithfully. Include layout, colors, typography, components, and interactions. Return ONLY the prompt text.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: `Reverse-engineer this screenshot from ${parsedUrl.href} into a detailed Lovable/v0 prompt.` }
          ]
        }],
      }),
    });

    const anthropicData = await anthropicResponse.json();

    if (!anthropicResponse.ok || !anthropicData?.content?.[0]?.text) {
      const errorMsg = anthropicData?.error?.message || 'AI generation failed';
      return new Response(JSON.stringify({ error: `AI generation failed: ${errorMsg}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = anthropicData.content[0].text;

    // 6) Calculate dynamic cost and deduct
    const inputTokens = anthropicData.usage?.input_tokens || 0;
    const outputTokens = anthropicData.usage?.output_tokens || 0;

    const claudeCost = ((inputTokens / 1000) * COST_PER_1000_INPUT_TOKENS) + ((outputTokens / 1000) * COST_PER_1000_OUTPUT_TOKENS);
    const totalCost = Math.ceil(COST_PER_SCREENSHOT + claudeCost);

    // Atomically deduct the exact cost using the existing add_credits RPC (by passing a negative value)
    await supabaseAdmin.rpc('add_credits', { 
      p_user_id: userId, 
      p_amount: -totalCost 
    });

    const creditsRemaining = profile.credits - totalCost;

    // 7) Return successful response
    return new Response(JSON.stringify({ 
      prompt, 
      creditsRemaining,
      costDetail: { totalCost, inputTokens, outputTokens }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});