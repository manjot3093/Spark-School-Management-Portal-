const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQuestions } = require('../controllers/questionPaperController');

test('paper questions must exactly total requested marks', () => {
  const valid = [{ text: 'Explain a concept', marks: 5, answer: 'A clear explanation' }];
  assert.equal(parseQuestions(valid, 5)?.length, 1);
  assert.equal(parseQuestions(valid, 10), null);
  assert.equal(parseQuestions([{ ...valid[0], marks: { $gt: 0 } }], 5), null);
  assert.equal(parseQuestions([{ ...valid[0], answer: '' }], 5), null);
});
