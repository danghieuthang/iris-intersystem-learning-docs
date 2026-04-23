import {
  DATA_BASE,
  DOMAIN_NAMES,
  STORAGE_KEYS,
  addDays,
  deepClone,
  getSystemTheme,
  isCorrect,
  shuffleArray,
  toIsoDate,
} from './utils.js';

function parseStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function loadSettings() {
  return {
    theme: localStorage.getItem(STORAGE_KEYS.theme) || getSystemTheme(),
    shuffle: parseStoredJson(STORAGE_KEYS.shuffle, false),
  };
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function saveShuffle(enabled) {
  localStorage.setItem(STORAGE_KEYS.shuffle, JSON.stringify(enabled));
}

export async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);
  return response.json();
}

export async function loadQuizList() {
  return fetchJSON(`${DATA_BASE}index.json`);
}

function normalizeQuiz(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map((question, index) => ({
      ...question,
      _sourceKey: question._sourceKey || `${quiz.id}:${question.id ?? index + 1}:${index}`,
      _sourceQuizId: question._sourceQuizId || quiz.id,
      _sourceQuizTitle: question._sourceQuizTitle || quiz.title,
    })),
  };
}

async function loadAllQuizzes(quizList) {
  const quizzes = await Promise.all(quizList.map((quiz) => fetchJSON(`${DATA_BASE}${quiz.file}`)));
  return quizzes.map(normalizeQuiz);
}

export function shuffleQuiz(quiz) {
  const clonedQuiz = deepClone(quiz);
  clonedQuiz.questions = shuffleArray(clonedQuiz.questions).map((question) => ({
    ...question,
    options: shuffleArray(question.options),
  }));
  return clonedQuiz;
}

export async function loadQuiz(file, shuffleEnabled) {
  const quiz = normalizeQuiz(await fetchJSON(`${DATA_BASE}${file}`));
  return shuffleEnabled ? shuffleQuiz(quiz) : quiz;
}

export function getScores() {
  return parseStoredJson(STORAGE_KEYS.scores, {});
}

export function saveScore(id, score, total, domains) {
  const scores = getScores();
  const pct = Math.round((score / total) * 100);
  if (!scores[id] || score > scores[id].score) {
    scores[id] = {
      score,
      total,
      pct,
      date: new Date().toLocaleDateString(),
      domains: domains || {},
    };
    localStorage.setItem(STORAGE_KEYS.scores, JSON.stringify(scores));
  }
}

export function getDomainSummary() {
  const scores = getScores();
  const summary = {};

  Object.values(scores).forEach((score) => {
    if (!score.domains) return;

    Object.entries(score.domains).forEach(([domain, value]) => {
      const prefix = domain.split('.')[0];
      if (!summary[prefix]) {
        summary[prefix] = {
          correct: 0,
          total: 0,
          name: DOMAIN_NAMES[prefix] || prefix,
        };
      }

      summary[prefix].correct += value.correct;
      summary[prefix].total += value.total;
    });
  });

  return summary;
}

export function getMistakes() {
  return parseStoredJson(STORAGE_KEYS.mistakes, {});
}

export function getTopMistakes(limit = 5) {
  return Object.values(getMistakes())
    .filter((mistake) => mistake.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

export function recordMistake(key, data) {
  const mistakes = getMistakes();
  if (!mistakes[key]) mistakes[key] = { ...data, count: 0 };
  mistakes[key].count++;
  mistakes[key].lastSeen = new Date().toLocaleDateString();
  localStorage.setItem(STORAGE_KEYS.mistakes, JSON.stringify(mistakes));
}

export function getBookmarks() {
  return parseStoredJson(STORAGE_KEYS.bookmarks, {});
}

export function toggleBookmark(key, data) {
  const bookmarks = getBookmarks();
  if (bookmarks[key]) delete bookmarks[key];
  else bookmarks[key] = data;
  localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks));
}

