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

const TERM_ALIASES = {
  accomodation: "accommodation",
  accomodate: "accommodation",
  accomodating: "accommodation",
  apply: "admission",
  applying: "admission",
  hostel: "accommodation",
  hostels: "accommodation",
  log: "login",
  sign: "login",
  signin: "login",
  "sign-in": "login",
  "log-in": "login",
  username: "login",
  deadline: "date",
  deadlines: "date",
  tuition: "fees",
  payments: "payment",
  pay: "payment",
  paid: "payment",
  receipt: "receipts",
  results: "result",
  grades: "result",
  scores: "result",
  verification: "verify",
  verified: "verify",
  lectures: "lecture",
  lecturer: "lecture",
  lecturers: "lecture",
  classes: "lecture",
  class: "lecture",
  subjects: "course",
  courses: "course",
  register: "registration",
  registering: "registration",
  registered: "registration",
  prerequisites: "prerequisite",
  prerequisite: "prerequisite",
  carryovers: "carryover",
  transcript: "records",
  transcripts: "records",
  certificate: "records",
  certificates: "records",
  cgpa: "gpa",
  doctor: "clinic",
  nurse: "clinic",
  sickbay: "clinic",
  centre: "center",
  hospital: "clinic",
  wifi: "internet",
  "wi-fi": "internet",
  elearning: "online",
  "e-learning": "online",
  assignments: "assignment",
  jamb: "admission",
  utme: "admission",
  postutme: "admission",
  "post-utme": "admission",
  languages: "language",
  programme: "program",
  programmes: "program",
  programs: "program",
  department: "school",
  departments: "school",
  faculty: "school",
  faculties: "school",
  adviser: "advisor",
  advisors: "advisor",
  hod: "head",
  id: "identity",
  timetable: "schedule",
  instalment: "installment",
  instalments: "installment",
  installments: "installment",
  accommodations: "accommodation",
  rooms: "room",
  organizations: "organization",
  organisations: "organization"
};

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/can't/g, "cannot")
    .replace(/won't/g, "will not")
    .replace(/n't/g, " not")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text = "") {
  return normalize(text)
    .split(" ")
    .map((token) => TERM_ALIASES[token] || token)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function unique(values) {
  return [...new Set(values)];
}

function includesAny(tokens, values) {
  return values.some((value) => tokens.includes(value));
}

function conversationalResponse(question) {
  const normalizedQuestion = normalize(question);
  const tokens = tokenize(question);
  const tokenSet = new Set(tokens);
  const compact = normalizedQuestion.replace(/\s/g, "");

  if (!normalizedQuestion) return null;

  const greetingPhrases = [
    "good morning",
    "good afternoon",
    "good evening",
    "good day",
    "greetings",
    "hello",
    "hi",
    "hey",
    "how far"
  ];

  if (
    greetingPhrases.includes(normalizedQuestion) ||
    greetingPhrases.some((phrase) => normalizedQuestion.startsWith(`${phrase} `)) ||
    ["hi", "hello", "hey", "yo"].includes(compact)
  ) {
    return {
      answer:
        "Hello! I am here to help with Wellspring University questions. You can ask about admissions, fees, login help, course registration, transcripts, accommodation, or student support.",
      category: "salutation",
      matchedQuestion: "Greeting"
    };
  }

  if (
    normalizedQuestion.includes("how are you") ||
    normalizedQuestion.includes("how do you do") ||
    normalizedQuestion.includes("how is it going")
  ) {
    return {
      answer:
        "I am doing well and ready to help. What would you like to know about Wellspring University?",
      category: "salutation",
      matchedQuestion: "How are you?"
    };
  }

  if (
    normalizedQuestion.includes("thank you") ||
    normalizedQuestion.includes("thanks") ||
    normalizedQuestion.includes("appreciate")
  ) {
    return {
      answer: "You are welcome. Ask me another Wellspring University question whenever you are ready.",
      category: "courtesy",
      matchedQuestion: "Thanks"
    };
  }

  if (includesAny(tokens, ["bye", "goodbye"]) || normalizedQuestion.includes("see you")) {
    return {
      answer: "Goodbye. I will be here whenever you need student support.",
      category: "farewell",
      matchedQuestion: "Goodbye"
    };
  }

  if (
    normalizedQuestion.includes("who are you") ||
    normalizedQuestion.includes("what can you do") ||
    normalizedQuestion.includes("help me") ||
    normalizedQuestion.includes("your name")
  ) {
    return {
      answer:
        "I am the Wellspring University Student Assistant. I can answer student questions in English about admissions, login issues, password reset, fees, course registration, transcripts, accommodation, and support offices.",
      category: "assistant help",
      matchedQuestion: "Assistant help"
    };
  }

  if (
    normalizedQuestion.includes("speak english") ||
    normalizedQuestion.includes("understand english") ||
    normalizedQuestion.includes("english language") ||
    normalizedQuestion.includes("human language") ||
    normalizedQuestion.includes("human languages") ||
    normalizedQuestion.includes("natural language") ||
    normalizedQuestion.includes("normal english") ||
    compact.includes("understandlanguage") ||
    compact.includes("understandhumanlanguage") ||
    compact.includes("understandlanguages") ||
    (tokenSet.has("understand") && tokenSet.has("language"))
  ) {
    return {
      answer:
        "Yes. You can chat with me in natural English, including greetings and everyday student questions. I can help with Wellspring University topics such as admissions, fees, portal login, course registration, transcripts, accommodation, exams, library, ICT, and student support.",
      category: "language",
      matchedQuestion: "Human language support"
    };
  }

  return null;
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
  const matched = keywords.filter((keyword) => tokenize(keyword).some((token) => questionSet.has(token)));
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
  const entryTokens = tokenize(
    `${entry.question} ${entry.category} ${entry.answer} ${(entry.keywords || []).join(" ")} ${(entry.phrases || []).join(" ")}`
  );

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
  const conversational = conversationalResponse(question);

  if (conversational) {
    return {
      ...conversational,
      confidence: 1,
      suggestions: [],
      scores: {
        conversational: 1
      }
    };
  }

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
  tokenize,
  conversationalResponse
};
