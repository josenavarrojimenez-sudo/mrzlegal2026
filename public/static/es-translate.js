(function(){
  const MAX_BATCH_ITEMS = 50;
  const cache = window.__mrzTranslateCache || (window.__mrzTranslateCache = new Map());
  const pending = new Set();
  const TRANSLATED_ATTR = 'data-mrz-t';

  // Strings that must NEVER be translated
  const NO_TRANSLATE_EXACT = new Set(['MRZ LEGAL','MRZ Legal','MRZ legal','mrz legal','Quiebras','quiebras','QUIEBRAS','Quiebra','quiebra','QUIEBRA']);

  // Manual overrides — checked BEFORE Google Translate, case-sensitive key
  const OVERRIDES = {
    'Bankruptcy': 'Quiebra',
    'Bankruptcies': 'Quiebras',
    'Quiebras': 'Quiebras',
    'Quiebra': 'Quiebra',
    'bankruptcy': 'quiebra',
    'BANKRUPTCY': 'QUIEBRA',
    'Bankruptcies': 'Quiebras',
    'bankruptcies': 'quiebras',
    'Bankruptcy law': 'Derecho concursal',
    'bankruptcy law': 'derecho concursal',
    'Subsidiary liability': 'Responsabilidad subsidiaria',
    'subsidiary liability': 'responsabilidad subsidiaria',
    'Dispute resolution': 'Resolución de disputas',
    'dispute resolution': 'resolución de disputas',
    'Tax disputes': 'Disputas fiscales',
    'tax disputes': 'disputas fiscales',
    'Corporate disputes': 'Disputas corporativas',
    'corporate disputes': 'disputas corporativas',
  };

  const shouldSkipNode = (node) => {
    if (!node || !node.parentElement) return true;
    const el = node.parentElement;
    // Skip if already translated
    if (el.hasAttribute(TRANSLATED_ATTR)) return true;
    const tag = el.tagName;
    return ['SCRIPT','STYLE','NOSCRIPT','IFRAME','SVG','PATH'].includes(tag);
  };

  const shouldSkipValue = (text) => {
    const t = text.trim();
    if (t.length < 2) return true;
    if (NO_TRANSLATE_EXACT.has(t)) return true;
    if (/^[\d\s\+\-\.\,\(\)\/]+$/.test(t)) return true;
    // If it contains MRZ Legal anywhere, skip
    if (/MRZ\s*Legal/i.test(t)) return true;
    return false;
  };

  const googleTranslate = async (text) => {
    if (OVERRIDES[text]) return OVERRIDES[text];
    if (shouldSkipValue(text)) return text;
    try {
      const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=' + encodeURIComponent(text);
      const resp = await fetch(url);
      if (!resp.ok) return text;
      const data = await resp.json();
      let result = text;
      if (data && data[0]) result = data[0].map(s => s[0] || '').join('');
      // Always restore brand name if mangled
      result = result.replace(/MRZ\s*(Legal|LEGAL|legal)/gi, 'MRZ Legal');
      return result || text;
    } catch(e) { return text; }
  };

  const collectItems = () => {
    const items = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const raw = node.nodeValue || '';
      if (!raw.trim() || raw.trim().length < 2) continue;
      if (shouldSkipValue(raw)) continue;
      items.push({ type: 'text', node, el: node.parentElement, value: raw.trim() });
    }
    document.querySelectorAll('[title],[aria-label],[placeholder]').forEach((el) => {
      if (el.hasAttribute(TRANSLATED_ATTR)) return;
      ['title','aria-label','placeholder'].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && value.trim().length > 1 && !shouldSkipValue(value))
          items.push({ type: 'attr', node: el, el, attr, value: value.trim() });
      });
    });
    return items;
  };

  const applyTranslation = (item, translated) => {
    if (!translated) return;
    // Mark as translated BEFORE changing value to prevent re-trigger
    if (item.el) item.el.setAttribute(TRANSLATED_ATTR, '1');
    if (item.type === 'text') item.node.nodeValue = translated;
    else if (item.type === 'attr') item.node.setAttribute(item.attr, translated);
  };

  const translateItems = async (items) => {
    const toTranslate = [];
    const mapping = new Map();
    items.forEach((item) => {
      if (cache.has(item.value)) { applyTranslation(item, cache.get(item.value)); return; }
      if (pending.has(item.value)) return;
      pending.add(item.value);
      if (!mapping.has(item.value)) { mapping.set(item.value, []); toTranslate.push(item.value); }
      mapping.get(item.value).push(item);
    });
    if (!toTranslate.length) return;

    for (let i = 0; i < toTranslate.length; i += MAX_BATCH_ITEMS) {
      const batch = toTranslate.slice(i, i + MAX_BATCH_ITEMS);
      await Promise.all(batch.map(async (original) => {
        try {
          const translated = await googleTranslate(original);
          cache.set(original, translated);
          (mapping.get(original) || []).forEach(item => applyTranslation(item, translated));
        } catch(e) {}
        pending.delete(original);
      }));
    }
  };

  const fixLinks = () => {
    document.querySelectorAll('a[href]').forEach((el) => {
      if (el.hasAttribute('data-lang-switch')) return;
      const href = el.getAttribute('href');
      if (!href || /^(https?:)?\/\//i.test(href) || href.startsWith('#') || /^[a-zA-Z]+:/.test(href)) return;
      if (href === '/en' || href === '/en/') { el.setAttribute('href', '/es/'); return; }
      if (href.startsWith('/en/')) { el.setAttribute('href', '/es/' + href.slice(4)); return; }
      if (href === '/') el.setAttribute('href', '/es/');
    });
  };

  const run = () => { translateItems(collectItems()); fixLinks(); };

  let debounce;
  const schedule = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(run, 400); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();

  // Only watch for NEW elements added to DOM, NOT characterData (avoids re-translating already translated text)
  const observer = new MutationObserver((mutations) => {
    const hasNew = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0);
    if (hasNew) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();

// CSS fix for mobile overlap: Spanish text is longer, need extra room in bottom nav
(function injectMobileSpanishFix(){
  if (document.getElementById('mrz-es-mobile-fix')) return;
  var style = document.createElement('style');
  style.id = 'mrz-es-mobile-fix';
  style.textContent = [
    /* bottom of mobile nav - wrap flex items so they don't overlap */
    '.nav-mobile__bottom { flex-wrap: wrap !important; gap: 8px !important; }',
    '.nav-mobile__bottom > * { flex-shrink: 1 !important; min-width: 0 !important; }',
    /* make the solve/CTA link not overlap with contact name */
    '.nav-mobile__bottom .nav-mobile__contact { width: 100% !important; order: 2 !important; }',
    '.nav-mobile__bottom .nav-mobile__cta,',
    '.nav-mobile__bottom a[href*="contact"],',
    '.nav-mobile__bottom a[href*="contacts"] { width: 100% !important; order: 1 !important; }',
    /* general safety: any bottom nav row that has 2+ children in mobile */
    '@media (max-width: 900px) {',
    '  .nav-mobile__bottom { flex-direction: column !important; align-items: flex-start !important; }',
    '  .nav-mobile__bottom > div, .nav-mobile__bottom > a, .nav-mobile__bottom > p { width: auto !important; white-space: normal !important; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
})();
