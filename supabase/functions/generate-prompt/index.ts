import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    // 2) Parse & validate URL input
    const body = await req.json();
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return new Response(JSON.stringify({ error: 'A valid URL is required (max 2048 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Only http and https URLs are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(hostname) ||
      hostname === '[::1]'
    ) {
      return new Response(JSON.stringify({ error: 'Internal or local URLs are not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Atomically deduct 1 credit (check + deduct in one step)
    const { data: remainingCredits, error: deductError } = await supabaseAdmin.rpc('deduct_credit', { user_id: userId });
    if (deductError || remainingCredits === null || remainingCredits < 0) {
      return new Response(JSON.stringify({ error: 'No credits remaining' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4) Call ScreenshotAPI.net to get a screenshot of the URL
    const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY');
    if (!screenshotApiKey) {
      await supabaseAdmin.rpc('refund_credit', { user_id: userId });
      return new Response(JSON.stringify({ error: 'Screenshot API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const screenshotParams = new URLSearchParams({
      token: screenshotApiKey,
      url: parsedUrl.href,
      output: 'image',
      file_type: 'png',
      wait_for_event: 'load',
      full_page: 'true',
    });
    const screenshotUrl = `https://shot.screenshotapi.net/screenshot?${screenshotParams.toString()}`;

    const screenshotResponse = await fetch(screenshotUrl);
    if (!screenshotResponse.ok) {
      await supabaseAdmin.rpc('refund_credit', { user_id: userId });
      return new Response(JSON.stringify({ error: 'Failed to capture screenshot' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const screenshotData = await screenshotResponse.json();
    const imageUrl = screenshotData?.screenshot;
    if (!imageUrl) {
      await supabaseAdmin.rpc('refund_credit', { user_id: userId });
      return new Response(JSON.stringify({ error: 'Screenshot API returned no image' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5) Send the screenshot to Anthropic Claude 3.5 Sonnet to reverse-engineer the UI
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      await supabaseAdmin.rpc('refund_credit', { user_id: userId });
      return new Response(JSON.stringify({ error: 'Anthropic API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are an expert UI/UX reverse-engineer. Given a screenshot of a website, produce a detailed, actionable prompt that a developer could paste into Lovable or v0 to recreate the UI faithfully. Include:
- Overall layout structure (grid, flex, sections)
- Color palette with exact hex/HSL values where possible
- Typography (font sizes, weights, families)
- Component breakdown (navbar, hero, cards, footer, etc.)
- Spacing, padding, and margin patterns
- Interactive elements (buttons, inputs, hover states)
- Responsive design considerations
Return ONLY the prompt text, no commentary or preamble.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: `Reverse-engineer this screenshot from ${parsedUrl.href} into a detailed Lovable/v0 prompt that would recreate this UI.`,
              },
            ],
          },
        ],
      }),
    });

    const anthropicData = await anthropicResponse.json();

    if (!anthropicResponse.ok || !anthropicData?.content?.[0]?.text) {
      await supabaseAdmin.rpc('refund_credit', { user_id: userId });
      const errorMsg = anthropicData?.error?.message || 'AI generation failed';
      return new Response(JSON.stringify({ error: `AI generation failed: ${errorMsg}. Credit refunded.` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = anthropicData.content[0].text;

    // 6) Return the generated prompt
    return new Response(JSON.stringify({ prompt, creditsRemaining: remainingCredits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
