import {
  TOPIC_ICONS,
  colorizeObjectScript,
  esc,
  formatTime,
  isCorrect,
  renderText,
  themeIcon,
} from './utils.js';

function buildHeader({ title, subtitle = '', backAction = null, docsHref = null, theme = 'light' }) {
  let leftControl = '';

  if (backAction) {
    leftControl = `<button class="btn-back" data-action="${backAction}">← Back</button>`;
  } else if (docsHref) {
    leftControl = `<a class="btn-back" href="${docsHref}" style="text-decoration:none">← Docs</a>`;
  }

  return `
    <header class="app-header">
      <div class="header-inner">
        ${leftControl}
        <div class="header-left">
          <span class="header-title">${title}</span>
          ${subtitle ? `<span class="header-subtitle">${esc(subtitle)}</span>` : ''}
        </div>
        <button class="btn-icon" data-action="toggle-theme" title="Toggle dark mode">${themeIcon(theme)}</button>
      </div>
    </header>`;
}

export function renderLoadingPage({ title, subtitle = '', message, theme, backAction = null }) {
  return `
    ${buildHeader({ title, subtitle, theme, backAction })}
    <main class="main-content">
      <div class="loading-state">
        <div class="loading-spinner">⏳</div>
        <p>${esc(message)}</p>
      </div>
    </main>`;
}

export function renderErrorPage({ title, subtitle = '', message, theme, backAction = 'show-home', backLabel = '← Back' }) {
  return `
    ${buildHeader({ title, subtitle, theme })}
    <main class="main-content">
      <div class="error-card">❌ ${esc(message)}</div>
      <div style="margin-top:16px">
        <button class="btn-secondary" data-action="${backAction}">${esc(backLabel)}</button>
      </div>
    </main>`;
}

