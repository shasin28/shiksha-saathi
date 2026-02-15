const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function extractText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text.trim();
  }

  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const chunks = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function generateAiTutorAnswer({ question, subject, grade, language = "en", bookTitle = "" }) {
  if (!OPENAI_API_KEY) return null;

  const systemPrompt =
    language === "hi"
      ? "आप कक्षा आधारित AI ट्यूटर हैं। उत्तर सरल, चरणबद्ध और विद्यार्थी-हितैषी दें।"
      : "You are a grade-level AI tutor. Give clear, step-by-step, student-friendly answers.";

  const userPrompt =
    language === "hi"
      ? `कक्षा: ${grade}\nविषय: ${subject}\nपुस्तक: ${bookTitle}\nप्रश्न: ${question}\nउत्तर हिंदी में दें, अंत में 2 practice questions भी दें।`
      : `Grade: ${grade}\nSubject: ${subject}\nBook: ${bookTitle}\nQuestion: ${question}\nAnswer in simple English and add 2 short practice questions at the end.`;

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_output_tokens: 500,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = extractText(data);
    if (!text) return null;

    return {
      answer: text,
      model: OPENAI_MODEL,
      confidence: 0.86,
      provider: "openai"
    };
  } catch {
    return null;
  }
}
