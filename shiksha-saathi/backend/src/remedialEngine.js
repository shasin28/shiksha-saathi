function scoreConceptHealth(attemptSlice) {
  if (!attemptSlice.length) {
    return { accuracy: null, avgLatency: null, risk: "unknown" };
  }

  const correctCount = attemptSlice.filter((attempt) => toBool(attempt.correct)).length;
  const accuracy = correctCount / attemptSlice.length;
  const avgLatency =
    attemptSlice.reduce((sum, attempt) => sum + Number(attempt.latency_ms ?? attempt.latencyMs), 0) /
    attemptSlice.length;

  let risk = "low";
  if (accuracy < 0.5 || avgLatency > 12000) risk = "high";
  else if (accuracy < 0.75 || avgLatency > 9000) risk = "medium";

  return { accuracy, avgLatency, risk };
}

export function detectStudentGaps(studentId, attempts) {
  const studentAttempts = attempts.filter((attempt) => attempt.student_id === studentId || attempt.studentId === studentId);

  const byConcept = studentAttempts.reduce((acc, attempt) => {
    const concept = attempt.concept;
    if (!acc[concept]) acc[concept] = [];
    acc[concept].push(attempt);
    return acc;
  }, {});

  const gaps = Object.keys(byConcept)
    .map((concept) => {
      const metrics = scoreConceptHealth(byConcept[concept]);
      return {
        concept,
        ...metrics,
        recommendation: recommendationForRisk(concept, metrics.risk)
      };
    })
    .sort((a, b) => riskWeight(b.risk) - riskWeight(a.risk));

  return {
    studentId,
    totalAttempts: studentAttempts.length,
    gaps
  };
}

export function detectMisconceptions(attempts) {
  const conceptStats = attempts.reduce((acc, attempt) => {
    if (!acc[attempt.concept]) {
      acc[attempt.concept] = { total: 0, incorrect: 0, latency: 0 };
    }
    acc[attempt.concept].total += 1;
    if (!toBool(attempt.correct)) acc[attempt.concept].incorrect += 1;
    acc[attempt.concept].latency += Number(attempt.latency_ms ?? attempt.latencyMs);
    return acc;
  }, {});

  return Object.entries(conceptStats)
    .map(([concept, stat]) => {
      const errorRate = stat.incorrect / stat.total;
      const avgLatency = stat.latency / stat.total;
      return {
        concept,
        totalAttempts: stat.total,
        errorRate,
        avgLatency,
        severity: classSeverity(errorRate, avgLatency)
      };
    })
    .sort((a, b) => riskWeight(b.severity) - riskWeight(a.severity));
}

function classSeverity(errorRate, avgLatency) {
  if (errorRate >= 0.45 || avgLatency >= 12500) return "high";
  if (errorRate >= 0.25 || avgLatency >= 9500) return "medium";
  return "low";
}

function riskWeight(risk) {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  if (risk === "low") return 1;
  return 0;
}

function recommendationForRisk(concept, risk) {
  if (risk === "high") {
    return `Run 15-minute guided oral drills on ${concept} with peer explanation.`;
  }
  if (risk === "medium") {
    return `Assign 5 targeted voice prompts for ${concept} and review errors in class.`;
  }
  return `Keep ${concept} in weekly revision with 2 reinforcement questions.`;
}

function toBool(value) {
  return value === true || value === 1;
}
