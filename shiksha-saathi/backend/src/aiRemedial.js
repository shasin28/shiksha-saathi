const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function cleanLevel(level) {
  const value = String(level || "").toLowerCase();
  if (["advanced", "proficient", "developing", "needs_support"].includes(value)) return value;
  return "developing";
}

function normalizeRating(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function generateAiRemedialFeedback({
  transcript,
  concept,
  language,
  grade = null,
  latencyMs,
  heuristic
}) {
  if (!OPENAI_API_KEY) return null;

  const system =
    language === "hi"
      ? "आप एक शिक्षा मूल्यांकन सहायक हैं। छात्र के उत्तर का निष्पक्ष मूल्यांकन करें। केवल JSON लौटाएं।"
      : "You are an educational assessment assistant. Evaluate a student's answer objectively. Return JSON only.";

  const user =
    language === "hi"
      ? `concept=${concept}
grade=${grade ?? "unknown"}
latencyMs=${latencyMs}
transcript=${transcript}
heuristicContentScore=${heuristic.contentScore}
heuristicLanguageScore=${heuristic.languageScore}

JSON schema:
{"rating":0-100,"mastery":"advanced|proficient|developing|needs_support","guidance":"string","prepPlan":["string","string","string"]}`
      : `concept=${concept}
grade=${grade ?? "unknown"}
latencyMs=${latencyMs}
transcript=${transcript}
heuristicContentScore=${heuristic.contentScore}
heuristicLanguageScore=${heuristic.languageScore}

JSON schema:
{"rating":0-100,"mastery":"advanced|proficient|developing|needs_support","guidance":"string","prepPlan":["string","string","string"]}`;

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        max_output_tokens: 280,
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const outputText = data?.output_text || "";
    const parsed = parseJsonFromText(outputText);
    if (!parsed) return null;

    return {
      provider: "openai",
      model: OPENAI_MODEL,
      rating: normalizeRating(parsed.rating),
      mastery: cleanLevel(parsed.mastery),
      guidance: String(parsed.guidance || "").trim() || "Revise concept with worked example and retry.",
      prepPlan: Array.isArray(parsed.prepPlan) ? parsed.prepPlan.slice(0, 3).map(String) : []
    };
  } catch {
    return null;
  }
}

export function generateFallbackRemedialFeedback({ concept, language, heuristic, latencyMs }) {
  const baseScore = Math.round((heuristic.contentScore * 0.75 + heuristic.languageScore * 0.25) * 100);
  const latencyPenalty = latencyMs > 12000 ? 10 : latencyMs > 9000 ? 5 : 0;
  const rating = Math.max(0, Math.min(100, baseScore - latencyPenalty));

  let mastery = "developing";
  if (rating >= 80) mastery = "proficient";
  if (rating >= 92) mastery = "advanced";
  if (rating < 45) mastery = "needs_support";

  const guidanceHi = `अगले 2 दिन ${concept} के छोटे-छोटे सवाल बोलकर हल करें, फिर एक उदाहरण लिखकर समझाएँ।`;
  const guidanceEn = `For next 2 days, practice short ${concept} voice answers, then explain one solved example aloud.`;

  return {
    provider: "heuristic",
    model: "fallback-remedial-v1",
    rating,
    mastery,
    guidance: language === "hi" ? guidanceHi : guidanceEn,
    prepPlan:
      language === "hi"
        ? [
            `${concept} के 5 बेसिक प्रश्न`,
            "1 worked example बोलकर समझाना",
            "गलती वाली जगह दोहराना"
          ]
        : [
            `Practice 5 basic ${concept} prompts`,
            "Explain 1 worked example verbally",
            "Repeat the step where error happened"
          ]
  };
}
