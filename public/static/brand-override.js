(function () {
  const to = 'MRZ LEGAL';
  const fromDomain = /krivitskiy\.com/gi;
  const fromName = /krivitskiy/gi;
  const fromHero = /\bkrivitsky\b/gi;

  // Footer credit / badge replacement
  const creditName = 'JOSE NAVARRO';
  const creditUrl = 'https://www.linkedin.com/in/josenavarroj';
  const fromArtBadge = /\bART\.\s*LEBEDEV\b/gi;
  const fromDesignedBy = /Designed\s+by\s+Art\.?\s*Lebedev\s*Studio/gi;
  const fromDisenadoPor = /DISEÑADO\s+POR\s+ART\.?\s*ESTUDIO\s*LEBEDEV/gi;

  const paragraphStart = 'Regional projects hold significant importance';
  const paragraphReplacement =
    'Regional projects hold significant importance for us. We are committed to boarding the first available flight, regardless of weather, to reach your desired location. Tasks may be spread across various cities in Costa Rica at the same time.';

  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();

  const replaceParagraph = () => {
    const targeted = document.querySelectorAll('div.description p');
    if (targeted.length) {
      targeted.forEach((paragraph) => {
        const text = normalize(paragraph.textContent);
        if (!text) return;
        if (text.includes(paragraphStart)) {
          paragraph.textContent = paragraphReplacement;
        }
      });
      return;
    }
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach((paragraph) => {
      const text = normalize(paragraph.textContent);
      if (!text) return;
      if (text.includes(paragraphStart) && (text.includes('Sochi') || text.includes('Sakhalin') || text.includes('Russia'))) {
        paragraph.textContent = paragraphReplacement;
      }
    });
  };

  const replaceText = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const v = node.nodeValue || '';
      if (
        fromDomain.test(v) ||
        fromName.test(v) ||
        fromHero.test(v) ||
        fromArtBadge.test(v) ||
        fromDesignedBy.test(v) ||
        fromDisenadoPor.test(v)
      ) {
        node.nodeValue = v
          .replace(fromDomain, to)
          .replace(fromName, to)
          .replace(fromHero, to)
          .replace(fromArtBadge, creditName)
          .replace(fromDesignedBy, 'Designed by ' + creditName)
          .replace(fromDisenadoPor, 'DISEÑADO POR ' + creditName)
          .replace(/\bESTUDIO\s+JOSE\s+NAVARRO\b/gi, creditName);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = node;
    ['alt', 'title', 'aria-label', 'placeholder'].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (!value) return;
      if (
        fromDomain.test(value) ||
        fromName.test(value) ||
        fromHero.test(value) ||
        fromArtBadge.test(value) ||
        fromDesignedBy.test(value) ||
        fromDisenadoPor.test(value)
      ) {
        el.setAttribute(
          attr,
          value
            .replace(fromDomain, to)
            .replace(fromName, to)
            .replace(fromHero, to)
            .replace(fromArtBadge, creditName)
            .replace(fromDesignedBy, 'Designed by ' + creditName)
            .replace(fromDisenadoPor, 'DISEÑADO POR ' + creditName)
            .replace(/\bESTUDIO\s+JOSE\s+NAVARRO\b/gi, creditName)
        );
      }
    });

    // Turn footer credit elements into a link to LinkedIn when we detect the badge/name.
    if (el.tagName === 'A' || el.tagName === 'DIV' || el.tagName === 'SPAN') {
      const t = (el.textContent || '').trim();
      if (fromArtBadge.test(t) || fromDesignedBy.test(t) || fromDisenadoPor.test(t) || t === creditName) {
        // If it's already an <a>, just rewrite href.
        const anchor = el.tagName === 'A' ? el : el.closest('a');
        if (anchor) {
          anchor.setAttribute('href', creditUrl);
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');
        }
      }
    }
    el.childNodes.forEach(replaceText);
  };

  const fixAlsFooterCredit = () => {
    // Deterministic fix for the footer credit link text.
    // User-provided selector:
    // #__layout > div > div.wrapper.dark.fullheight > div > div.bodySlides > div.frame.frame-footer > div.footer--als > span:nth-child(1) > a
    const creditLink = document.querySelector(
      '#__layout > div > div.wrapper.dark.fullheight > div > div.bodySlides > div.frame.frame-footer > div.footer--als > span:nth-child(1) > a'
    );
    if (!creditLink) return;

    const normalizeSpaces = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const txtRaw = creditLink.textContent || '';
    const txt = normalizeSpaces(txtRaw);

    // Remove any leading "Estudio José Navarro" (accent-insensitive) and any duplicates.
    // Examples seen: "Estudio José NavarroJosé Navarro"
    const cleaned = normalizeSpaces(
      txt
        .replace(/\bEstudio\s+Jos[eé]\s+Navarro\b/gi, '')
        .replace(/\bESTUDIO\s+JOSE\s+NAVARRO\b/gi, '')
    );

    if (!cleaned || /Jos[eé]\s+Navarro/i.test(cleaned)) {
      creditLink.textContent = creditName;
    } else {
      creditLink.textContent = creditName;
    }

    // Always enforce LinkedIn destination and accessibility.
    creditLink.setAttribute('href', creditUrl);
    creditLink.setAttribute('target', '_blank');
    creditLink.setAttribute('rel', 'noopener noreferrer');
    creditLink.setAttribute('aria-label', creditName);
    creditLink.setAttribute('title', creditName);

    // Extra safety: if there is any sibling node with the "Estudio José Navarro" text, remove it.
    const parent = creditLink.parentElement;
    if (parent) {
      Array.from(parent.childNodes).forEach((n) => {
        if (n === creditLink) return;
        const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (/\bEstudio\s+Jos[eé]\s+Navarro\b/i.test(t) || /\bESTUDIO\s+JOSE\s+NAVARRO\b/i.test(t)) {
          n.textContent = '';
        }
      });
    }
  };

  const injectJoseNavarroBadge = () => {
    // Replace Art Lebedev SVG badge (often injected after hydration) with a clickable JOSE NAVARRO badge.
    const svg = document.querySelector('#ALS_logo_svg');
    if (!svg) return;

    // Avoid duplicating
    if (document.getElementById('mrz-jose-navarro-badge')) return;

    const parent = svg.parentElement;
    if (!parent) return;

    // Hide the original SVG
    svg.style.display = 'none';

    const a = document.createElement('a');
    a.id = 'mrz-jose-navarro-badge';
    a.href = creditUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = creditName;

    // Try to mimic the badge style (white box, black text, condensed/uppercase)
    a.style.display = 'inline-flex';
    a.style.alignItems = 'center';
    a.style.justifyContent = 'center';
    a.style.background = '#fff';
    a.style.color = '#000';
    a.style.textTransform = 'uppercase';
    a.style.letterSpacing = '0.06em';
    a.style.fontSize = '12px';
    a.style.lineHeight = '1';
    a.style.padding = '6px 10px';
    a.style.border = '0';

    // If the old badge had a link wrapper, repoint it.
    const existingAnchor = parent.closest('a');
    if (existingAnchor) {
      existingAnchor.href = creditUrl;
      existingAnchor.target = '_blank';
      existingAnchor.rel = 'noopener noreferrer';
      // Place our badge inside the same anchor for consistent layout
      existingAnchor.appendChild(a);
    } else {
      parent.appendChild(a);
    }
  };

  const run = () => {
    replaceText(document.body);
    replaceParagraph();
    injectJoseNavarroBadge();
    fixAlsFooterCredit();
    if (document.title) {
      document.title = document.title
        .replace(fromDomain, to)
        .replace(fromName, to)
        .replace(fromHero, to)
        .replace(fromArtBadge, creditName);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        replaceText(mutation.target);
      }
      mutation.addedNodes.forEach(replaceText);
    });
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });

  // Nuxt may replace large chunks of DOM after hydration.
  // Re-run a few times shortly after load to ensure hero titles are updated.
  let attempts = 0;
  const interval = setInterval(() => {
    run();
    attempts += 1;
    if (attempts >= 10) {
      clearInterval(interval);
    }
  }, 500);
})();

