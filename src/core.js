export const STORAGE_KEY = 'examforge:v1';

export const starterQuestions = [
  { id: 'starter-1', topic: 'HTML', prompt: 'Which HTML element gives the main content of a page a semantic landmark?', options: ['<div>', '<main>', '<span>', '<section>'], answer: 1, explanation: '<main> identifies the dominant content of the document.', sample: true },
  { id: 'starter-2', topic: 'CSS', prompt: 'Which CSS property creates a grid formatting context?', options: ['display: flex', 'position: grid', 'display: grid', 'grid: true'], answer: 2, explanation: 'display: grid turns the element into a grid container.', sample: true },
  { id: 'starter-3', topic: 'Accessibility', prompt: 'What should an informative image’s alt text communicate?', options: ['Its file name', 'Its visual purpose or meaning', 'Every visible pixel', 'Nothing; leave alt empty'], answer: 1, explanation: 'Alt text should convey the information the image adds in context.', sample: true },
  { id: 'starter-4', topic: 'JavaScript', prompt: 'What does Array.prototype.map return?', options: ['A new transformed array', 'The original array changed in place', 'One Boolean value', 'An HTML element'], answer: 0, explanation: 'map calls a function on each item and returns a new array.', sample: true },
  { id: 'starter-5', topic: 'Web basics', prompt: 'What does an HTTP 404 status usually indicate?', options: ['The request succeeded', 'A server is overloaded', 'The requested resource was not found', 'A redirect is required'], answer: 2, explanation: '404 means the server could not find a resource matching the request.', sample: true },
  { id: 'starter-6', topic: 'CSS', prompt: 'Which rule is commonly used to adapt a layout to a narrow screen?', options: ['@media', '@screen', '@responsive', '@viewport'], answer: 0, explanation: 'A CSS @media rule applies styles when its condition matches.', sample: true },
  { id: 'starter-7', topic: 'JavaScript', prompt: 'Which browser feature can store small amounts of text data across visits?', options: ['console.log', 'localStorage', 'setTimeout', 'querySelector'], answer: 1, explanation: 'localStorage stores string values for the current site in the browser.', sample: true },
  { id: 'starter-8', topic: 'Accessibility', prompt: 'Which element best gives an input an accessible name?', options: ['<hr>', '<label>', '<br>', '<small>'], answer: 1, explanation: 'An associated <label> provides an accessible name and a larger click target.', sample: true }
];

export function validQuestion(q) {
  return !!q && typeof q.id === 'string' && q.id.length <= 100
    && typeof q.topic === 'string' && q.topic.length <= 60
    && typeof q.prompt === 'string' && q.prompt.trim().length > 0 && q.prompt.length <= 400
    && Array.isArray(q.options) && q.options.length === 4
    && q.options.every(option => typeof option === 'string' && option.trim().length > 0 && option.length <= 200)
    && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4
    && typeof q.explanation === 'string' && q.explanation.length <= 500;
}

export function makeQuestion({ topic, prompt, options, answer, explanation }, id = crypto.randomUUID()) {
  const question = {
    id,
    topic: String(topic).trim().slice(0, 60) || 'General',
    prompt: String(prompt).trim().slice(0, 400),
    options: options.map(option => String(option).trim().slice(0, 200)),
    answer: Number(answer),
    explanation: String(explanation || '').trim().slice(0, 500),
    sample: false
  };
  if (!validQuestion(question)) throw new Error('Please complete the question and all four answers.');
  return question;
}

export function sampleQuestions(questions, count, rng = Math.random) {
  const copy = [...questions];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(1, Math.min(copy.length, Number(count) || copy.length)));
}

export function scoreSession(questions, answers) {
  const items = questions.map(question => ({
    questionId: question.id,
    topic: question.topic,
    prompt: question.prompt,
    options: [...question.options],
    answer: question.answer,
    explanation: question.explanation,
    chosen: Number.isInteger(answers[question.id]) ? answers[question.id] : null,
    correct: answers[question.id] === question.answer
  }));
  const correct = items.filter(item => item.correct).length;
  return { items, correct, total: items.length, percent: items.length ? Math.round(correct / items.length * 100) : 0 };
}

export function missedIds(attempt) {
  return attempt.items.filter(item => !item.correct).map(item => item.questionId);
}
