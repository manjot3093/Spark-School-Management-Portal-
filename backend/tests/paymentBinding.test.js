const test = require('node:test');
const assert = require('node:assert/strict');
const { validPaymentBinding } = require('../utils/paymentBinding');

test('rejects a signed payment attached to a different product or user', () => {
  const order = { id: 'order_1', amount: 2500, currency: 'INR', notes: { type: 'product', productId: 'item_1', quantity: '1', userId: 'user_1' } };
  const payment = { order_id: 'order_1', amount: 2500, currency: 'INR', status: 'captured' };
  assert.equal(validPaymentBinding(order, payment, { orderId: 'order_1', type: 'product', itemId: 'item_2', quantity: 1, userId: 'user_1' }), false);
  assert.equal(validPaymentBinding(order, payment, { orderId: 'order_1', type: 'product', itemId: 'item_1', quantity: 1, userId: 'user_2' }), false);
  assert.equal(validPaymentBinding(order, payment, { orderId: 'order_1', type: 'product', itemId: 'item_1', quantity: 1, userId: 'user_1' }), true);
});

test('rejects mismatched payment amount or order', () => {
  const order = { id: 'order_1', amount: 2500, currency: 'INR', notes: { type: 'course', courseId: 'course_1', userId: 'user_1' } };
  const request = { orderId: 'order_1', type: 'course', itemId: 'course_1', quantity: 1, userId: 'user_1' };
  assert.equal(validPaymentBinding(order, { order_id: 'order_1', amount: 100, currency: 'INR', status: 'captured' }, request), false);
  assert.equal(validPaymentBinding(order, { order_id: 'other', amount: 2500, currency: 'INR', status: 'captured' }, request), false);
});
