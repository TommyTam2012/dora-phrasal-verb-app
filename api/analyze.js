import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid message format. Expected an array of text/image_url messages.",
      });
    }

    console.log("📤 GPT Payload:", JSON.stringify(messages, null, 2));

    // ================================================================
    // Step 1: Generate English phrasal verb explanation
    // ================================================================
    const englishResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are an expert English teacher specializing in *phrasal verbs* for IELTS students. 
Your student is Dora, an intermediate learner preparing for the IELTS exam.

When Dora asks about a phrasal verb (e.g., “give up”, “run into”, “put off”), follow this exact structure:

1. **Meaning:** Give a clear, simple explanation in natural English.
2. **Examples:** Provide 2–3 sample sentences, including at least one IELTS-style sentence.
3. **Common Mistakes:** Explain any typical confusions or incorrect usages.
4. **Mini Practice:** Ask Dora a short follow-up question that uses the phrasal verb in context.

Tone: warm, encouraging, and clear. 
Do NOT mention IELTS Reading passages or paragraph locations. 
Focus only on phrasal verb understanding and application.
          `.trim(),
        },
        {
          role: "user",
          content: messages,
        },
      ],
    });

    const english = englishResponse.choices[0]?.message?.content?.trim() || "";

    // ================================================================
    // Step 2: Translate response into Simplified Chinese for support
    // ================================================================
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "你是一名专业英语教师助理。请将以下英文内容完整翻译为简体中文。保持段落结构，不省略，不解释，只翻译。",
        },
        {
          role: "user",
          content: english,
        },
      ],
    });

    const translated = translationResponse.choices[0]?.message?.content?.trim() || "";

    // ================================================================
    // Step 3: Return combined bilingual response
    // ================================================================
    return res.status(200).json({
      response: english,
      translated,
    });

  } catch (error) {
    console.error("GPT API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      detail: error.message || "Unknown GPT error",
    });
  }
}

