const conceptKeywords = {
  division: ["divide", "divided", "bhaag", "hissa", "quotient"],
  multiplication: ["multiply", "times", "guna", "product"],
  fractions: ["fraction", "half", "quarter", "aadha", "pauna"],
  decimals: ["decimal", "point", "dashamlav"],
  addition: ["add", "plus", "jod"],
  subtraction: ["subtract", "minus", "ghata"]
};

const languageHints = {
  en: ["the", "and", "is", "divide", "point"],
  hi: ["hai", "ko", "se", "aur", "bhaag", "guna"],
  mr: ["aahe", "aani", "bhag", "gunakar"]
};

export function evaluateTranscript({ transcript, concept, language = "en" }) {
  const text = String(transcript || "").toLowerCase().trim();
  const tokens = text.split(/\s+/).filter(Boolean);

  const keywords = conceptKeywords[concept] || [];
  const keywordHits = keywords.filter((kw) => text.includes(kw)).length;

  const hints = languageHints[language] || languageHints.en;
  const hintHits = hints.filter((h) => text.includes(h)).length;

  const contentScore = tokens.length ? Math.min(1, keywordHits / Math.max(1, keywords.length * 0.5)) : 0;
  const languageScore = tokens.length ? Math.min(1, hintHits / Math.max(1, hints.length * 0.4)) : 0;

  const correct = contentScore >= 0.45;

  return {
    transcript: text,
    contentScore: round(contentScore),
    languageScore: round(languageScore),
    inferredCorrect: correct,
    feedback: buildFeedback(concept, correct, languageScore)
  };
}

function buildFeedback(concept, correct, languageScore) {
  if (!correct) return `Ask learner to restate ${concept} steps slowly with one worked example.`;
  if (languageScore < 0.35) return "Good concept recall. Encourage response in local language for fluency.";
  return `Strong oral response on ${concept}. Move to next challenge item.`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