// Force kill any stale service workers
(function(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){ r.unregister(); });
    });
  }
  if ('caches' in window) {
    caches.keys().then(function(names){
      names.forEach(function(name){ caches.delete(name); });
    });
  }
})();


// Swipe hint: reposition to bottom-left, next to (not on top of) the Solve Problem button
(function fixSwipeHint(){
  // Inject CSS to reposition — never hide
  var style = document.getElementById('mrz-swipe-pos') || document.createElement('style');
  style.id = 'mrz-swipe-pos';
  style.textContent = '@media (max-width:900px){#mrz-swipe-hint{display:block !important;visibility:visible !important;position:fixed !important;left:16px !important;bottom:20px !important;transform:none !important;right:auto !important;}}';
  if (!document.getElementById('mrz-swipe-pos')) document.head.appendChild(style);
})();

// Hide swipe hint when mobile menu is open, show when closed
(function swipeHintMenuToggle(){
  var style = document.getElementById('mrz-swipe-menu') || document.createElement('style');
  style.id = 'mrz-swipe-menu';
  // Hide when nav-mobile has --opened modifier or body has menu-open class
  style.textContent = [
    '.nav-mobile--opened ~ * #mrz-swipe-hint,',
    '.nav-mobile--opened #mrz-swipe-hint,',
    'body.menu-open #mrz-swipe-hint,',
    'body.nav-open #mrz-swipe-hint,',
    '[class*="nav-mobile--open"] #mrz-swipe-hint { display: none !important; }'
  ].join('\n');
  if (!document.getElementById('mrz-swipe-menu')) document.head.appendChild(style);

  // Also watch DOM for the menu opening (class changes on nav element)
  var observer = new MutationObserver(function(){
    var hint = document.getElementById('mrz-swipe-hint');
    if (!hint) return;
    var menuOpen = document.querySelector('.nav-mobile--opened, .nav--opened, [class*="nav-mobile--open"]');
    hint.style.display = menuOpen ? 'none' : '';
  });
  observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();

// Detect menu open/close via click on hamburger and class observation
(function swipeHintMenuV2(){
  var hidden = false;

  function getHint(){ return document.getElementById('mrz-swipe-hint'); }

  function hideHint(){
    hidden = true;
    var h = getHint(); if(h) h.style.setProperty('display','none','important');
  }
  function showHint(){
    // Delay showing hint so it doesn't flash during menu close/navigation
    setTimeout(function(){
      hidden = false;
      var h = getHint(); if(h) h.style.removeProperty('display');
    }, 800);
  }
  function checkMenuState(){
    // Any element with class containing "opened" or "open" that's nav-related
    var open = document.querySelector(
      '.nav-mobile.nav-mobile--opened,' +
      '.header--menu-open,' +
      '[class*="nav"][class*="open"],' +
      '[class*="menu"][class*="open"],' +
      '[class*="burger"][class*="active"],' +
      '[class*="hamburger"][class*="active"]'
    );
    if (open && !hidden) hideHint();
    else if (!open && hidden) showHint();
  }

  // Watch ALL class changes on the whole page
  var obs = new MutationObserver(checkMenuState);

  function init(){
    obs.observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:['class','style']});
    // Also listen for clicks anywhere — if hint is visible and menu opens, it'll be caught by observer
    document.addEventListener('click', function(){ setTimeout(checkMenuState, 50); }, true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Lang switcher in mobile nav: hide bottom duplicate, keep only one in nav list
(function fixMobileLangSwitcher(){
  var done = false;
  function run(){
    if (done) return;
    var navList = document.querySelector('.nav-mobile__list, .nav-mobile .nav-list');
    if (!navList) return;

    // Find ALL lang links (EN/ES) inside the mobile nav
    var allLangLinks = Array.from(document.querySelectorAll('.nav-mobile a, .nav-mobile button')).filter(function(el){
      return /^(EN|ES)$/i.test((el.textContent || '').trim());
    });
    if (!allLangLinks.length) return;

    // Hide all of them from their current location
    allLangLinks.forEach(function(el){
      var li = el.closest('li');
      if (li) li.style.display = 'none'; else el.style.display = 'none';
    });

    // Add ONE clean item to the nav list after Contacts
    if (navList.querySelector('.mrz-lang-nav')) return; // already added
    var ref = allLangLinks[0];
    var newLink = ref.cloneNode(true);
    newLink.style.display = '';
    newLink.style.color = '';
    var li = document.createElement('li');
    li.className = (navList.querySelector('li') ? navList.querySelector('li').className : 'nav-list__item') + ' mrz-lang-nav';
    li.appendChild(newLink);
    navList.appendChild(li);
    done = true;
  }

  var attempts = 0;
  var iv = setInterval(function(){ run(); if(++attempts > 20 || done) clearInterval(iv); }, 300);
  document.addEventListener('click', function(){ setTimeout(run, 150); }, true);
})();