export function renderHome(state, summary) {
  const totalQuestions = state.quizList.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
  const totalLoaded = state.quizList.length;
  const topicKeys = [...new Set(state.quizList.map((quiz) => quiz.topic))];
  const domainKeys = [...new Set(state.quizList.flatMap((quiz) => quiz.examDomains.map((domain) => domain.split('.')[0])))].sort();
  const visibleQuizzes = state.quizList.filter((quiz) => {
    if (state.filterTopic && quiz.topic !== state.filterTopic) return false;
    if (state.filterDomain && !quiz.examDomains.some((domain) => domain.startsWith(state.filterDomain))) return false;
    if (state.filterCategory && quiz.category !== state.filterCategory) return false;
    return true;
  });

  const categoryKeys = [
    { id: 'exam_prep', label: '🎓 Exam Prep' },
    { id: 'module_check', label: '📖 Module Check' }
  ];

  const categoryPills = categoryKeys.map((cat) => {
    const active = state.filterCategory === cat.id ? 'active' : '';
    return `<button class="filter-pill ${active}" data-action="set-category-filter" data-category="${esc(cat.id)}">${esc(cat.label)}</button>`;
  }).join('');

  const topicPills = topicKeys.map((topic) => {
    const icon = TOPIC_ICONS[topic] || '📚';
    const label = state.quizList.find((quiz) => quiz.topic === topic)?.topicLabel || topic;
    const active = state.filterTopic === topic ? 'active' : '';
    return `<button class="filter-pill ${active}" data-action="set-topic-filter" data-topic="${esc(topic)}">${icon} ${esc(label)}</button>`;
  }).join('');

  const domainPills = domainKeys.map((domain) => {
    const active = state.filterDomain === domain ? 'active' : '';
    return `<button class="filter-pill ${active}" data-action="set-domain-filter" data-domain="${esc(domain)}">${esc(domain)}</button>`;
  }).join('');

  const domainProgressHtml = Object.keys(summary.domainSummary).sort().map((domain) => {
    const value = summary.domainSummary[domain];
    const pct = Math.round((value.correct / value.total) * 100);
    const color = pct >= 65 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';

    return `<div class="domain-progress-row">
      <div class="dp-label"><span class="domain-tag">${esc(domain)}</span><span>${esc(value.name)}</span></div>
      <div class="dp-bar-track"><div class="dp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="dp-pct">${pct}%</span>
    </div>`;
  }).join('');

  const mistakesHtml = summary.topMistakes.map((mistake) => `
    <div class="mistake-item">
      <div class="mistake-top">
        <span class="domain-tag">${esc(mistake.domain)}</span>
        <span class="mistake-count">❌ ${mistake.count}× missed</span>
        <span class="mistake-quiz">${esc(mistake.quizTitle)}</span>
      </div>
      <div class="mistake-q">${renderText(mistake.question.length > 100 ? `${mistake.question.slice(0, 97)}…` : mistake.question)}</div>
    </div>`).join('');

  const weakDomainsHtml = summary.weakDomains.map((domain) => `
    <div class="weak-domain-item">
      <div class="weak-domain-top">
        <div>
          <span class="domain-tag">${esc(domain.domain)}</span>
          <strong style="margin-left:8px">${esc(domain.name)}</strong>
        </div>
        <span class="mistake-count">${domain.pct}%</span>
      </div>
      <div class="weak-domain-meta">${domain.correct}/${domain.total} correct</div>
      <button class="btn-secondary" data-action="practice-domain" data-domain="${esc(domain.domain)}">Practice ${esc(domain.domain)}</button>
    </div>`).join('');

  const quizCardsHtml = visibleQuizzes.map((quiz) => {
    const icon = TOPIC_ICONS[quiz.topic] || '📚';
    const bestScore = summary.scores[quiz.id];
    const bestHtml = bestScore
      ? `<span class="best-score">🏆 Best: ${bestScore.score}/${bestScore.total} (${bestScore.pct}%)</span>`
      : `<span style="color:var(--text-muted);font-size:0.8rem">Not attempted</span>`;

    return `
      <div class="quiz-card">
        <div class="card-top">
          <span class="topic-icon">${icon}</span>
          <div class="card-titles">
            <div class="card-topic">${esc(quiz.topicLabel)}</div>
            <div class="card-title">${esc(quiz.title)}</div>
          </div>
        </div>
        <span class="difficulty-badge">${esc(quiz.difficulty)}</span>
        <div class="domain-tags">${quiz.examDomains.map((domain) => `<span class="domain-tag">${esc(domain)}</span>`).join('')}</div>
        <div class="card-meta">
          <span>❓ ${quiz.totalQuestions} questions</span>
          ${bestHtml}
        </div>
        <button class="btn-primary" data-action="start-quiz" data-file="${esc(quiz.file)}">Start Quiz →</button>
      </div>`;
  }).join('');

  return `
    ${buildHeader({
      title: '🧠 IRIS Quiz',
      subtitle: 'InterSystems IRIS Development Professional',
      docsHref: './',
      theme: state.settings.theme,
    })}
    <main class="main-content">
      <div class="stats-bar">
        <div class="stat">📋 ${state.quizList.length} quizzes available</div>
        <div class="stat">❓ ${totalQuestions} total questions</div>
        <button class="stat shuffle-toggle ${state.settings.shuffle ? 'active' : ''}" data-action="toggle-shuffle">🔀 Shuffle ${state.settings.shuffle ? 'ON' : 'OFF'}</button>
      </div>

      ${(summary.resumeSession || summary.dueReviewCount > 0 || summary.mistakesCount > 0) ? `
        <div class="quick-actions-panel">
          <div class="section-title" style="margin-bottom:12px">⚡ Quick Review</div>
          <div class="quick-actions-grid">
            ${summary.resumeSession ? `
              <div class="quick-action-card">
                <div class="quick-action-title">▶ Resume Session</div>
                <div class="quick-action-meta">${esc(summary.resumeSession.quiz.title)} · Q ${summary.resumeSession.qIdx + 1}/${summary.resumeSession.quiz.questions.length}</div>
                <button class="btn-primary" data-action="resume-session">Resume</button>
              </div>` : ''}
            ${summary.mistakesCount > 0 ? `
              <div class="quick-action-card">
                <div class="quick-action-title">❌ Review Mistakes</div>
                <div class="quick-action-meta">${summary.mistakesCount} questions missed before</div>
                <button class="btn-primary" data-action="start-mistakes-quiz">Start Review</button>
              </div>` : ''}
            ${summary.dueReviewCount > 0 ? `
              <div class="quick-action-card">
                <div class="quick-action-title">🗓 Due for Review</div>
                <div class="quick-action-meta">${summary.dueReviewCount} questions scheduled for today</div>
                <button class="btn-primary" data-action="start-due-review">Review Now</button>
              </div>` : ''}
          </div>
        </div>` : ''}

      <div class="mock-exam-banner">
        <div>
          <h3>🎯 Mock Exam Mode</h3>
          <p>Randomly mixed questions from all topics — simulate the real cert exam</p>
        </div>
        <div class="mock-exam-actions">
          <button class="btn-mock" data-action="start-mock-exam" data-count="20">⚡ Quick (20q)</button>
          <button class="btn-mock" data-action="start-mock-exam" data-count="40">📝 Practice (40q)</button>
          <button class="btn-mock" data-action="start-mock-exam" data-count="62" ${totalLoaded < 3 ? 'disabled title="Need more quizzes"' : ''}>🏆 Full Mock (62q)</button>
        </div>
      </div>

      ${domainProgressHtml ? `
        <div class="domain-dashboard">
          <div class="section-title" style="margin-bottom:12px">📊 Domain Progress</div>
          ${domainProgressHtml}
        </div>` : ''}

      ${mistakesHtml ? `
        <div class="mistakes-panel">
          <div class="section-title" style="margin-bottom:12px">⚠️ Most Missed Questions</div>
          ${mistakesHtml}
        </div>` : ''}

      ${weakDomainsHtml ? `
        <div class="mistakes-panel">
          <div class="section-title" style="margin-bottom:12px">🎯 Weakest Domains</div>
          <div class="weak-domain-list">${weakDomainsHtml}</div>
        </div>` : ''}

      ${summary.bookmarksCount > 0 ? `
        <div class="bookmarks-bar">
          <button class="btn-secondary" data-action="start-bookmark-quiz">📌 Review Bookmarks (${summary.bookmarksCount})</button>
          <span style="color:var(--text-muted);font-size:0.85rem">Bookmarked questions saved across all quizzes</span>
        </div>` : ''}

      <div class="filter-bar">
        <div class="filter-row">
          <span class="filter-label">📂 Type</span>
          <div class="filter-pills">${categoryPills}</div>
        </div>
        <div class="filter-row">
          <span class="filter-label">📚 Topic</span>
          <div class="filter-pills">${topicPills}</div>
        </div>
        <div class="filter-row">
          <span class="filter-label">🏷 Domain</span>
          <div class="filter-pills">
            ${domainPills}
            ${state.filterTopic || state.filterDomain || state.filterCategory ? '<button class="filter-pill" data-action="clear-filters" style="margin-left:4px">✕ Clear</button>' : ''}
          </div>
        </div>
      </div>

      <div class="quiz-grid">
        ${visibleQuizzes.length === 0 ? '<div class="no-results">🔍 No quizzes match the selected filters.</div>' : quizCardsHtml}
      </div>
    </main>`;
}

