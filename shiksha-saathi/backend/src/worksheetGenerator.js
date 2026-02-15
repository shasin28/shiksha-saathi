export function generateWorksheet({ grade, misconceptionMap, language = "en" }) {
  const selected = misconceptionMap.filter((item) => item.severity !== "low").slice(0, 3);

  const exercises = selected.map((topic, index) => ({
    id: `q${index + 1}`,
    concept: topic.concept,
    difficulty: topic.severity === "high" ? "foundational" : "practice",
    prompt: localizePrompt(topic.concept, language),
    expectedSkill: `Improve ${topic.concept} fluency`
  }));

  return {
    title: `Grade ${grade} Remedial Worksheet`,
    language,
    generatedAt: new Date().toISOString(),
    exercises,
    teacherNote:
      "Use think-aloud strategy and ask at least two students to explain reasoning verbally."
  };
}

function localizePrompt(concept, language) {
  const templates = {
    en: {
      division: "Solve 24 divided by 6 and explain each step aloud.",
      multiplication: "Find 7 multiplied by 8 and say how you grouped numbers.",
      fractions: "Which is bigger: 3/4 or 2/3? Explain with an example.",
      decimals: "Order 0.45, 0.5, and 0.405 from smallest to largest.",
      default: `Answer two oral questions on ${concept} and explain why.`
    },
    hi: {
      division: "24 ko 6 se bhaag karo aur har kadam zor se batao.",
      multiplication: "7 guna 8 nikalo aur batao tumne kaise socha.",
      fractions: "3/4 aur 2/3 me bada kaun hai? Udaharan ke saath batao.",
      decimals: "0.45, 0.5 aur 0.405 ko chhote se bade kram me rakho.",
      default: `${concept} par do mukhik prashn karo aur karan batao.`
    }
  };

  const dict = templates[language] || templates.en;
  return dict[concept] || dict.default;
}
