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

  // Parse a price string handling both US ($1,299.99) and EU (1.299,99) formats
  function parsePrice(text) {
    const s = String(text ?? '').trim().replace(/[^\d.,]/g, '');
    if (!s) return null;
    const lastDot   = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const norm = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')   // EU: comma is decimal
      : s.replace(/,/g, '');                      // US: dot is decimal
    const p = parseFloat(norm);
    return !isNaN(p) && p > 0 ? p : null;
  }

  // DOM-based price extraction: microdata then Amazon buy-box selectors
  function extractPriceFromDom() {
    // schema.org microdata — works on many e-commerce sites
    for (const micro of document.querySelectorAll('[itemprop="price"]')) {
      const p = parsePrice(micro.getAttribute('content') || micro.textContent);
      if (p !== null) return p;
    }

    // Amazon buy-box — ordered from most to least specific
    const amazonSelectors = [
      '.priceToPay .a-offscreen',
      '#corePriceDisplay_desktop_feature_div .a-offscreen',
      '#corePrice_feature_div .a-offscreen',
      '.a-price[data-a-color="base"] .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
    ];
    for (const sel of amazonSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const p = parsePrice(el.textContent);
        if (p !== null) return p;
      }
    }

    return null;
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
            const p = parsePrice(String(offer?.price ?? ''));
            if (p !== null) { price = p; break; }
          }
        } else if (type === 'Offer' && node.price != null) {
          const p = parsePrice(String(node.price));
          if (p !== null) price = p;
        }
      });
    });
    if (price === null) {
      const og = getMetaContent('og:price:amount');
      if (og) { const p = parsePrice(og); if (p !== null) price = p; }
    }
    if (price === null) price = extractPriceFromDom();

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
