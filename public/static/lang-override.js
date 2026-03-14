(function () {
  const MAX_ATTEMPTS = 20
  const INTERVAL_MS = 300

  const normalize = (value) => (value || '').trim().toLowerCase()

  const replaceRuLink = (link) => {
    if (!link) return false
    const text = normalize(link.textContent)
    if (text !== 'ru' && text !== 'rus' && text !== 'рус') return false

    const className = link.className || ''
    let href = (link.getAttribute('href') || '/es/').replace(/\/ru\//g, '/es/')
    if (!href.includes('/es')) {
      href = '/es/'
    }

    const esLink = document.createElement('a')
    esLink.className = className
    esLink.textContent = 'ES'
    esLink.setAttribute('href', href)
    esLink.setAttribute('title', 'Español')
    esLink.setAttribute('aria-label', 'Español')

    link.insertAdjacentElement('afterend', esLink)
    link.remove()
    return true
  }

  const run = () => {
    let replaced = false

    const headerLinks = document.querySelectorAll('header a, header .header a, header .nav a, header .nav-mobile a')
    headerLinks.forEach((link) => {
      if (replaceRuLink(link)) {
        replaced = true
      }
    })

    if (!replaced) {
      const allLinks = document.querySelectorAll('a')
      allLinks.forEach((link) => {
        if (replaceRuLink(link)) {
          replaced = true
        }
      })
    }

    return replaced
  }

  const observer = new MutationObserver(() => run())
  const start = () => {
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true })
    run()

    let attempts = 0
    const timer = setInterval(() => {
      run()
      attempts += 1
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer)
      }
    }, INTERVAL_MS)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()

// Desktop: fix language button href to ensure correct navigation
(function syncDesktopLangButton(){
  function fixBtns(){
    var isEs = location.pathname.startsWith('/es');
    // Point lang button to correct destination — don't change text (let Nuxt handle that)
    var btns = Array.from(document.querySelectorAll('a')).filter(function(el){
      var txt = (el.textContent || '').trim().toUpperCase();
      return (txt === 'EN' || txt === 'ES') && !el.closest('.nav-mobile');
    });
    btns.forEach(function(el){
      var dest = isEs ? '/en/' : '/es/';
      el.setAttribute('href', dest);
    });
  }

  // Run after load + on route changes only
  setTimeout(fixBtns, 500);
  var _push = history.pushState.bind(history);
  history.pushState = function(){ _push.apply(history, arguments); setTimeout(fixBtns, 300); };
  window.addEventListener('popstate', function(){ setTimeout(fixBtns, 300); });
})();

// Force full page reload on language switch — capture phase beats Vue Router
(function forceHardLangSwitch(){
  document.addEventListener('click', function(e){
    var el = e.target;
    for (var i = 0; i < 4; i++) {
      if (!el || el === document.body) break;
      var txt = (el.textContent || '').trim().toUpperCase();
      var href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
      var isLangEl = /^(EN|ES)$/.test(txt) ||
                     (href.match(/^\/(en|es)\/?$/) !== null);
      if (isLangEl) {
        e.preventDefault();
        e.stopPropagation();
        var dest = location.pathname.startsWith('/es') ? '/en/' : '/es/';
        // Small delay ensures preventDefault is processed before assign
        setTimeout(function(){ window.location.assign(dest); }, 0);
        return;
      }
      el = el.parentElement;
    }
  }, true); // true = capture phase, fires BEFORE Vue Router
})();
