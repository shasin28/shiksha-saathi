const SUBJECT_HINTS = {
  math: [
    "Break the problem into smaller steps and solve one step at a time.",
    "Check units and the final value once after calculation."
  ],
  science: [
    "Use definition + real-life example + short summary in your answer.",
    "If it is a process, explain it in sequence (step 1, step 2, step 3)."
  ],
  english: [
    "Write in short sentences first, then improve grammar.",
    "For comprehension, answer using key words from the passage."
  ],
  hindi: [
    "पहले छोटा उत्तर लिखें, फिर मुख्य शब्द जोड़कर उसे बेहतर करें।",
    "परिभाषा और उदाहरण साथ में लिखने से उत्तर मजबूत होता है।"
  ],
  "social-science": [
    "Mention date/place/person where relevant, then explain impact.",
    "Use headings like Cause, Event, Result for better clarity."
  ]
};

function normalizeSubject(subject = "") {
  const key = String(subject).trim().toLowerCase();
  if (key.includes("social")) return "social-science";
  if (key.includes("math")) return "math";
  if (key.includes("science")) return "science";
  if (key.includes("english")) return "english";
  if (key.includes("hindi")) return "hindi";
  return "math";
}

export function generateTutorAnswer({ question, subject, grade, language = "en", bookTitle = "" }) {
  const normalizedSubject = normalizeSubject(subject);
  const hints = SUBJECT_HINTS[normalizedSubject] || SUBJECT_HINTS.math;
  const cleanQuestion = String(question || "").trim();

  const preface =
    language === "hi"
      ? `आपका प्रश्न (${bookTitle || "पुस्तक"}) से जुड़ा है: "${cleanQuestion}".`
      : `Your question from ${bookTitle || "the book"} is: "${cleanQuestion}".`;

  const explanation =
    language === "hi"
      ? `कक्षा ${grade} स्तर के लिए उत्तर रणनीति:`
      : `Answer strategy for class ${grade} level:`;

  const finalTip =
    language === "hi"
      ? "यदि चाहें तो मैं इसी प्रश्न का एक worked example भी दे सकता हूं।"
      : "If you want, I can also give a worked example for this same question.";

  return {
    answer: [preface, explanation, `1. ${hints[0]}`, `2. ${hints[1]}`, finalTip].join("\n"),
    model: "local-tutor-v1",
    confidence: 0.62
  };
}
