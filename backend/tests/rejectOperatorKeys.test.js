const test = require('node:test');
const assert = require('node:assert/strict');
const { hasOperatorKeys } = require('../middleware/rejectOperatorKeys');

test('rejects nested MongoDB operators and dotted paths', () => {
  assert.equal(hasOperatorKeys({ filter: { schoolId: { $ne: null } } }), true);
  assert.equal(hasOperatorKeys({ 'role.admin': true }), true);
  assert.equal(hasOperatorKeys({ subjects: [{ name: 'Math' }] }), false);
});
