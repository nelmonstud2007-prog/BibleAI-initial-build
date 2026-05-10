import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { context, count = 3 } = await req.json();

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) throw new Error('GROQ_API_KEY not set');

    const systemPrompt = `You are a compassionate biblical counselor. Based on the user's spiritual context, recommend ${count} Bible verses that would be most meaningful and relevant to them right now.

For each verse, provide:
1. verse_ref: The Bible reference (e.g., "John 3:16")
2. verse_text: The actual verse text (NIV translation, keep it concise)
3. reason: A brief, personal explanation of why this verse is relevant to them (1 sentence)
4. theme: A single word theme (e.g., "Peace", "Strength", "Hope", "Love", "Courage")

Respond ONLY with a valid JSON object in this exact format:
{
  "recommendations": [
    {
      "verse_ref": "...",
      "verse_text": "...",
      "reason": "...",
      "theme": "..."
    }
  ]
}`;

    const userPrompt = `User context: ${context}\n\nRecommend ${count} Bible verses that would be most meaningful for this person right now.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    let recommendations;
    try {
      const parsed = JSON.parse(content);
      recommendations = parsed.recommendations;
    } catch {
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verse-recommendations error:', err);
    return new Response(
      JSON.stringify({ error: err.message, recommendations: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