export function buildBookmarkQuiz() {
  const bookmarks = getBookmarks();
  const questions = Object.values(bookmarks).map((bookmark) => bookmark.question);

  if (questions.length === 0) return null;

  return normalizeQuiz({
    id: 'bookmarks',
    topic: 'bookmarks',
    topicLabel: 'Bookmarks',
    file: null,
    title: `Bookmarked — ${questions.length} Questions`,
    difficulty: 'Mixed',
    examDomains: [...new Set(questions.map((question) => question.domain.split('.')[0]))],
    questions: deepClone(questions),
  });
}

export function gradeQuiz(quiz, selections) {
  const totalQ = quiz.questions.length;
  let correct = 0;

  quiz.questions.forEach((question, index) => {
    if (isCorrect(question, selections[index])) correct++;
  });

  const pct = Math.round((correct / totalQ) * 100);
  const pass = pct >= 65;
  const domains = {};

  quiz.questions.forEach((question, index) => {
    if (!domains[question.domain]) domains[question.domain] = { correct: 0, total: 0 };
    domains[question.domain].total++;
    if (isCorrect(question, selections[index])) domains[question.domain].correct++;
  });

  const reviewItems = quiz.questions.map((question, index) => {
    const ok = isCorrect(question, selections[index]);
    const userSelection = selections[index];
    const formatAnswer = (ids) => ids.map((id) => {
      const option = question.options.find((item) => item.id === id);
      return option ? `${id}) ${option.text}` : id;
    }).join(', ');

    return {
      index,
      ok,
      question,
      shortQuestion: question.question.length > 110 ? `${question.question.slice(0, 107)}…` : question.question,
      userAnswer: userSelection.length ? formatAnswer(userSelection) : '(no answer)',
      correctAnswer: formatAnswer(question.answer),
    };
  });

  return {
    totalQ,
    correct,
    pct,
    pass,
    domains,
    reviewItems,
    wrongCount: totalQ - correct,
  };
}

export function buildWrongAnswersQuiz(quiz, selections) {
  const wrongQuestions = quiz.questions.filter((question, index) => !isCorrect(question, selections[index]));
  if (wrongQuestions.length === 0) return null;

  return normalizeQuiz({
    ...deepClone(quiz),
    id: `${quiz.id}-retry`,
    title: `${quiz.title} — Wrong Answers`,
    questions: deepClone(wrongQuestions),
  });
}

export async function createMockExam(quizList, count, shuffleEnabled) {
  const quizzes = await loadAllQuizzes(quizList);
  const pool = shuffleArray(quizzes.flatMap((quiz) => quiz.questions.map((question) => deepClone(question))));
  const selected = pool.slice(0, Math.min(count, pool.length));
  const questions = shuffleEnabled
    ? selected.map((question) => ({ ...question, options: shuffleArray(question.options) }))
    : selected;

  return normalizeQuiz({
    id: 'mock-exam',
    topic: 'mock',
    topicLabel: 'Mock Exam',
    title: `Mock Exam — ${questions.length} Questions`,
    difficulty: 'Mixed',
    examDomains: ['T1', 'T2', 'T3', 'T4'],
    questions: questions.map((question, index) => ({
      ...question,
      _origId: question.id,
      id: index + 1,
    })),
  });
}

export function getWeakDomains(limit = 3) {
  return Object.entries(getDomainSummary())
    .filter(([, value]) => value.total > 0)
    .map(([domain, value]) => ({
      domain,
      name: value.name,
      correct: value.correct,
      total: value.total,
      pct: Math.round((value.correct / value.total) * 100),
    }))
    .sort((left, right) => left.pct - right.pct || right.total - left.total)
    .slice(0, limit);
}

export function getReviewItems() {
  return parseStoredJson(STORAGE_KEYS.reviewItems, {});
}

