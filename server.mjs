// server.mjs — Dora Phrasal Verb App on Render
import express from "express";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve /public with inline PDFs
app.use(
  express.static("public", {
    setHeaders: (res, path) => {
      if (path.toLowerCase().endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("X-Content-Type-Options", "nosniff");
      }
    },
  })
);

// ---- Health ----
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ---- OpenAI client ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---- /api/analyze ----
app.post("/api/analyze", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res
        .status(400)
        .json({ error: "Invalid message format. Expected array." });
    }

    // Step 1: English explanation for phrasal verbs
    const englishResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are an expert English teacher specializing in phrasal verbs for IELTS students.
Student is Dora.

When Dora asks about a phrasal verb (e.g., "give up", "run into", "put off"), respond with:

1) **Meaning**: Clear, simple English.
2) **Examples**: 2–3 sentences (at least one IELTS-style).
3) **Common Mistakes**: Typical confusions/incorrect usages.
4) **Mini Practice**: Ask Dora a short follow-up question using the verb.

Be warm, encouraging, and concise. Do NOT mention reading passages/paragraphs.
`.trim(),
        },
        { role: "user", content: messages },
      ],
    });

    const english = englishResponse.choices[0]?.message?.content?.trim() || "";

    // Step 2: Simplified Chinese translation
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "你是一名专业英语教师助理。请将以下英文内容完整翻译为简体中文。保持段落结构，不省略，不解释，只翻译。",
        },
        { role: "user", content: english },
      ],
    });

    const translated =
      translationResponse.choices[0]?.message?.content?.trim() || "";

    res.status(200).json({ response: english, translated });
  } catch (err) {
    console.error("GPT API error:", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
});

// ---- /api/speak ----
app.post("/api/speak", async (req, res) => {
  try {
    const text = (req.body?.text || "").toString();
    const voiceId = "E2iXioKRyjSqJA8tUYsv"; // your ElevenLabs voice
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    if (!text || !elevenKey) {
      return res
        .status(400)
        .json({ error: "Missing text or ELEVENLABS_API_KEY." });
    }

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.6, similarity_boost: 0.9, style: "narration" },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("🛑 ElevenLabs error:", errText);
      return res.status(500).json({ error: "TTS error", detail: errText });
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    res.status(200).json({ audioBase64, didStreamUrl: null });
  } catch (err) {
    console.error("TTS server error:", err);
    res.status(500).json({ error: "TTS Server Error", detail: err.message });
  }
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Dora app running on http://localhost:${PORT}`);
});
