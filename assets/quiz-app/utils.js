export const DATA_BASE = 'quizzes/data/';

export const STORAGE_KEYS = {
  scores: 'iris-quiz-scores',
  mistakes: 'iris-quiz-mistakes',
  bookmarks: 'iris-quiz-bookmarks',
  reviewItems: 'iris-quiz-review-items',
  session: 'iris-quiz-session',
  theme: 'iris-quiz-theme',
  shuffle: 'iris-quiz-shuffle',
};

export const TOPIC_ICONS = {
  '01_objectscript-basics': '🔤',
  '02_classes-objects': '🏗️',
  '03_globals': '🗄️',
  '04_sql': '📊',
  '05_rest-api': '🌐',
  '06_interoperability': '🔄',
  '07_unit-testing': '🧪',
  '08_security': '🔐',
  '09_python': '🐍',
  '10_architecture': '🧭',
  '11_devtools-cicd': '🛠️',
  '12_transactions-locking': '🔒',
  '13_jdbc-odbc': '🔌',
};

export const DOMAIN_NAMES = {
  T1: 'Architecture',
  T2: 'Dev Lifecycle',
  T3: 'Data Retrieval',
  T4: 'Code',
};

export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderText(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code class="ic">$1</code>');
}

export function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function isCorrect(question, selection) {
  if (!selection || selection.length === 0) return false;
  return [...question.answer].sort().join(',') === [...selection].sort().join(',');
}

export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function themeIcon(theme) {
  return theme === 'dark' ? '☀️' : '🌙';
}

export function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function colorizeObjectScript(code) {
  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const KEYWORDS = /^(SET|WRITE|KILL|DO|IF|ELSE|ELSEIF|FOR|WHILE|QUIT|RETURN|THROW|TRY|CATCH|MERGE|NEW|GOTO|HALT|HANG|XECUTE|ClassMethod|Method|Property|Parameter|Extends|As)$/i;
  const TOKEN_REGEX = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/\/[^\n]*)|(\$\$\$\w+)|(\$[A-Za-z][A-Za-z0-9]*)|(\b[A-Za-z][A-Za-z0-9]*\b)|(##class)|(\b\d+(?:\.\d+)?\b)/g;

  let output = '';
  let lastIndex = 0;
  let match;

  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(code)) !== null) {
    output += escapeHtml(code.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const [, doubleQuoted, singleQuoted, comment, macro, builtin, word, classKeyword, number] = match;

    if (doubleQuoted) output += `<span style="color:#98c379">${escapeHtml(doubleQuoted)}</span>`;
    else if (singleQuoted) output += `<span style="color:#98c379">${escapeHtml(singleQuoted)}</span>`;
    else if (comment) output += `<span style="color:#6a737d;font-style:italic">${escapeHtml(comment)}</span>`;
    else if (macro) output += `<span style="color:#e5c07b;font-weight:600">${escapeHtml(macro)}</span>`;
    else if (builtin) output += `<span style="color:#56b6c2">${escapeHtml(builtin)}</span>`;
    else if (word) {
      output += KEYWORDS.test(word)
        ? `<span style="color:#c678dd;font-weight:600">${escapeHtml(word)}</span>`
        : escapeHtml(word);
    } else if (classKeyword) output += `<span style="color:#e06c75;font-weight:600">${escapeHtml(classKeyword)}</span>`;
    else if (number) output += `<span style="color:#d19a66">${escapeHtml(number)}</span>`;
    else output += escapeHtml(match[0]);
  }

  output += escapeHtml(code.slice(lastIndex));
  return output;
}
