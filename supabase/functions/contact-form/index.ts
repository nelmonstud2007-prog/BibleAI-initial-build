import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { name, email, subject, message, honeypot } = await req.json();

    // Honeypot check — bots fill this field
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Validate fields
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400, headers: corsHeaders
      });
    }
    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message must be under 1000 characters." }), {
        status: 400, headers: corsHeaders
      });
    }

    // Rate limit: max 3 submissions per hour per IP (using ip_hash)
    const ipHash = req.headers.get("x-forwarded-for") || "unknown";
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("submitted_at", oneHourAgo);

    if ((count || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many submissions. Please wait before trying again." }), {
        status: 429, headers: corsHeaders
      });
    }

    // Store in DB
    const { error: insertError } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      ip_hash: ipHash,
    });
    if (insertError) throw insertError;

    // Send email via Resend (if configured) or log
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Bible AI Contact <noreply@bibleai.app>",
          to: ["bibleaiofficialcontact@gmail.com"],
          reply_to: email.trim(),
          subject: `[Bible AI Contact] ${subject.trim()}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr />
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br/>")}</p>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    });
  }
});
