import { createInitialState, restoreQuizSession, setActiveQuiz, setScreen } from './state.js';
import {
  applyTheme,
  buildDueReviewQuiz,
  buildMistakesQuiz,
  buildBookmarkQuiz,
  buildWrongAnswersQuiz,
  clearResumeSession,
  createDomainPracticeQuiz,
  createMockExam,
  getBookmarks,
  getDomainSummary,
  getDueReviewItems,
  getResumeSession,
  getScores,
  getTopMistakes,
  getWeakDomains,
  gradeQuiz,
  loadQuiz,
  loadQuizList,
  loadSettings,
  recordMistake,
  saveScore,
  saveResumeSession,
  saveShuffle,
  toggleBookmark,
  updateReviewItem,
} from './quiz-service.js';
import {
  hydrateCodeBlocks,
  renderErrorPage,
  renderFullReview,
  renderHome,
  renderLoadingPage,
  renderQuiz,
  renderResults,
} from './views.js';
import { formatTime, isCorrect } from './utils.js';

const root = document.getElementById('app');
const state = createInitialState(loadSettings());

function persistSession() {
  if (state.screen !== 'quiz' || !state.quiz) return;

  saveResumeSession({
    quiz: state.quiz,
    qIdx: state.qIdx,
    selections: state.selections,
    checked: state.checked,
    timerSecs: state.timerSecs,
    savedAt: new Date().toISOString(),
  });
}

function stopTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

function startTimer() {
  stopTimer();
  state.timerHandle = setInterval(() => {
    state.timerSecs++;
    const display = document.getElementById('timer-display');
    if (display) display.textContent = formatTime(state.timerSecs);
    persistSession();
  }, 1000);
}

function render() {
  if (state.screen === 'home') {
    root.innerHTML = renderHome(state, {
      scores: getScores(),
      domainSummary: getDomainSummary(),
      topMistakes: getTopMistakes(),
      mistakesCount: getTopMistakes(9999).length,
      bookmarksCount: Object.keys(getBookmarks()).length,
      dueReviewCount: getDueReviewItems().length,
      weakDomains: getWeakDomains(),
      resumeSession: getResumeSession(),
    });
    return;
  }

  if (state.screen === 'quiz') {
    root.innerHTML = renderQuiz(state, getBookmarks());
    hydrateCodeBlocks(root, state.quiz.questions);
    persistSession();
    return;
  }

  if (state.screen === 'results') {
    root.innerHTML = renderResults(state);
    return;
  }

  if (state.screen === 'review') {
    root.innerHTML = renderFullReview(state);
    hydrateCodeBlocks(root, state.quiz.questions);
    return;
  }

  if (state.screen === 'error') {
    root.innerHTML = renderErrorPage({
      title: state.error.title,
      subtitle: state.error.subtitle,
      message: state.error.message,
      theme: state.settings.theme,
      backAction: state.error.backAction,
      backLabel: state.error.backLabel,
    });
  }
}

async function showHome() {
  stopTimer();
  setScreen(state, 'loading');
  root.innerHTML = renderLoadingPage({
    title: '🧠 IRIS Quiz',
    subtitle: 'InterSystems IRIS Development Professional',
    message: 'Loading quizzes…',
    theme: state.settings.theme,
  });

  try {
    state.quizList = await loadQuizList();
    setScreen(state, 'home');
    render();
  } catch (error) {
    const corsHint = location.protocol === 'file:'
      ? ' Open via a local server or GitHub Pages instead of file://.'
      : '';
    state.error = {
      title: '🧠 IRIS Quiz',
      subtitle: '',
      message: `Failed to load quiz list: ${error.message}.${corsHint}`,
      backAction: 'show-home',
      backLabel: 'Reload',
    };
    setScreen(state, 'error');
    render();
  }
}

async function startQuiz(file) {
  setScreen(state, 'loading');
  root.innerHTML = renderLoadingPage({
    title: '🧠 IRIS Quiz',
    message: 'Loading quiz…',
    theme: state.settings.theme,
  });

  try {
    const quiz = await loadQuiz(file, state.settings.shuffle);
    setActiveQuiz(state, quiz);
    setScreen(state, 'quiz');
    render();
    startTimer();
  } catch (error) {
    state.error = {
      title: '🧠 IRIS Quiz',
      subtitle: '',
      message: `Failed to load quiz: ${error.message}`,
      backAction: 'show-home',
      backLabel: '← Back to Home',
    };
    setScreen(state, 'error');
    render();
  }
}