export function renderQuiz(state, bookmarks) {
  const question = state.quiz.questions[state.qIdx];
  const total = state.quiz.questions.length;
  const isLast = state.qIdx === total - 1;
  const isChecked = state.checked[state.qIdx];
  const selection = state.selections[state.qIdx];
  const hasSelection = selection.length > 0;
  const progress = (state.qIdx / total) * 100;
  const typeLabel = question.type === 'MC' ? 'MC — Single Answer' : 'MR — Select All That Apply';
  const bookmarkKey = `${state.quiz.id}:${state.qIdx}`;
  const isBookmarked = !!bookmarks[bookmarkKey];

  const optionsHtml = question.options.map((option) => {
    let className = 'option-card';
    if (isChecked) {
      className += ' disabled';
      const inAnswer = question.answer.includes(option.id);
      const picked = selection.includes(option.id);
      if (inAnswer && picked) className += ' correct';
      else if (!inAnswer && picked) className += ' wrong';
      else if (inAnswer && !picked) className += ' missed';
    } else if (selection.includes(option.id)) {
      className += ' selected';
    }

    return `
      <div class="${className}" ${isChecked ? '' : `data-action="toggle-option" data-id="${esc(option.id)}"`}>
        <span class="option-id">${esc(option.id)}</span>
        <span class="option-text">${renderText(option.text)}</span>
      </div>`;
  }).join('');

  return `
    <div class="quiz-header">
      <div class="quiz-header-inner">
        <button class="btn-back" data-action="confirm-back">← Back</button>
        <div class="quiz-header-info">
          <div class="qtitle">${esc(state.quiz.title)}</div>
          <div class="qcounter">Q ${state.qIdx + 1} of ${total}</div>
        </div>
        <div class="timer" id="timer-display">${formatTime(state.timerSecs)}</div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
    </div>
    <main class="quiz-main">
      <div class="question-card">
        <div class="question-meta">
          <span class="domain-tag">${esc(question.domain)}</span>
          <span class="type-badge">${typeLabel}</span>
          ${state.quiz.topic === 'review' ? '<span class="type-badge">Review Queue</span>' : ''}
          <button class="btn-bookmark ${isBookmarked ? 'active' : ''}" data-action="toggle-bookmark" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}">${isBookmarked ? '🔖' : '🏷️'}</button>
        </div>
        <div class="question-text">${renderText(question.question)}</div>
        ${question.code !== null ? `<div class="code-wrapper"><div class="code-lang-bar">ObjectScript</div><pre><code data-code-index="${state.qIdx}" class="nohighlight"></code></pre></div>` : ''}
      </div>
      <div class="options-list">${optionsHtml}</div>
      ${isChecked ? `
        <div class="explanation-box">
          <div class="expl-label">💡 Explanation</div>
          <div>${renderText(question.explanation)}</div>
        </div>` : ''}
      <div class="action-bar">
        ${isChecked
          ? `<button class="btn-primary" data-action="next-question">${isLast ? '🏁 See Results' : 'Next Question →'}</button>`
          : `<button class="btn-primary" data-action="check-answer" id="check-btn" ${hasSelection ? '' : 'disabled'}>Check Answer</button>`}
      </div>
    </main>`;
}

