const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      if (!url || !hcaptchaToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing URL or captcha token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(`${BASE}/create-from-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "h-captcha-response": hcaptchaToken,
        },
        body: JSON.stringify({
          url,
          max_duration: 7200,
          should_use_oxylabs_scraper: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.error || data.message || "Failed to create transcription" }),
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

      const res = await fetch(`${BASE}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const data = await res.json();
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

      const data = await res.json();
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