async function startMockExam(count) {
  setScreen(state, 'loading');
  root.innerHTML = renderLoadingPage({
    title: '🎯 Mock Exam',
    subtitle: `Preparing ${count} questions…`,
    message: 'Loading questions from all topics…',
    theme: state.settings.theme,
  });

  try {
    if (state.quizList.length === 0) state.quizList = await loadQuizList();
    const quiz = await createMockExam(state.quizList, count, state.settings.shuffle);
    setActiveQuiz(state, quiz);
    setScreen(state, 'quiz');
    render();
    startTimer();
  } catch (error) {
    state.error = {
      title: '🎯 Mock Exam',
      subtitle: '',
      message: error.message,
      backAction: 'show-home',
      backLabel: '← Back',
    };
    setScreen(state, 'error');
    render();
  }
}

function startBookmarkQuiz() {
  const quiz = buildBookmarkQuiz();
  if (!quiz) return;

  setActiveQuiz(state, quiz);
  setScreen(state, 'quiz');
  render();
  startTimer();
}

async function startMistakesQuiz() {
  setScreen(state, 'loading');
  root.innerHTML = renderLoadingPage({
    title: '❌ Review Mistakes',
    message: 'Preparing missed questions…',
    theme: state.settings.theme,
  });

  try {
    if (state.quizList.length === 0) state.quizList = await loadQuizList();
    const quiz = await buildMistakesQuiz(state.quizList);
    if (!quiz) {
      state.error = {
        title: '❌ Review Mistakes',
        subtitle: '',
        message: 'No historical mistakes found yet.',
        backAction: 'show-home',
        backLabel: '← Back',
      };
      setScreen(state, 'error');
      render();
      return;
    }

    setActiveQuiz(state, quiz);
    setScreen(state, 'quiz');
    render();
    startTimer();
  } catch (error) {
    state.error = {
      title: '❌ Review Mistakes',
      subtitle: '',
      message: error.message,
      backAction: 'show-home',
      backLabel: '← Back',
    };
    setScreen(state, 'error');
    render();
  }
}

function startDueReview() {
  const quiz = buildDueReviewQuiz();
  if (!quiz) return;

  setActiveQuiz(state, quiz);
  setScreen(state, 'quiz');
  render();
  startTimer();
}

async function startWeakDomainPractice(domain) {
  setScreen(state, 'loading');
  root.innerHTML = renderLoadingPage({
    title: '🎯 Weak Domain Practice',
    subtitle: domain,
    message: `Preparing ${domain} questions…`,
    theme: state.settings.theme,
  });

  try {
    if (state.quizList.length === 0) state.quizList = await loadQuizList();
    const quiz = await createDomainPracticeQuiz(state.quizList, domain, 12, state.settings.shuffle);
    if (!quiz) {
      state.error = {
        title: '🎯 Weak Domain Practice',
        subtitle: domain,
        message: `No questions found for ${domain}.`,
        backAction: 'show-home',
        backLabel: '← Back',
      };
      setScreen(state, 'error');
      render();
      return;
    }

    setActiveQuiz(state, quiz);
    setScreen(state, 'quiz');
    render();
    startTimer();
  } catch (error) {
    state.error = {
      title: '🎯 Weak Domain Practice',
      subtitle: domain,
      message: error.message,
      backAction: 'show-home',
      backLabel: '← Back',
    };
    setScreen(state, 'error');
    render();
  }
}

function resumeSession() {
  const session = getResumeSession();
  if (!session?.quiz) return;

  restoreQuizSession(state, session);
  setScreen(state, 'quiz');
  render();
  startTimer();
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.settings.theme);
  render();
}

function toggleShuffleSetting() {
  state.settings.shuffle = !state.settings.shuffle;
  saveShuffle(state.settings.shuffle);
  render();
}

function setTopicFilter(topic) {
  state.filterTopic = state.filterTopic === topic ? null : topic;
  render();
}

function setDomainFilter(domain) {
  state.filterDomain = state.filterDomain === domain ? null : domain;
  render();
}