export function renderResults(state) {
  const { results } = state;
  const domainRows = Object.keys(results.domains).sort().map((domain) => {
    const value = results.domains[domain];
    const pct = Math.round((value.correct / value.total) * 100);
    return `<tr>
      <td><span class="domain-tag">${esc(domain)}</span></td>
      <td class="domain-score">${value.correct} / ${value.total}</td>
      <td>${pct}%</td>
      <td><div class="domain-bar-track"><div class="domain-bar-fill" style="width:${pct}%"></div></div></td>
    </tr>`;
  }).join('');

  const reviewItems = results.reviewItems.map((item) => `
    <div class="review-item ${item.ok ? 'correct' : 'wrong'}">
      <div class="review-top">
        <span class="review-num">Q${item.index + 1}</span>
        <span class="domain-tag">${esc(item.question.domain)}</span>
        <span class="type-badge">${item.question.type}</span>
        <span class="review-result ${item.ok ? 'ok' : 'ko'}">${item.ok ? '✅ Correct' : '❌ Wrong'}</span>
      </div>
      <div class="review-q">${renderText(item.shortQuestion)}</div>
      <div class="review-answers">
        <div class="ra-row">
          <span class="ra-label">Your answer:</span>
          <span class="${item.ok ? 'ra-val-correct' : 'ra-val-wrong'}">${esc(item.userAnswer)}</span>
        </div>
        ${item.ok ? '' : `<div class="ra-row"><span class="ra-label">Correct:</span><span class="ra-val-correct">${esc(item.correctAnswer)}</span></div>`}
      </div>
    </div>`).join('');

  return `
    ${buildHeader({ title: 'Quiz Results', subtitle: state.quiz.title, theme: state.settings.theme })}
    <main class="results-main">
      <div class="results-hero">
        <div class="score-circle">
          <span class="score-num">${results.correct}</span>
          <span class="score-den">/ ${results.totalQ}</span>
        </div>
        <div class="score-pct">${results.pct}%</div>
        <div class="grade-badge ${results.pass ? 'grade-pass' : 'grade-fail'}">${results.pass ? 'Pass ✅' : 'Needs Review ❌'}</div>
        <div class="time-display">⏱ Time taken: ${formatTime(state.timerSecs)}</div>
      </div>

      <div class="section-title">📊 Domain Breakdown</div>
      <table class="domain-table">
        <thead><tr><th>Domain</th><th>Score</th><th>%</th><th>Progress</th></tr></thead>
        <tbody>${domainRows}</tbody>
      </table>

      <div class="section-title">📝 Question Review</div>
      <div class="review-list">${reviewItems}</div>

      <div class="results-actions">
        <button class="btn-primary" data-action="retry-quiz">🔄 Retry Quiz</button>
        ${results.wrongCount > 0 ? `<button class="btn-primary" data-action="retry-wrong" style="background:var(--error);border-color:var(--error)">🎯 Retry Wrong (${results.wrongCount})</button>` : ''}
        <button class="btn-secondary" data-action="show-full-review">📖 Full Review</button>
        <button class="btn-secondary" data-action="show-home">🏠 Home</button>
      </div>
    </main>`;
}

