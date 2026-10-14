import test from 'node:test';
import assert from 'node:assert/strict';
import { starterQuestions, makeQuestion, validQuestion, sampleQuestions, scoreSession, missedIds } from '../src/core.js';

test('starter bank is usable and unique', () => {
  assert.equal(starterQuestions.every(validQuestion), true);
  assert.equal(new Set(starterQuestions.map(q => q.id)).size, starterQuestions.length);
});

test('question validation catches incomplete options', () => {
  assert.throws(() => makeQuestion({ topic: 'Math', prompt: '2+2?', options: ['4', '', '5', '6'], answer: 0 }), /complete/);
  assert.equal(makeQuestion({ topic: 'Math', prompt: '2+2?', options: ['4', '3', '5', '6'], answer: 0 }, 'x').id, 'x');
});

test('scoring preserves a review snapshot and finds misses', () => {
  const questions = starterQuestions.slice(0, 2);
  const result = scoreSession(questions, { 'starter-1': 1, 'starter-2': 0 });
  assert.deepEqual([result.correct, result.total, result.percent], [1, 2, 50]);
  assert.deepEqual(missedIds(result), ['starter-2']);
  assert.equal(result.items[1].chosen, 0);
});

test('selection is bounded and does not mutate the bank', () => {
  const bank = starterQuestions.slice();
  const selection = sampleQuestions(bank, 3, () => 0);
  assert.equal(selection.length, 3);
  assert.deepEqual(bank, starterQuestions);
});
