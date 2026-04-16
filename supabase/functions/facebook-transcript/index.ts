import { corsHeaders } from '@supabase/supabase-js/cors'

const BASE = "https://public.evernote.com/transcription/v1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, url, hcaptchaToken, fileId } = await req.json();

    // Step 1: Create from URL
    if (action === "create") {
      if (!url) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try with captcha token first, then without if it fails
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hcaptchaToken) {
        headers["h-captcha-response"] = hcaptchaToken;
      }

      console.log("Creating transcription for URL:", url);

      const res = await fetch(`${BASE}/create-from-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url,
          max_duration: 7200,
          should_use_oxylabs_scraper: false,
        }),
      });

      const text = await res.text();
      console.log("Create response status:", res.status, "body:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: `API returned non-JSON: ${text.slice(0, 200)}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.error || data.message || `API error ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, ...data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Start transcription
    if (action === "transcribe") {
      if (!fileId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing fileId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Starting transcription for fileId:", fileId);

      const res = await fetch(`${BASE}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const text = await res.text();
      console.log("Transcribe response:", res.status, text);

      let data;
      try { data = JSON.parse(text); } catch { data = {}; }

      return new Response(
        JSON.stringify({ success: true, ...data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Check status
    if (action === "status") {
      if (!fileId) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing fileId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${BASE}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const text = await res.text();
      console.log("Status response:", res.status, text);

      let data;
      try { data = JSON.parse(text); } catch { data = { status: "error", error: text }; }

      return new Response(
        JSON.stringify({ success: true, ...data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Fetch transcript text from S3 URL
    if (action === "fetch-text") {
      if (!url) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing transcript URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(url);
      const text = await res.text();
      return new Response(
        JSON.stringify({ success: true, text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("facebook-transcript error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
