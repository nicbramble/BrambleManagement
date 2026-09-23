// Text escaping does not make javascript: links safe. Validate protocols separately.
window.brambleSafeUrl = function(value, {image = false, fallback = '#'} = {}) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  if (image && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    if (url.username || url.password) return fallback;
    if (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin)) return url.href;
  } catch (_) { /* Invalid URL: return the safe fallback. */ }
  return fallback;
};
