window.mermaidConfig = {
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'default'
};

document$.subscribe(() => {
  const nodes = document.querySelectorAll('.mermaid');
  if (!nodes.length || typeof mermaid === 'undefined') {
    return;
  }

  mermaid.initialize(window.mermaidConfig);

  for (const node of nodes) {
    node.removeAttribute('data-processed');
  }

  mermaid.run({ nodes });
});
