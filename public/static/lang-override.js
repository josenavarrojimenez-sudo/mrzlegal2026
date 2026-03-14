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

// Desktop: keep language button text in sync with current route
(function syncDesktopLangButton(){
  function getLang(){ return location.pathname.startsWith('/es') ? 'es' : 'en'; }

  function updateBtn(){
    var lang = getLang();
    var other = lang === 'es' ? 'en' : 'es';
    var otherUp = other.toUpperCase();
    // Find the desktop nav language buttons (NOT inside mobile nav)
    var btns = Array.from(document.querySelectorAll('a, button')).filter(function(el){
      var txt = (el.textContent || '').trim().toUpperCase();
      return (txt === 'EN' || txt === 'ES') && !el.closest('.nav-mobile');
    });
    btns.forEach(function(el){
      // Update href to point to the other language
      var targetPath = other === 'es' ? '/es/' : '/en/';
      if (el.tagName === 'A') el.setAttribute('href', targetPath);
      // The button should show the OTHER language (where you CAN go)
      if (el.textContent.trim().toUpperCase() !== otherUp) {
        el.textContent = otherUp;
      }
    });
  }

  // Run on load and on every route change (Vue Router uses history.pushState)
  updateBtn();
  var _pushState = history.pushState.bind(history);
  history.pushState = function(){
    _pushState.apply(history, arguments);
    setTimeout(updateBtn, 100);
  };
  window.addEventListener('popstate', function(){ setTimeout(updateBtn, 100); });

  // Also watch DOM mutations for Nuxt re-renders
  var obs = new MutationObserver(function(){ updateBtn(); });
  obs.observe(document.documentElement, { subtree: true, childList: true });
})();
