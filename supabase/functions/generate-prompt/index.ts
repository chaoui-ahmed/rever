import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
};

// Tarification interne (Humains)
const COST_PER_SCREENSHOT = 50;
const COST_PER_1000_INPUT_TOKENS = 3;
const COST_PER_1000_OUTPUT_TOKENS = 15;
const MINIMUM_CREDITS_REQUIRED = 100;

// Tarification externe (Agents IA) - Change ce chiffre quand tu veux !
const AGENT_PRICE_USDC = "1"; 

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Lecture du corps de la requête
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const url = body?.url;
    
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Valid URL required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // --- DETECTION INTELLIGENTE (Humain vs Agent IA) ---
    const userAgent = (req.headers.get('User-Agent') || '').toLowerCase();
    const isAgent = userAgent.includes('llm') || userAgent.includes('gpt') || userAgent.includes('claude') || userAgent.includes('cursor');
    const agentWalletAddress = body?.agent_wallet_address;

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let userId = null;
    let profile = null;

    if (isAgent) {
      // --- ROUTE POUR LES AGENTS IA ---
      // Si l'agent IA n'a pas inclus de preuve de paiement (wallet), on lui envoie la facture
      if (!agentWalletAddress) {
        return new Response(
          JSON.stringify({ 
            error: "Payment Required",
            message: `Rever API: Please execute an x402 payment of ${AGENT_PRICE_USDC} USDC to receive this UI blueprint.`,
            payment_address: "0xB64b22C09d24921f1b4a5599941a27dbCA61b542",
            cost: `${AGENT_PRICE_USDC} USDC`
          }),
          { 
            status: 402, // Statut spécial lu par les wallets d'agents
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      // Note: Dans une v2, c'est ici qu'on vérifierait la blockchain pour voir si l'agent a vraiment payé.
    } else {
      // --- ROUTE POUR LES HUMAINS (Ton code classique avec crédits) ---
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      userId = claimsData.claims.sub as string;

      const { data: profileData } = await supabaseAdmin.from('profiles').select('credits').eq('id', userId).single();
      profile = profileData;

      if (!profile || profile.credits < MINIMUM_CREDITS_REQUIRED) {
        return new Response(JSON.stringify({ error: `Pas assez de crédits (Minimum ${MINIMUM_CREDITS_REQUIRED} requis)` }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- LE CŒUR DE TON APPLICATION (Exécuté pour Humain ET Agent s'ils sont autorisés) ---
    
    // 1) Screenshot
    const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY');
    if (!screenshotApiKey) throw new Error("Clé ScreenshotAPI manquante");

    const screenshotParams = new URLSearchParams({ token: screenshotApiKey, url: url, output: 'json', file_type: 'png', wait_for_event: 'load', full_page: 'true' });
    const screenshotResponse = await fetch(`https://shot.screenshotapi.net/screenshot?${screenshotParams.toString()}`);
    const screenshotData = await screenshotResponse.json();
    const imageUrl = screenshotData?.screenshot;
    
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Échec de la capture d\'écran' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // 2) Image to Base64
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = arrayBufferToBase64(imageBuffer);

    // 3) Claude Haiku
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) throw new Error("Clé Anthropic manquante");

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        system: "You are an expert UI/UX reverse-engineer. Given a screenshot of a website, produce a detailed, actionable prompt that a developer could paste into Lovable or v0 to recreate the UI faithfully. Return ONLY the prompt text.",
        messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Image } },
              { type: 'text', text: `Reverse-engineer this UI.` }
            ]
        }],
      }),
    });

    const anthropicData = await anthropicResponse.json();
    if (!anthropicResponse.ok || !anthropicData?.content?.[0]?.text) {
      return new Response(JSON.stringify({ error: 'Erreur Claude' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    const prompt = anthropicData.content[0].text;
    const inputTokens = anthropicData.usage?.input_tokens || 0;
    const outputTokens = anthropicData.usage?.output_tokens || 0;

    // --- FIN DE REQUÊTE : GESTION DE LA FACTURATION ---
    
    if (isAgent) {
      // Pour les agents, on renvoie juste le prompt (ils ont déjà "payé")
      return new Response(JSON.stringify({ prompt, agent_cost: `${AGENT_PRICE_USDC} USDC`, inputTokens, outputTokens }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Pour les humains, on déduit les crédits de leur base de données
      const claudeCost = ((inputTokens / 1000) * COST_PER_1000_INPUT_TOKENS) + ((outputTokens / 1000) * COST_PER_1000_OUTPUT_TOKENS);
      const totalCost = Math.ceil(COST_PER_SCREENSHOT + claudeCost);

      if (userId && profile) {
        await supabaseAdmin.rpc('add_credits', { p_user_id: userId, p_amount: -totalCost });
        const creditsRemaining = profile.credits - totalCost;

        return new Response(JSON.stringify({ prompt, creditsRemaining, costDetail: { totalCost, inputTokens, outputTokens } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur interne' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});