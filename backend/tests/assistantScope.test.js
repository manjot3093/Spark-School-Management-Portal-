const test = require('node:test');
const assert = require('node:assert/strict');
const { conversationScope } = require('../services/assistantScope');

test('conversation scope is always tied to authenticated school and user', () => {
  const schoolId = '507f1f77bcf86cd799439011';
  const userId = '507f191e810c19729de860ea';
  assert.deepEqual(conversationScope({ schoolId, _id: userId }), { schoolId, userId });
  assert.equal(conversationScope({ schoolId: { $ne: null }, _id: userId }), null);
  assert.equal(conversationScope({ _id: userId }), null);
});
