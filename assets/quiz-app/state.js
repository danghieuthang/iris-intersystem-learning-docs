export function createInitialState(settings) {
  return {
    screen: 'home',
    quizList: [],
    quiz: null,
    qIdx: 0,
    selections: [],
    checked: [],
    timerSecs: 0,
    timerHandle: null,
    filterTopic: null,
    filterDomain: null,
    filterCategory: null,
    settings,
    results: null,
    error: null,
  };
}

export function setActiveQuiz(state, quiz) {
  state.quiz = quiz;
  state.qIdx = 0;
  state.selections = quiz.questions.map(() => []);
  state.checked = quiz.questions.map(() => false);
  state.timerSecs = 0;
  state.results = null;
  state.error = null;
}

export function setScreen(state, screen) {
  state.screen = screen;
}

export function restoreQuizSession(state, session) {
  state.quiz = session.quiz;
  state.qIdx = session.qIdx;
  state.selections = session.selections;
  state.checked = session.checked;
  state.timerSecs = session.timerSecs;
  state.results = null;
  state.error = null;
}
