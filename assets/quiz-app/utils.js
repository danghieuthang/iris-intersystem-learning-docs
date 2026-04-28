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
  const value = String(text);
  const fencePattern = /```([A-Za-z0-9_-]+)?\r?\n([\s\S]*?)```/g;
  let html = '';
  let lastIndex = 0;
  let match;

  while ((match = fencePattern.exec(value)) !== null) {
    html += renderInlineText(value.slice(lastIndex, match.index));
    html += renderCodeBlock(match[1], match[2]);
    lastIndex = fencePattern.lastIndex;
  }

  html += renderInlineText(value.slice(lastIndex));
  return html;
}

function renderInlineText(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code class="ic">$1</code>');
}

function renderCodeBlock(language, code) {
  const normalizedLanguage = String(language || 'text').toLowerCase();
  const label = normalizedLanguage === 'objectscript' ? 'ObjectScript' : normalizedLanguage;
  const html = normalizedLanguage === 'objectscript'
    ? colorizeObjectScript(code.replace(/\r\n/g, '\n'))
    : escapeCodeHtml(code.replace(/\r\n/g, '\n'));

  return `<div class="code-wrapper"><div class="code-lang-bar">${esc(label)}</div><pre><code class="nohighlight">${html}</code></pre></div>`;
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

const SQL_KEYWORDS = [
  'and', 'as', 'by', 'close', 'declare', 'delete', 'fetch', 'for', 'from',
  'group', 'having', 'in', 'insert', 'into', 'join', 'left', 'like', 'not',
  'null', 'on', 'open', 'order', 'outer', 'right', 'select', 'set', 'union',
  'update', 'values', 'where'
];

const OBJECTSCRIPT_KEYWORDS = [
  'all', 'as', 'break', 'byref', 'case', 'catch', 'class', 'classmethod',
  'clientmethod', 'continue', 'destruct', 'dim', 'else', 'elseif', 'extends',
  'foreignkey', 'if', 'import', 'include', 'includegenerator', 'index',
  'keyword', 'method', 'methodimpl', 'not', 'of', 'oldelse', 'on', 'off',
  'output', 'parameter', 'private', 'projection', 'property', 'public',
  'query', 'quit', 'references', 'relationship', 'required', 'return',
  'routine', 'serial', 'sqlproc', 'storage', 'throw', 'transient', 'trigger',
  'try', 'xdata'
];

const OBJECTSCRIPT_BUILTINS = [
  'close', 'do', 'for', 'goto', 'halt', 'hang', 'job', 'kill', 'lock',
  'merge', 'new', 'open', 'print', 'read', 'set', 'tcommit', 'trollback',
  'tstart', 'use', 'view', 'while', 'write', 'xecute', 'zload', 'zprint',
  'zremove', 'zwrite', 'znspace'
];

const OBJECTSCRIPT_DIRECTIVES = [
  '#define', '#def1arg', '#dim', '#delay', '#else', '#elseif', '#endif',
  '#if', '#ifdef', '#ifndef', '#import', '#include'
];

const OBJECTSCRIPT_OPERATORS = [
  "'&", '&', '&&', "'<", "'=", "'>", '^$', '^', '-', '+', '<=', '<', '=',
  '>=', '>', '@', '**', '*', "'!", "'?", '!', '?', '--'
];

export function colorizeObjectScript(code) {
  return code
    .split('\n')
    .map((line) => renderObjectScriptLine(line))
    .join('\n');
}

function renderObjectScriptLine(line) {
  const segments = [];
  let current = '';
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (current) {
        segments.push({ type: 'plain', text: current });
        current = '';
      }

      let end = i + 1;
      while (end < line.length) {
        if (line[end] === '"') {
          end += 1;
          if (line[end] === '"') {
            end += 1;
            continue;
          }
          break;
        }
        end += 1;
      }

      segments.push({ type: 'string', text: line.slice(i, end) });
      i = end;
      continue;
    }

    if (ch === ';' || (ch === '/' && line[i + 1] === '/')) {
      if (current) {
        segments.push({ type: 'plain', text: current });
      }
      segments.push({ type: 'comment', text: line.slice(i) });
      current = '';
      break;
    }

    current += ch;
    i += 1;
  }

  if (current) {
    segments.push({ type: 'plain', text: current });
  }

  return segments.map(renderObjectScriptSegment).join('');
}

function renderObjectScriptSegment(segment) {
  if (segment.type === 'comment') {
    return wrapToken('os-comment', escapeCodeHtml(segment.text));
  }

  if (segment.type === 'string') {
    return wrapToken('os-string', escapeCodeHtml(segment.text));
  }

  return highlightObjectScriptPlain(segment.text);
}

function highlightObjectScriptPlain(text) {
  const escaped = escapeCodeHtml(text);
  const patterns = [
    { className: 'os-string', regex: /'[^'\n]*'/g },
    { className: 'os-macro', regex: /\$\$\$[A-Za-z%][\w]*/g },
    { className: 'os-meta', regex: /(?:&|##)(?:sql|html|xml|js)\b/gi },
    { className: 'os-keyword', regex: createExactPattern(OBJECTSCRIPT_DIRECTIVES, 'gi') },
    { className: 'os-keyword', regex: createWordPattern(SQL_KEYWORDS, 'gi') },
    { className: 'os-keyword', regex: createWordPattern(OBJECTSCRIPT_KEYWORDS, 'gi') },
    { className: 'os-built-in', regex: createWordPattern(OBJECTSCRIPT_BUILTINS, 'gi') },
    { className: 'os-keyword', regex: createExactPattern(OBJECTSCRIPT_OPERATORS, 'g') },
    { className: 'os-classref', regex: /##class\([^)\n]+\)/gi },
    { className: 'os-global', regex: /\^[%A-Za-z][\w.]*/g },
    { className: 'os-instance', regex: /\.\.[A-Za-z%][\w]*/g },
    { className: 'os-built-in', regex: /\$\$[A-Za-z%][\w.]*/g },
    { className: 'os-built-in', regex: /\$[A-Za-z%][\w.]*/g },
    { className: 'os-variable', regex: /%[A-Za-z][\w]*/g },
    { className: 'os-variable', regex: /:[A-Za-z][\w]*/g },
    { className: 'os-variable', regex: /\b(SQLCODE|SQLSTATE|ROWCOUNT|ROWID)\b/g },
    { className: 'os-type', regex: /\b(?:%?[A-Z][\w]*)(?:\.(?:%?[A-Z][\w]*))+\b/g },
    { className: 'os-number', regex: /(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g },
  ];

  return applyTokenPatterns(escaped, patterns);
}

function applyTokenPatterns(text, patterns) {
  const placeholders = [];
  let output = text;

  for (const pattern of patterns) {
    output = output.replace(pattern.regex, (match) => {
      const token = `\uE000${toAlphaToken(placeholders.length)}\uE001`;
      placeholders.push({
        token,
        html: wrapToken(pattern.className, match),
      });
      return token;
    });
  }

  for (const placeholder of placeholders) {
    output = output.replaceAll(placeholder.token, placeholder.html);
  }

  return output;
}

function wrapToken(className, text) {
  return `<span class="${className}">${text}</span>`;
}

function escapeCodeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function createWordPattern(words, flags) {
  return new RegExp(`\\b(${words.join('|')})\\b`, flags);
}

function createExactPattern(values, flags) {
  const escapedValues = values
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  return new RegExp(`(${escapedValues.join('|')})`, flags);
}

function toAlphaToken(index) {
  let value = index;
  let token = '';

  do {
    token = String.fromCharCode(65 + (value % 26)) + token;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return token;
}