function clearFilters() {
  state.filterTopic = null;
  state.filterDomain = null;
  render();
}

function toggleOption(id) {
  const question = state.quiz.questions[state.qIdx];
  const selection = state.selections[state.qIdx];

  if (question.type === 'MC') {
    state.selections[state.qIdx] = [id];
  } else {
    const index = selection.indexOf(id);
    if (index >= 0) selection.splice(index, 1);
    else selection.push(id);
  }

  render();
}

function checkAnswer() {
  state.checked[state.qIdx] = true;
  const question = state.quiz.questions[state.qIdx];
  const wasCorrect = isCorrect(question, state.selections[state.qIdx]);

  if (!wasCorrect) {
    recordMistake(`${state.quiz.id}:${state.qIdx}`, {
      question: question.question,
      domain: question.domain,
      quizTitle: state.quiz.title,
      sourceKey: question._sourceKey,
      questionData: question,
    });
  }

  updateReviewItem(question, wasCorrect, state.quiz.title);

  render();
}

function showResults() {
  stopTimer();
  clearResumeSession();
  state.results = gradeQuiz(state.quiz, state.selections);
  saveScore(state.quiz.id, state.results.correct, state.results.totalQ, state.results.domains);
  setScreen(state, 'results');
  render();
}

function nextQuestion() {
  if (state.qIdx < state.quiz.questions.length - 1) {
    state.qIdx++;
    render();
    return;
  }

  showResults();
}

function retryQuiz() {
  setActiveQuiz(state, state.quiz);
  setScreen(state, 'quiz');
  render();
  startTimer();
}

function retryWrong() {
  const quiz = buildWrongAnswersQuiz(state.quiz, state.selections);
  if (!quiz) return;

  setActiveQuiz(state, quiz);
  setScreen(state, 'quiz');
  render();
  startTimer();
}

function showFullReview() {
  setScreen(state, 'review');
  render();
}

function toggleQuestionBookmark() {
  const question = state.quiz.questions[state.qIdx];
  const key = `${state.quiz.id}:${state.qIdx}`;
  const wasBookmarked = !!getBookmarks()[key];

  toggleBookmark(key, {
    quizId: state.quiz.id,
    quizTitle: state.quiz.title,
    question,
  });

  if (!wasBookmarked) updateReviewItem(question, false, state.quiz.title);

  render();
}

function confirmBack() {
  if (confirm('Leave quiz? Your current progress will be lost.')) {
    clearResumeSession();
    showHome();
  }
}

async function handleAction(action, element) {
  switch (action) {
    case 'toggle-theme':
      toggleTheme();
      break;
    case 'toggle-shuffle':
      toggleShuffleSetting();
      break;
    case 'set-topic-filter':
      setTopicFilter(element.dataset.topic);
      break;
    case 'set-domain-filter':
      setDomainFilter(element.dataset.domain);
      break;
    case 'clear-filters':
      clearFilters();
      break;
    case 'start-quiz':
      await startQuiz(element.dataset.file);
      break;
    case 'start-mock-exam':
      await startMockExam(parseInt(element.dataset.count, 10));
      break;
    case 'start-bookmark-quiz':
      startBookmarkQuiz();
      break;
    case 'start-mistakes-quiz':
      await startMistakesQuiz();
      break;
    case 'start-due-review':
      startDueReview();
      break;
    case 'practice-domain':
      await startWeakDomainPractice(element.dataset.domain);
      break;
    case 'resume-session':
      resumeSession();
      break;
    case 'toggle-option':
      toggleOption(element.dataset.id);
      break;
    case 'check-answer':
      checkAnswer();
      break;
    case 'next-question':
      nextQuestion();
      break;
    case 'retry-quiz':
      retryQuiz();
      break;
    case 'retry-wrong':
      retryWrong();
      break;
    case 'show-full-review':
      showFullReview();
      break;
    case 'show-results':
      setScreen(state, 'results');
      render();
      break;
    case 'toggle-bookmark':
      toggleQuestionBookmark();
      break;
    case 'confirm-back':
      confirmBack();
      break;
    case 'show-home':
      await showHome();
      break;
    default:
      break;
  }
}

root.addEventListener('click', async (event) => {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  await handleAction(actionElement.dataset.action, actionElement);
});

applyTheme(state.settings.theme);
showHome();
