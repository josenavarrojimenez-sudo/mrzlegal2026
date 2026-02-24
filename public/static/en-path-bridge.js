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
      var looksLikeLang =
        text === 'EN' || text === 'ES' || text === 'RU' || text === 'RUS' || text === 'РУ' || text === 'РУС' ||
        /(^|\/)(ru|en|es)(\/|$)/i.test(href) ||
        (a.getAttribute('hreflang') && /^(ru|en|es)/i.test(a.getAttribute('hreflang'))) ||
        (a.getAttribute('lang') && /^(ru|en|es)/i.test(a.getAttribute('lang')));

      if (!looksLikeLang) {
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