export function renderFullReview(state) {
  const cards = state.quiz.questions.map((question, index) => {
    const ok = isCorrect(question, state.selections[index]);
    const optionsHtml = question.options.map((option) => {
      let className = 'option-card disabled';
      const inAnswer = question.answer.includes(option.id);
      const picked = state.selections[index].includes(option.id);
      if (inAnswer && picked) className += ' correct';
      else if (!inAnswer && picked) className += ' wrong';
      else if (inAnswer && !picked) className += ' missed';

      return `<div class="${className}">
        <span class="option-id">${esc(option.id)}</span>
        <span class="option-text">${renderText(option.text)}</span>
      </div>`;
    }).join('');

    return `
      <div class="review-detail-card ${ok ? 'rd-correct' : 'rd-wrong'}">
        <div class="review-detail-header">
          <span class="review-num">Q${index + 1}</span>
          <span class="domain-tag">${esc(question.domain)}</span>
          <span class="type-badge">${question.type === 'MC' ? 'MC — Single Answer' : 'MR — Select All'}</span>
          <span class="review-result ${ok ? 'ok' : 'ko'}">${ok ? '✅ Correct' : '❌ Wrong'}</span>
        </div>
        <div class="question-text" style="margin-bottom:14px">${renderText(question.question)}</div>
        ${question.code !== null ? `<div class="code-wrapper"><div class="code-lang-bar">ObjectScript</div><pre><code data-code-index="${index}" class="nohighlight"></code></pre></div>` : ''}
        <div class="options-list" style="margin-bottom:12px">${optionsHtml}</div>
        <div class="explanation-box">
          <div class="expl-label">💡 Explanation</div>
          <div>${renderText(question.explanation)}</div>
        </div>
      </div>`;
  }).join('');

  return `
    ${buildHeader({ title: '📖 Full Review', subtitle: state.quiz.title, backAction: 'show-results', theme: state.settings.theme })}
    <main class="main-content">
      <div class="review-detail-list">${cards}</div>
      <div class="results-actions" style="margin-top:24px">
        <button class="btn-secondary" data-action="show-results">← Back to Results</button>
        <button class="btn-secondary" data-action="show-home">🏠 Home</button>
      </div>
    </main>`;
}

export function hydrateCodeBlocks(container, questions) {
  container.querySelectorAll('[data-code-index]').forEach((element) => {
    const question = questions[parseInt(element.dataset.codeIndex, 10)];
    if (question?.code) element.innerHTML = colorizeObjectScript(question.code);
  });
}
