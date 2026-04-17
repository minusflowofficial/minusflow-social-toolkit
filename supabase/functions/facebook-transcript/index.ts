// Evernote transcription proxy - 4-step flow with hCaptcha token from frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://public.evernote.com/transcription/v1";

const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://evernote.com",
  "Referer": "https://evernote.com/",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { action, url, hcaptchaToken, fileId } = await req.json();

    // Step 1: Create transcription job from URL
    if (action === "create") {
      if (!url) return json({ success: false, error: "Missing URL" }, 400);
      if (!hcaptchaToken) return json({ success: false, error: "Missing captcha token" }, 400);

      const res = await fetch(`${BASE}/create-from-url`, {
        method: "POST",
        headers: {
          ...browserHeaders,
          "Content-Type": "application/json",
          "h-captcha-response": hcaptchaToken,
        },
        body: JSON.stringify({
          url,
          max_duration: 7200,
          should_use_oxylabs_scraper: false,
        }),
      });

      const text = await res.text();
      console.log("Create:", res.status, text.slice(0, 300));

      let data: any;
      try { data = JSON.parse(text); } catch {
        return json({ success: false, error: "Invalid response from transcription service" }, 502);
      }

      if (!res.ok || data.status === "captchaError") {
        return json({
          success: false,
          error: data.status === "captchaError"
            ? "Captcha verification failed. Please solve the captcha again."
            : data.error || data.message || `Service error (${res.status})`,
        }, res.status === 200 ? 400 : res.status);
      }

      return json({ success: true, ...data });
    }

    // Step 2: Start transcription
    if (action === "transcribe") {
      if (!fileId) return json({ success: false, error: "Missing fileId" }, 400);

      const res = await fetch(`${BASE}/transcribe`, {
        method: "POST",
        headers: { ...browserHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const text = await res.text();
      console.log("Transcribe:", res.status, text.slice(0, 200));
      let data: any;
      try { data = JSON.parse(text); } catch { data = {}; }

      if (!res.ok) return json({ success: false, error: data.error || `Error ${res.status}` }, res.status);
      return json({ success: true, ...data });
    }

    // Step 3: Poll status
    if (action === "status") {
      if (!fileId) return json({ success: false, error: "Missing fileId" }, 400);

      const res = await fetch(`${BASE}/status`, {
        method: "POST",
        headers: { ...browserHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { status: "error", error: text }; }
      return json({ success: true, ...data });
    }

    // Step 4: Fetch final transcript text from S3 URL
    if (action === "fetch-text") {
      if (!url) return json({ success: false, error: "Missing transcript URL" }, 400);
      const res = await fetch(url);
      const text = await res.text();
      return json({ success: true, text });
    }

    return json({ success: false, error: "Invalid action" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("facebook-transcript error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
