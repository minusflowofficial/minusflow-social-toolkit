// Universal video transcription - no captcha required
// YouTube: kome.ai API | Others: download audio + Lovable AI Gemini STT

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Detect platform from URL
function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "facebook";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  return "other";
}

// YouTube transcript via kome.ai (instant, free)
async function youtubeTranscript(url: string) {
  const res = await fetch("https://kome.ai/api/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: url, format: true }),
  });
  const data = await res.json();
  if (!data.transcript || data.transcript.includes("aren't available")) {
    throw new Error("No transcript available for this YouTube video. Try a video with captions enabled.");
  }
  return { text: data.transcript, title: "YouTube Video" };
}

// Get direct media URL from our existing downloader endpoints
async function getMediaUrl(platform: string, url: string, supabaseUrl: string): Promise<{ media: string; title: string }> {
  let endpoint = "";
  let body: Record<string, unknown> = {};

  if (platform === "facebook") {
    endpoint = `${supabaseUrl}/functions/v1/facebook-download`;
    body = { url };
  } else if (platform === "tiktok") {
    endpoint = `${supabaseUrl}/functions/v1/tiktok-download`;
    body = { url };
  } else if (platform === "instagram") {
    endpoint = `${supabaseUrl}/functions/v1/instagram-download`;
    body = { url };
  } else {
    throw new Error("Unsupported platform. Supported: YouTube, Facebook, TikTok, Instagram");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Try common shapes
  const media =
    data.video_url ||
    data.url ||
    data.downloadUrl ||
    data.media?.[0]?.url ||
    data.formats?.[0]?.url ||
    data.data?.[0]?.url ||
    data.links?.[0]?.url;

  if (!media) {
    console.error("No media URL found in response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Could not extract media from video. Try a different URL.");
  }

  return { media, title: data.title || data.caption || `${platform} Video` };
}

// Transcribe audio via Lovable AI Gemini
async function transcribeWithGemini(mediaUrl: string): Promise<string> {
  // Download the media (limit ~20MB for safety)
  console.log("Fetching media:", mediaUrl.slice(0, 100));
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) throw new Error(`Failed to fetch media: ${mediaRes.status}`);

  const contentLength = parseInt(mediaRes.headers.get("content-length") || "0");
  if (contentLength > 25 * 1024 * 1024) {
    throw new Error("Video too large (max 25MB). Try a shorter clip.");
  }

  const buf = new Uint8Array(await mediaRes.arrayBuffer());
  const contentType = mediaRes.headers.get("content-type") || "video/mp4";
  console.log(`Downloaded ${buf.byteLength} bytes, type: ${contentType}`);

  // Base64 encode in chunks to avoid stack overflow
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  const b64 = btoa(binary);
  const mimeType = contentType.startsWith("audio/") ? contentType : "video/mp4";
  const dataUrl = `data:${mimeType};base64,${b64}`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe the spoken content of this video word-for-word. Output ONLY the transcript text in clean readable paragraphs. Do not add commentary, headers, or descriptions of sounds. If there is no speech, return: [No spoken content detected]" },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (aiRes.status === 429) throw new Error("Rate limit reached. Please try again in a minute.");
  if (aiRes.status === 402) throw new Error("AI credits exhausted. Please contact support.");
  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error("AI error:", errText);
    throw new Error("Transcription service error. Please try again.");
  }

  const aiData = await aiRes.json();
  const transcript = aiData.choices?.[0]?.message?.content?.trim();
  if (!transcript) throw new Error("Empty transcript returned");
  return transcript;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ success: false, error: "Please provide a valid video URL" }, 400);
    }

    const platform = detectPlatform(url);
    console.log(`Transcribing ${platform}: ${url}`);

    // YouTube: instant kome.ai path
    if (platform === "youtube") {
      const { text, title } = await youtubeTranscript(url);
      return json({ success: true, transcript: text, title, platform });
    }

    // Other platforms: extract media + transcribe with AI
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const { media, title } = await getMediaUrl(platform, url, supabaseUrl);
    const transcript = await transcribeWithGemini(media);

    return json({ success: true, transcript, title, platform });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    console.error("transcript error:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
