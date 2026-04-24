const OBJECTSCRIPT_BLOCK_SELECTOR = [
  'pre.objectscript > code',
  'pre.cls > code',
  'pre.cos > code',
  'pre.language-objectscript > code',
  'pre.language-cls > code',
  'pre.language-cos > code'
].join(', ');

const OBJECTSCRIPT_WRAPPER_SELECTOR = [
  'pre.objectscript',
  'pre.cls',
  'pre.cos',
  'pre.language-objectscript',
  'pre.language-cls',
  'pre.language-cos'
].join(', ');

// Keep these token groups roughly aligned with tree-sitter-objectscript highlights.scm.
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

function applyObjectScriptHighlighting() {
  const blocks = document.querySelectorAll(OBJECTSCRIPT_BLOCK_SELECTOR);
  for (const block of blocks) {
    if (block.dataset.objectscriptHighlighted === 'true') {
      continue;
    }

    const wrapper = block.closest(OBJECTSCRIPT_WRAPPER_SELECTOR);

    if (wrapper) {
      wrapper.classList.remove('language-cls', 'language-cos', 'cls', 'cos');
      wrapper.classList.add('language-objectscript', 'objectscript-highlight');
      wrapper.dataset.objectscriptHighlighted = 'true';
    }

    highlightBlock(block);
  }
}

function highlightBlock(block) {
  const source = block.textContent;
  block.innerHTML = renderObjectScript(source);
  block.classList.add('language-objectscript');
  block.dataset.objectscriptHighlighted = 'true';
}

function renderObjectScript(source) {
  return source
    .split('\n')
    .map((line) => renderLine(line))
    .join('\n');
}

function renderLine(line) {
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

  return segments.map(renderSegment).join('');
}

function renderSegment(segment) {
  if (segment.type === 'comment') {
    return wrap('os-comment', escapeHtml(segment.text));
  }

  if (segment.type === 'string') {
    return wrap('os-string', escapeHtml(segment.text));
  }

  return highlightPlain(segment.text);
}

function highlightPlain(text) {
  const patterns = [
    { className: 'os-string', regex: /'[^'\n]*'/g },
    { className: 'os-macro', regex: /\$\$\$[A-Za-z%][\w]*/g },
    { className: 'os-meta', regex: /(?:&|##)(?:sql|html|xml|js)\b/gi },
    { className: 'os-keyword', regex: createExactPattern(OBJECTSCRIPT_DIRECTIVES, 'gi') },
    {
      className: 'os-keyword',
      regex: createWordPattern(SQL_KEYWORDS, 'gi')
    },
    {
      className: 'os-keyword',
      regex: createWordPattern(OBJECTSCRIPT_KEYWORDS, 'gi')
    },
    {
      className: 'os-built-in',
      regex: createWordPattern(OBJECTSCRIPT_BUILTINS, 'gi')
    },
    {
      className: 'os-keyword',
      regex: createExactPattern(OBJECTSCRIPT_OPERATORS, 'g')
    },
    { className: 'os-classref', regex: /##class\([^)\n]+\)/gi },
    { className: 'os-global', regex: /\^[%A-Za-z][\w.]*/g },
    { className: 'os-instance', regex: /\.\.[A-Za-z%][\w]*/g },
    { className: 'os-built-in', regex: /\$\$[A-Za-z%][\w.]*/g },
    { className: 'os-built-in', regex: /\$[A-Za-z%][\w.]*/g },
    { className: 'os-variable', regex: /%[A-Za-z][\w]*/g },
    { className: 'os-variable', regex: /:[A-Za-z][\w]*/g },
    { className: 'os-variable', regex: /\b(SQLCODE|SQLSTATE|ROWCOUNT|ROWID)\b/g },
    { className: 'os-type', regex: /\b(?:%?[A-Z][\w]*)(?:\.(?:%?[A-Z][\w]*))+\b/g },
    { className: 'os-number', regex: /(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g }
  ];

  return applyPatterns(text, patterns);
}

function applyPatterns(text, patterns) {
  const placeholders = [];
  let output = text;

  for (const pattern of patterns) {
    output = output.replace(pattern.regex, (match) => {
      const token = `\uE000${toAlphaToken(placeholders.length)}\uE001`;
      placeholders.push({
        token,
        html: wrap(pattern.className, escapeHtml(match))
      });
      return token;
    });
  }

  output = escapeHtml(output);

  for (const placeholder of placeholders) {
    output = output.replaceAll(placeholder.token, placeholder.html);
  }

  return output;
}

function wrap(className, text) {
  return `<span class="${className}">${text}</span>`;
}

function escapeHtml(text) {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyObjectScriptHighlighting);
} else {
  applyObjectScriptHighlighting();
}

if (typeof document$ !== 'undefined' && typeof document$.subscribe === 'function') {
  document$.subscribe(applyObjectScriptHighlighting);
}
