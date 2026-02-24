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
          .replace(fromDisenadoPor, 'DISEÑADO POR ' + creditName);
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
