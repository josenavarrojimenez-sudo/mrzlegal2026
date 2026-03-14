(function(){
  const MAX_BATCH_ITEMS = 50;
  const cache = window.__mrzTranslateCache || (window.__mrzTranslateCache = new Map());
  const pending = new Set();

  // Strings that must NEVER be translated
  const NO_TRANSLATE = ['MRZ LEGAL', 'MRZ Legal', 'mrz legal'];

  // Manual overrides for bad Google Translate results
  const OVERRIDES = {
    'bankruptcy': 'quiebra',
    'Bankruptcy': 'Quiebra',
    'BANKRUPTCY': 'QUIEBRA',
    'bankruptcy law': 'derecho concursal',
    'Bankruptcy law': 'Derecho concursal',
    'subsidiary liability': 'responsabilidad subsidiaria',
    'Subsidiary liability': 'Responsabilidad subsidiaria',
    'dispute resolution': 'resolución de disputas',
    'Dispute resolution': 'Resolución de disputas',
    'tax disputes': 'disputas fiscales',
    'Tax disputes': 'Disputas fiscales',
    'corporate disputes': 'disputas corporativas',
    'Corporate disputes': 'Disputas corporativas',
  };

  const shouldSkipNode = (node) => {
    if (!node || !node.parentElement) return true;
    const tag = node.parentElement.tagName;
    return ['SCRIPT','STYLE','NOSCRIPT','IFRAME','SVG','PATH'].includes(tag);
  };

  const shouldSkipValue = (text) => {
    const t = text.trim();
    // Skip brand name
    if (NO_TRANSLATE.some(n => t === n || t.toLowerCase() === n.toLowerCase())) return true;
    // Skip short codes, numbers, URLs
    if (t.length < 2) return true;
    if (/^[\d\s\+\-\.\,\(\)]+$/.test(t)) return true;
    return false;
  };

  // Google unofficial translate endpoint — no widget, no API key, invisible
  const googleTranslate = async (text) => {
    // Check manual overrides first
    if (OVERRIDES[text]) return OVERRIDES[text];
    if (shouldSkipValue(text)) return text;
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=' + encodeURIComponent(text);
    const resp = await fetch(url);
    if (!resp.ok) return text;
    const data = await resp.json();
    let result = text;
    if (data && data[0]) result = data[0].map(s => s[0] || '').join('');
    // Post-process: restore brand name if translation mangled it
    result = result.replace(/MRZ\s*(Legal|LEGAL|legal)/gi, 'MRZ Legal');
    // Fix common bad translations
    result = result.replace(/\bquiet[ao]?\b/gi, (m, offset) => {
      // Only replace if it looks like a mistranslation of "bankruptcy"
      return m;
    });
    return result || text;
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
      items.push({ type: 'text', node, value: raw.trim(), raw });
    }
    document.querySelectorAll('[title],[aria-label],[placeholder]').forEach((el) => {
      ['title','aria-label','placeholder'].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && value.trim().length > 1 && !shouldSkipValue(value)) {
          items.push({ type: 'attr', node: el, attr, value: value.trim() });
        }
      });
    });
    return items;
  };

  const applyTranslation = (item, translated) => {
    if (!translated) return;
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

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
})();
