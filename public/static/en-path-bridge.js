(function(){
  // On English pages, expose the equivalent Spanish path and ensure the
  // language switcher points to /es/*.
  var original = location.pathname;

  // Build equivalent /es/* path for the CURRENT page.
  // If we are already on /en/* -> /es/*
  // If we are on language-less paths like /tax/ -> assume /en/tax/ -> /es/tax/
  var normalized = original;
  if (normalized === '/' || normalized === '') {
    normalized = '/en/';
  }
  if (!normalized.startsWith('/en/') && !normalized.startsWith('/es/')) {
    normalized = '/en' + (normalized.startsWith('/') ? normalized : '/' + normalized);
  }

  var esPath = normalized.replace(/^\/en\b/, '/es');
  if (!esPath.startsWith('/es/')) {
    esPath = '/es/';
  }
  window.__mrzEsPath = esPath;

  function updateLangSwitcher(){
    var target = window.__mrzEsPath || '/es/';
    var links = Array.prototype.slice.call(document.querySelectorAll('a'));

    links.forEach(function(a){
      // Skip links we've already handled
      if (a && a.getAttribute && a.getAttribute('data-lang-switch') === 'es') {
        return;
      }

      var text = (a.textContent || '').trim().toUpperCase();
      var href = (a.getAttribute('href') || '').trim();

      // Only treat as language switcher if:
      // - label is a language token OR
      // - href contains language hint (ru/en/es) OR
      // - element already has lang-ish attributes
      // IMPORTANT: be very conservative here. Many normal navigation links contain
      // substrings like "/en/" or "/es/" in the href, which must NOT be treated as
      // language switchers.
      // We only rewrite links that are clearly the language toggle.
      var looksLikeLang =
        // Exactly-labeled toggles
        text === 'EN' || text === 'ES' || text === 'RU' || text === 'RUS' || text === 'РУ' || text === 'РУС' ||
        // Explicit language attributes
        (a.getAttribute('data-lang-switch') && /^(en|es)$/i.test(a.getAttribute('data-lang-switch'))) ||
        (a.getAttribute('data-lang') && /^(ru|en|es)/i.test(a.getAttribute('data-lang'))) ||
        (a.getAttribute('hreflang') && /^(ru|en|es)/i.test(a.getAttribute('hreflang'))) ||
        (a.getAttribute('lang') && /^(ru|en|es)/i.test(a.getAttribute('lang'))) ||
        // Very specific href patterns commonly used for language toggles
        /(^|\?|&)lang=(ru|en|es)(&|$)/i.test(href) ||
        /^\/(ru|en|es)\/?$/i.test(href) ||
        /^\/(ru|en|es)\//i.test(href);

      if (!looksLikeLang) {
        return;
      }

      // If it's a normal nav link but contains /es/ somewhere, don't touch it.
      // We only want the actual toggle control.
      if (text !== 'EN' && text !== 'ES' && text !== 'RU' && text !== 'RUS' && text !== 'РУ' && text !== 'РУС') {
        return;
      }

      a.textContent = 'ES';
      a.setAttribute('href', target);
      a.setAttribute('data-lang-switch', 'es');
      a.setAttribute('hreflang', 'es');
      a.setAttribute('lang', 'es');
      a.setAttribute('aria-label', 'Español');
      a.setAttribute('title', 'Español');

      // Capture-phase: beat Nuxt/router handlers.
      a.addEventListener(
        'click',
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          try {
            document.cookie = 'mrz_lang=es; Path=/; Max-Age=31536000; SameSite=Lax';
          } catch (e) {}
          window.location.assign(target);
        },
        { capture: true }
      );
    });
  }

  updateLangSwitcher();
  document.addEventListener('DOMContentLoaded', updateLangSwitcher);
  var tries = 0;
  var interval = setInterval(function(){
    updateLangSwitcher();
    tries++;
    if (tries > 20) clearInterval(interval);
  }, 500);
})();
