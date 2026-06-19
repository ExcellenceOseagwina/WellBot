const knowledgeBase = require("./data/knowledgeBase.json");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "please",
  "the",
  "to",
  "what",
  "when",
  "where",
  "who",
  "with"
]);

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text = "") {
  return normalize(text)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
}

function unique(values) {
  return [...new Set(values)];
}

function tokenOverlapScore(questionTokens, entryTokens) {
  if (!questionTokens.length || !entryTokens.length) return 0;
  const entrySet = new Set(entryTokens);
  const matches = unique(questionTokens).filter((token) => entrySet.has(token));
  return matches.length / unique(questionTokens).length;
}

function keywordCoverageScore(questionTokens, keywords = []) {
  if (!keywords.length) return 0;
  const questionSet = new Set(questionTokens);
  const matched = keywords.filter((keyword) => questionSet.has(normalize(keyword)));
  return matched.length / keywords.length;
}

function phraseScore(normalizedQuestion, phrases = []) {
  if (!phrases.length) return 0;
  const matches = phrases.filter((phrase) => normalizedQuestion.includes(normalize(phrase)));
  return matches.length ? Math.min(1, matches.length / 2) : 0;
}

function sequenceSimilarityScore(aTokens, bTokens) {
  const aLength = aTokens.length;
  const bLength = bTokens.length;
  if (!aLength || !bLength) return 0;

  const table = Array.from({ length: aLength + 1 }, () => Array(bLength + 1).fill(0));

  for (let i = 1; i <= aLength; i += 1) {
    for (let j = 1; j <= bLength; j += 1) {
      table[i][j] =
        aTokens[i - 1] === bTokens[j - 1]
          ? table[i - 1][j - 1] + 1
          : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  return table[aLength][bLength] / Math.max(aLength, bLength);
}

function categoryScore(questionTokens, category = "") {
  const categoryTokens = tokenize(category);
  if (!categoryTokens.length) return 0;
  return tokenOverlapScore(questionTokens, categoryTokens);
}

function scoreEntry(question, entry) {
  const normalizedQuestion = normalize(question);
  const questionTokens = tokenize(question);
  const entryTokens = tokenize(`${entry.question} ${entry.category} ${(entry.keywords || []).join(" ")}`);

  const scores = {
    tokenOverlap: tokenOverlapScore(questionTokens, entryTokens),
    keywordCoverage: keywordCoverageScore(questionTokens, entry.keywords),
    phraseMatching: phraseScore(normalizedQuestion, entry.phrases),
    sequenceSimilarity: sequenceSimilarityScore(questionTokens, tokenize(entry.question)),
    categoryMatching: categoryScore(questionTokens, entry.category)
  };

  const confidence =
    scores.tokenOverlap * 0.28 +
    scores.keywordCoverage * 0.25 +
    scores.phraseMatching * 0.22 +
    scores.sequenceSimilarity * 0.15 +
    scores.categoryMatching * 0.1;

  return {
    ...entry,
    confidence: Number(confidence.toFixed(4)),
    scores
  };
}

function findBestAnswer(question) {
  const ranked = knowledgeBase
    .map((entry) => scoreEntry(question, entry))
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];
  const suggestions = ranked.slice(0, 4).map((entry) => ({
    id: entry.id,
    question: entry.question,
    category: entry.category,
    confidence: entry.confidence
  }));

  if (!best || best.confidence < 0.22) {
    return {
      answer:
        "I could not find a confident answer yet. Try one of the related questions below or contact the appropriate Wellspring University office for official help.",
      confidence: best ? best.confidence : 0,
      category: "unknown",
      matchedQuestion: null,
      suggestions,
      scores: best ? best.scores : {}
    };
  }

  return {
    answer: best.answer,
    confidence: best.confidence,
    category: best.category,
    matchedQuestion: best.question,
    suggestions,
    scores: best.scores
  };
}

module.exports = {
  findBestAnswer,
  normalize,
  tokenize
};
