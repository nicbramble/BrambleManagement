(() => {
  'use strict';
  const form = document.querySelector('#newsletter-form');
  if (!form) return;
  const email = form.elements.email;
  const consent = form.elements.consent;
  const button = document.querySelector('#newsletter-submit');
  const feedback = document.querySelector('#newsletter-status');
  const endpoint = window.BRAMBLE_CONFIG?.newsletterEndpoint || '';
  let pending = null;
  const messages = {
    success: 'You’re on the list! Look out for the newsletter in early 2027.',
    duplicate: 'You’re already on the list. Thanks for keeping up!',
    invalid: 'Please enter a valid email address and agree to receive updates.',
    rejected: 'We couldn’t accept that submission. Please wait a moment and try again.',
    busy: 'Signup is busy right now. Please try again later.',
    unavailable: 'We couldn’t subscribe this address. See the privacy policy to contact us.',
    error: 'We couldn’t confirm your signup. Please try again later.'
  };
  const announce = (message, error = false) => {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', error);
  };
  form.elements.started_at.value = String(Date.now());
  if (location.hostname === 'www.bramblemanagement.com' && location.protocol !== 'https:') {
    announce('Please open https://www.bramblemanagement.com to sign up securely.', true);
    return;
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
    announce('Newsletter signup is being set up. Please check back soon.');
    return;
  }
  if (!window.crypto?.getRandomValues) {
    announce('Please use a current browser over HTTPS to sign up.', true);
    return;
  }
  form.action = endpoint;
  button.disabled = false;
  announce('');

  function finish(status) {
    if (!pending) return;
    const current = pending;
    pending = null;
    clearTimeout(current.timer);
    current.frame.remove();
    form.removeAttribute('aria-busy');
    button.disabled = false;
    button.textContent = 'Keep Me Updated';
    const saved = status === 'success' || status === 'duplicate';
    announce(messages[status] || messages.error, !saved);
    if (saved) form.reset();
    form.elements.started_at.value = String(Date.now());
  }

  function isGoogleReply(origin) {
    // HtmlService executes in a Google-controlled sandbox hostname, not the /exec origin.
    return /^https:\/\/(?:script\.googleusercontent\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/.test(origin);
  }

  function belongsToFrame(source, frame) {
    // The response may be nested inside Google's outer iframe. Cross-origin parent
    // references are permitted; no contents of those frames are inspected.
    try {
      for (let depth = 0; source && depth < 6; depth += 1) {
        if (source === frame.contentWindow) return true;
        if (source === source.parent) return false;
        source = source.parent;
      }
    } catch (_) { return false; }
    return false;
  }

  window.addEventListener('message', event => {
    const data = event.data;
    if (!pending || !isGoogleReply(event.origin) || !belongsToFrame(event.source, pending.frame)) return;
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'requestId,status,type') return;
    if (data.type !== 'bramble-newsletter' || data.requestId !== pending.id || !Object.hasOwn(messages, data.status)) return;
    finish(data.status);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (pending) return;
    email.value = email.value.trim().toLowerCase();
    email.removeAttribute('aria-invalid');
    consent.removeAttribute('aria-invalid');
    if (!email.checkValidity() || !email.value || /^[=+\-@]/.test(email.value)) {
      email.setAttribute('aria-invalid', 'true');
      announce('Please enter a valid email address.', true);
      email.focus();
      return;
    }
    if (!consent.checked) {
      consent.setAttribute('aria-invalid', 'true');
      announce('Please agree to receive email updates before signing up.', true);
      consent.focus();
      return;
    }
    if (Date.now() - Number(form.elements.started_at.value) < 2500) {
      announce(messages.rejected, true);
      return;
    }
    const id = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    const frame = document.createElement('iframe');
    frame.name = `newsletter-${id}`;
    frame.title = 'Newsletter submission response';
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.referrerPolicy = 'no-referrer';
    document.body.append(frame);
    form.target = frame.name;
    form.elements.request_id.value = id;
    pending = {id, frame, timer: setTimeout(() => finish('error'), 25000)};
    button.disabled = true;
    button.textContent = 'Saving…';
    form.setAttribute('aria-busy', 'true');
    announce('Saving your signup…');
    try {
      HTMLFormElement.prototype.submit.call(form);
    } catch (_) {
      finish('error');
    }
  });
})();