export function updateReviewItem(question, wasCorrect, quizTitle) {
  const items = getReviewItems();
  const today = toIsoDate();
  const key = question._sourceKey || `${quizTitle}:${question.domain}:${question.question}`;
  if (wasCorrect && !items[key]) return;
  const current = items[key] || {
    sourceKey: key,
    quizId: question._sourceQuizId || null,
    quizTitle: question._sourceQuizTitle || quizTitle,
    question: deepClone(question),
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    intervalDays: 0,
    dueAt: today,
  };

  current.quizTitle = question._sourceQuizTitle || quizTitle;
  current.question = deepClone(question);
  current.lastReviewedAt = today;

  if (wasCorrect) {
    current.correctCount++;
    current.correctStreak = (current.correctStreak || 0) + 1;
    const intervals = [1, 3, 7, 14, 30];
    current.intervalDays = intervals[Math.min(current.correctStreak - 1, intervals.length - 1)];
    current.dueAt = addDays(today, current.intervalDays);
    current.lastResult = 'correct';
  } else {
    current.wrongCount++;
    current.correctStreak = 0;
    current.intervalDays = 0;
    current.dueAt = today;
    current.lastResult = 'wrong';
  }

  items[key] = current;
  localStorage.setItem(STORAGE_KEYS.reviewItems, JSON.stringify(items));
}

export function getDueReviewItems() {
  const today = toIsoDate();
  return Object.values(getReviewItems())
    .filter((item) => item.dueAt <= today)
    .sort((left, right) => {
      if (left.dueAt !== right.dueAt) return left.dueAt.localeCompare(right.dueAt);
      return (right.wrongCount || 0) - (left.wrongCount || 0);
    });
}

export function buildDueReviewQuiz() {
  const dueItems = getDueReviewItems();
  if (dueItems.length === 0) return null;

  return normalizeQuiz({
    id: 'due-review',
    topic: 'review',
    topicLabel: 'Due Review',
    file: null,
    title: `Due for Review — ${dueItems.length} Questions`,
    difficulty: 'Adaptive',
    examDomains: [...new Set(dueItems.map((item) => item.question.domain.split('.')[0]))],
    questions: dueItems.map((item) => deepClone(item.question)),
  });
}

export async function buildMistakesQuiz(quizList) {
  const mistakes = Object.values(getMistakes())
    .filter((mistake) => mistake.count > 0)
    .sort((left, right) => right.count - left.count);

  if (mistakes.length === 0) return null;

  const quizzes = await loadAllQuizzes(quizList);
  const allQuestions = quizzes.flatMap((quiz) => quiz.questions);
  const seen = new Set();
  const questions = [];

  mistakes.forEach((mistake) => {
    let question = mistake.questionData;

    if (!question) {
      question = allQuestions.find((candidate) =>
        candidate.question === mistake.question &&
        candidate.domain === mistake.domain &&
        (!mistake.quizTitle || candidate._sourceQuizTitle === mistake.quizTitle));
    }

    if (!question || seen.has(question._sourceKey)) return;
    seen.add(question._sourceKey);
    questions.push(deepClone(question));
  });

  if (questions.length === 0) return null;

  return normalizeQuiz({
    id: 'mistakes-review',
    topic: 'review',
    topicLabel: 'Mistakes',
    file: null,
    title: `Review Mistakes — ${questions.length} Questions`,
    difficulty: 'Adaptive',
    examDomains: [...new Set(questions.map((question) => question.domain.split('.')[0]))],
    questions,
  });
}

export async function createDomainPracticeQuiz(quizList, domainPrefix, count = 12, shuffleEnabled = true) {
  const quizzes = await loadAllQuizzes(quizList);
  const pool = quizzes
    .flatMap((quiz) => quiz.questions)
    .filter((question) => question.domain.startsWith(domainPrefix));

  if (pool.length === 0) return null;

  const selected = shuffleArray(pool).slice(0, Math.min(count, pool.length));
  const questions = shuffleEnabled
    ? selected.map((question) => ({ ...deepClone(question), options: shuffleArray(question.options) }))
    : selected.map((question) => deepClone(question));

  return normalizeQuiz({
    id: `domain-practice-${domainPrefix.toLowerCase()}`,
    topic: 'practice',
    topicLabel: `${domainPrefix} Practice`,
    file: null,
    title: `${domainPrefix} Practice — ${questions.length} Questions`,
    difficulty: 'Adaptive',
    examDomains: [domainPrefix],
    questions,
  });
}

export function getResumeSession() {
  return parseStoredJson(STORAGE_KEYS.session, null);
}

export function saveResumeSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

export function clearResumeSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}
