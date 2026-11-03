'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {prices, stripeUrl} = require('../review-cards.js');
test('pack prices match the Stripe offers', () => {
  assert.deepEqual(prices, {10: 25, 15: 35, 20: 50});
});
test('checkout links must be Stripe hosted HTTPS links', () => {
  assert.equal(stripeUrl('https://buy.stripe.com/example'), 'https://buy.stripe.com/example');
  assert.equal(stripeUrl('https://buy.stripe.com.evil.example/example'), '');
  assert.equal(stripeUrl('javascript:alert(1)'), '');
});
