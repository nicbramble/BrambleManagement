'use strict';
(function (global) {
  const prices = { 10: 25, 15: 35, 20: 50 };
  function stripeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'buy.stripe.com' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function render() {
    const status = document.querySelector('#review-offer-status');
    if (!status) return;
    status.textContent = 'Choose the pack that works for your business.';
    document.querySelectorAll('.review-pack').forEach(pack => {
      const quantity = Number(pack.dataset.pack);
      const price = prices[quantity];
      if (!price) return;
      pack.querySelector('.review-pack-price').textContent = '$' + price;
      pack.querySelector('.review-pack-rate').textContent = '$' + (price / quantity).toFixed(2) + ' per card';
      const link = pack.querySelector('.review-buy');
      const url = stripeUrl(global.BRAMBLE_CONFIG?.reviewCardCheckout?.[quantity]);
      link.hidden = !url;
      if (url) link.href = url; else link.removeAttribute('href');
      pack.querySelector('.review-checkout-unavailable').hidden = !!url;
    });
  }
  if (typeof module !== 'undefined') module.exports = { prices, stripeUrl };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', render);
})(typeof window !== 'undefined' ? window : globalThis);
