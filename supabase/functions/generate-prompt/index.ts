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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from token
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const body = await req.json();
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return new Response(JSON.stringify({ error: 'A valid URL is required (max 2048 chars)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format and block internal addresses
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

    // Atomically deduct 1 credit (prevents race conditions)
    const { data: updatedProfile, error: deductError } = await supabase.rpc('deduct_credit', { user_id: user.id });

    if (deductError || !updatedProfile || updatedProfile < 0) {
      return new Response(JSON.stringify({ error: 'No credits remaining' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate prompt using AI gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt engineer. Given a URL, generate a detailed, actionable prompt that could be used to recreate or analyze the content at that URL. The prompt should be clear, specific, and well-structured. Return only the prompt text, no extra commentary.',
          },
          {
            role: 'user',
            content: `Generate a detailed prompt for this URL: ${parsedUrl.href}`,
          },
        ],
        max_tokens: 1024,
      }),
    });

    const aiData = await aiResponse.json();
    const prompt = aiData.choices?.[0]?.message?.content ?? 'Failed to generate prompt.';

    // If AI failed, refund the credit
    if (!aiResponse.ok || !aiData.choices?.[0]?.message?.content) {
      await supabase.rpc('refund_credit', { user_id: user.id });
      return new Response(JSON.stringify({ error: 'AI generation failed, credit refunded' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ prompt, creditsRemaining: updatedProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
