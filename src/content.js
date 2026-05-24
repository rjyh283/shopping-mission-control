(function () {
  'use strict';

  function getMetaContent(name) {
    const meta =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.content.trim() : null;
  }

  function parseJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const data = [];
    scripts.forEach(script => {
      try {
        data.push(JSON.parse(script.textContent));
      } catch (_) {}
    });
    return data;
  }

  function traverseJsonLd(obj, callback) {
    if (!obj || typeof obj !== 'object') return;
    callback(obj);
    if (Array.isArray(obj)) {
      obj.forEach(child => traverseJsonLd(child, callback));
    } else if (Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(child => traverseJsonLd(child, callback));
    }
  }

  function extractPageData() {
    const ogTitle      = getMetaContent('og:title');
    const twitterTitle = getMetaContent('twitter:title');
    const title        = ogTitle || twitterTitle || document.title;

    const ogUrl        = getMetaContent('og:url');
    const canonical    = document.querySelector('link[rel="canonical"]');
    const url          = ogUrl || canonical?.href || window.location.href;

    const jsonLdData   = parseJsonLd();

    // Price: JSON-LD Product/Offer → og:price:amount
    let price = null;
    jsonLdData.forEach(obj => {
      traverseJsonLd(obj, node => {
        if (price !== null) return;
        const type = node['@type'];
        if (type === 'Product' && node.offers) {
          const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
          for (const offer of offers) {
            const p = parseFloat(offer?.price);
            if (!isNaN(p)) { price = p; break; }
          }
        } else if (type === 'Offer' && node.price != null) {
          const p = parseFloat(node.price);
          if (!isNaN(p)) price = p;
        }
      });
    });
    if (price === null) {
      const og = getMetaContent('og:price:amount');
      if (og) { const p = parseFloat(og); if (!isNaN(p)) price = p; }
    }

    // Image: og:image → JSON-LD image
    const ogImage = getMetaContent('og:image');
    let jsonLdImage = null;
    jsonLdData.forEach(obj => {
      traverseJsonLd(obj, node => {
        if (jsonLdImage) return;
        const img = node.image;
        if (!img) return;
        if (typeof img === 'string') jsonLdImage = img;
        else if (typeof img === 'object') jsonLdImage = img.url || img['@url'] || null;
      });
    });
    const imageUrl = ogImage || jsonLdImage || null;

    return { title, url, price, imageUrl };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'extractPageData') {
      sendResponse(extractPageData());
      return true;
    }
  });
})();
