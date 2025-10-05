// ================================================================
// Dora’s Phrasal Verb Practice — speak.js
// Converts GPT text into spoken voice using ElevenLabs TTS
// ================================================================

export default async function handler(req, res) {
  let text = "";

  if (req.method === "POST") {
    let body = "";
    await new Promise((resolve, reject) => {
      req.on("data", chunk => (body += chunk));
      req.on("end", () => resolve());
      req.on("error", err => reject(err));
    });
    const data = JSON.parse(body);
    text = data.text;
  }

  // 🗣️ British female voice (adjust if you prefer Dora’s tone)
  const voiceId = "E2iXioKRyjSqJA8tUYsv"; // your ElevenLabs voice ID
  const elevenKey = process.env.ELEVENLABS_API_KEY;

  if (!text || !elevenKey) {
    return res.status(400).json({ error: "Missing text or ElevenLabs API key." });
  }

  try {
    // ================================================================
    // Step 1: Send text to ElevenLabs for voice generation
    // ================================================================
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.9,
          style: "narration",
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("🛑 ElevenLabs error:", errText);
      return res.status(500).json({ error: "TTS error", detail: errText });
    }

    // ================================================================
    // Step 2: Convert audio to base64 and return
    // ================================================================
    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    res.status(200).json({
      audioBase64,
      didStreamUrl: null, // no avatar streaming for this demo
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return res.status(500).json({
      error: "TTS Server Error",
      detail: err.message,
    });
  }
}

