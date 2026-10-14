import { STORAGE_KEY, starterQuestions, validQuestion, makeQuestion, sampleQuestions, scoreSession, missedIds } from './core.js';

const main = document.querySelector('#main');
const nav = document.querySelector('#main-nav');
const dialog = document.querySelector('#question-dialog');
const form = document.querySelector('#question-form');
const toast = document.querySelector('#toast');
let state = load();
let view = state.session ? 'test' : 'overview';
let selectedAttempt = null;
let searchTerm = '';
let timer;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (data && Array.isArray(data.questions) && data.questions.every(validQuestion)) return {
      questions: data.questions.slice(0, 1000),
      attempts: Array.isArray(data.attempts) ? data.attempts.filter(a => a && Array.isArray(a.items) && Number.isInteger(a.correct)).slice(0, 100) : [],
      session: data.session && Array.isArray(data.session.questions) && data.session.questions.every(validQuestion) && data.session.questions.length && data.session.questions.length <= 1000 ? data.session : null
    };
  } catch { /* A fresh local state is safer than broken data. */ }
  return { questions: starterQuestions.map(q => ({ ...q, options: [...q.options] })), attempts: [], session: null };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { showToast('Storage is unavailable. Export your question bank before leaving.'); }
}
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function showToast(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toast._timer); toast._timer = setTimeout(() => { toast.hidden = true; }, 4000); }
function download(filename, contents) { const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function dateLabel(iso) { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }

function render() {
  clearInterval(timer);
  nav.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.querySelector('.header-cta').hidden = view === 'test';
  if (view === 'overview') renderOverview();
  if (view === 'bank') renderBank();
  if (view === 'history') renderHistory();
  if (view === 'test') renderTest();
  if (view === 'result') renderResult();
}

function renderOverview() {
  const last = state.attempts[0];
  const best = state.attempts.length ? Math.max(...state.attempts.map(a => a.percent)) : null;
  main.innerHTML = `<div class="overview"><div class="eyebrow"><span class="eyebrow-line"></span> YOUR STUDY DESK</div><section class="hero"><div class="hero-copy"><span class="hero-kicker">PRACTICE MAKES PROGRESS</span><h1>Know more.<br><em>Guess less.</em></h1><p>Build a bank of questions, put yourself to the test, and give every wrong answer a second chance.</p><button class="hero-button" type="button" data-scroll-setup>Start a practice test <span aria-hidden="true">↗</span></button></div><div class="hero-art" aria-hidden="true"><div class="art-circle c1"></div><div class="art-circle c2"></div><div class="art-circle c3"></div><div class="art-card"><span>01 / 08</span><strong>What do you<br>know today<span>?</span></strong><div class="art-answer">A <i></i></div><div class="art-answer chosen">B <i>✓</i></div><div class="art-answer">C <i></i></div></div><span class="art-spark">✳</span></div></section>
    ${state.session ? `<div class="resume-card"><div><strong>You have a test in progress.</strong><p>${Object.keys(state.session.answers).length} of ${state.session.questions.length} questions answered</p></div><button type="button" data-resume>Resume test →</button></div>` : ''}
    <section class="stats-row"><div class="stat"><span>01 / QUESTION BANK</span><strong>${state.questions.length}</strong><small>questions ready to practice</small></div><div class="stat"><span>02 / PRACTICE SESSIONS</span><strong>${state.attempts.length}</strong><small>tests completed</small></div><div class="stat"><span>03 / PERSONAL BEST</span><strong>${best === null ? '—' : `${best}%`}</strong><small>${best === null ? 'ready when you are' : 'your highest score so far'}</small></div></section>
    <section class="setup-section" id="test-setup"><div class="section-title"><div><span class="eyebrow small">PUT YOUR KNOWLEDGE TO WORK</span><h2>Set up your session.</h2></div><p>One focused test can show you exactly what to revisit.</p></div><div class="setup-card"><div class="setup-intro"><div class="setup-icon">✳</div><div><h3>Practice test</h3><p>Questions are shuffled each time. Answer at your own pace or set a timer.</p></div></div><div class="setup-controls"><label>Questions<select id="question-count"><option value="5">5 questions</option><option value="10">10 questions</option><option value="all">All questions</option></select></label><label>Time limit<select id="time-limit"><option value="0">No timer</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="20">20 minutes</option></select></label><button type="button" class="dark-button" data-start="all" ${state.questions.length ? '' : 'disabled'}>Begin test <span aria-hidden="true">→</span></button></div></div>
    ${last && missedIds(last).some(id => state.questions.some(q => q.id === id)) ? `<div class="missed-card"><div class="missed-number">↺</div><div><strong>Turn misses into momentum.</strong><p>Retry the questions you missed in your latest test.</p></div><button type="button" data-start="missed">Practice missed <span aria-hidden="true">↗</span></button></div>` : ''}</section><div class="overview-bottom"><div><span class="eyebrow small">MAKE IT YOURS</span><h2>Better questions.<br>Better answers.</h2><p>The sample bank is only a starting point. Add questions from your own notes and practice what matters to you.</p><button type="button" class="underlined-button" data-view="bank">Explore your question bank <span aria-hidden="true">↗</span></button></div><div class="bottom-number" aria-hidden="true">?</div></div></div>`;
}

function questionCard(q, index) {
  return `<article class="question-card"><div class="question-number">${String(index + 1).padStart(2, '0')}</div><div class="question-copy"><div class="question-meta"><span class="topic-pill">${esc(q.topic)}</span>${q.sample ? '<span class="sample-pill">STARTER</span>' : ''}</div><h3>${esc(q.prompt)}</h3><p>Correct answer: <strong>${'ABCD'[q.answer]}. ${esc(q.options[q.answer])}</strong></p></div><div class="question-actions"><button type="button" data-edit="${esc(q.id)}" aria-label="Edit question">Edit</button><button type="button" data-delete="${esc(q.id)}" aria-label="Delete question">Delete</button></div></article>`;
}

function renderBank() {
  main.innerHTML = `<div class="page-head"><div class="eyebrow"><span class="eyebrow-line"></span> YOUR MATERIAL</div><div class="page-title-row"><div><h1>Question bank<span class="accent-dot">.</span></h1><p>Shape the questions that shape your understanding.</p></div><button class="dark-button" type="button" data-new-question>＋ Add question</button></div></div><div class="bank-tools"><label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">Search questions</span><input id="search" type="search" placeholder="Search your questions or topics…" value="${esc(searchTerm)}"></label><span>${state.questions.length} total</span></div><div id="bank-list" class="bank-list"></div><div class="bank-footer"><p>Questions live on this device. Export a backup to keep them safe.</p><div><button type="button" data-import>Import bank</button><button type="button" data-export>Export bank ↗</button></div></div>`;
  renderBankList();
}
function renderBankList() {
  const filtered = state.questions.filter(q => `${q.topic} ${q.prompt} ${q.options.join(' ')}`.toLowerCase().includes(searchTerm.toLowerCase()));
  document.querySelector('#bank-list').innerHTML = filtered.length ? filtered.map(questionCard).join('') : `<div class="empty-state"><span>✳</span><h2>No questions found.</h2><p>${state.questions.length ? 'Try a different search.' : 'Add your first question to build a study bank.'}</p><button type="button" data-new-question>Add a question ↗</button></div>`;
}

function renderHistory() {
  main.innerHTML = `<div class="page-head"><div class="eyebrow"><span class="eyebrow-line"></span> THE LEARNING CURVE</div><div class="page-title-row"><div><h1>Session history<span class="accent-dot">.</span></h1><p>See what you know, and what is worth another look.</p></div></div></div>${state.attempts.length ? `<div class="history-list">${state.attempts.map((attempt, i) => `<button type="button" data-result="${esc(attempt.id)}" class="history-item"><span class="history-index">${String(state.attempts.length - i).padStart(2, '0')}</span><span class="history-main"><strong>${attempt.mode === 'missed' ? 'Missed questions' : 'Practice test'}</strong><small>${dateLabel(attempt.createdAt)} · ${attempt.total} questions · ${Math.max(1, Math.round(attempt.elapsedSeconds / 60))} min</small></span><span class="history-score">${attempt.percent}%</span><span class="history-arrow">↗</span></button>`).join('')}</div>` : `<div class="empty-state history-empty"><span>◎</span><h2>A blank slate is a good start.</h2><p>Complete a practice test and your results will appear here.</p><button type="button" data-view="overview">Set up a test ↗</button></div>`}`;
}

function renderTest() {
  const s = state.session;
  if (!s) { view = 'overview'; render(); return; }
  const q = s.questions[s.index];
  const answered = Object.keys(s.answers).length;
  main.innerHTML = `<div class="test-shell"><div class="test-top"><div><span class="eyebrow small">PRACTICE SESSION</span><h1>Stay curious. Keep going.</h1></div><div class="test-top-right"><span id="timer-display" class="timer-display" aria-live="off">${s.endsAt ? '—' : 'UNTIMED'}</span><button type="button" data-submit-test class="submit-test">Finish test ↗</button></div></div><div class="test-progress"><div style="width:${Math.round((s.index + 1) / s.questions.length * 100)}%"></div></div><div class="test-meta"><span>QUESTION ${String(s.index + 1).padStart(2, '0')} / ${String(s.questions.length).padStart(2, '0')}</span><span>${answered} answered</span></div><section class="test-card"><div class="test-topic">${esc(q.topic)}</div><h2>${esc(q.prompt)}</h2><fieldset><legend>Choose one answer</legend>${q.options.map((option, index) => `<label class="option ${s.answers[q.id] === index ? 'selected' : ''}"><input type="radio" name="answer" value="${index}" ${s.answers[q.id] === index ? 'checked' : ''}><span class="option-letter">${'ABCD'[index]}</span><span>${esc(option)}</span><span class="option-check" aria-hidden="true">✓</span></label>`).join('')}</fieldset></section><div class="test-controls"><button type="button" data-test-prev ${s.index === 0 ? 'disabled' : ''}>← Previous</button><div class="question-dots" aria-label="Question status">${s.questions.map((item, index) => `<button type="button" data-jump="${index}" class="${index === s.index ? 'current' : ''} ${Number.isInteger(s.answers[item.id]) ? 'answered' : ''}" aria-label="Question ${index + 1}${Number.isInteger(s.answers[item.id]) ? ', answered' : ''}">${index + 1}</button>`).join('')}</div><button type="button" data-test-next>${s.index === s.questions.length - 1 ? 'Review answers' : 'Next question →'}</button></div></div>`;
  updateTimer();
  if (state.session && s.endsAt) timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const s = state.session;
  if (!s?.endsAt) return;
  const remaining = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
  const display = document.querySelector('#timer-display');
  if (display) { display.textContent = `◷ ${formatTime(remaining)}`; display.classList.toggle('urgent', remaining < 60); }
  if (remaining === 0) finishTest(true);
}

function renderResult() {
  const attempt = state.attempts.find(a => a.id === selectedAttempt) || state.attempts[0];
  if (!attempt) { view = 'overview'; render(); return; }
  const perfect = attempt.percent === 100;
  main.innerHTML = `<div class="result-page"><div class="eyebrow"><span class="eyebrow-line"></span> SESSION REVIEW</div><div class="result-hero"><div><span class="result-kicker">${perfect ? 'EVERY ANSWER COUNTS' : 'A CLEARER PICTURE'}</span><h1>${perfect ? 'You knew your stuff.' : 'Progress looks good on you.'}</h1><p>${attempt.correct} out of ${attempt.total} correct · ${dateLabel(attempt.createdAt)}</p><button type="button" class="dark-button" data-view="overview">Back to overview ↗</button></div><div class="result-score"><strong>${attempt.percent}<span>%</span></strong><small>YOUR SCORE</small></div></div><div class="review-head"><div><span class="eyebrow small">QUESTION BY QUESTION</span><h2>Learn from the details.</h2></div><span>${attempt.items.filter(item => !item.correct).length} to revisit</span></div><div class="review-list">${attempt.items.map((item, index) => `<article class="review-item ${item.correct ? 'correct' : 'incorrect'}"><div class="review-status">${item.correct ? '✓' : '×'}</div><div><span class="review-meta">${String(index + 1).padStart(2, '0')} / ${esc(item.topic)}</span><h3>${esc(item.prompt)}</h3><p>Your answer: <strong>${item.chosen === null ? 'Not answered' : `${'ABCD'[item.chosen]}. ${esc(item.options[item.chosen])}`}</strong></p>${!item.correct ? `<p>Correct answer: <strong>${'ABCD'[item.answer]}. ${esc(item.options[item.answer])}</strong></p>` : ''}${item.explanation ? `<div class="explanation">${esc(item.explanation)}</div>` : ''}</div></article>`).join('')}</div></div>`;
}

function startTest(mode) {
  if (state.session && !confirm('Start a new test and replace your unfinished one?')) return;
  let pool = state.questions;
  if (mode === 'missed') {
    const ids = new Set(missedIds(state.attempts[0]));
    pool = pool.filter(q => ids.has(q.id));
  }
  if (!pool.length) { showToast('Add questions to your bank first.'); return; }
  const count = mode === 'missed' ? pool.length : document.querySelector('#question-count')?.value || 'all';
  const minutes = mode === 'missed' ? 0 : Number(document.querySelector('#time-limit')?.value || 0);
  state.session = { questions: sampleQuestions(pool, count === 'all' ? pool.length : Number(count)).map(q => ({ ...q, options: [...q.options] })), answers: {}, index: 0, startedAt: Date.now(), endsAt: minutes ? Date.now() + minutes * 60000 : null, mode };
  save(); view = 'test'; render(); main.focus();
}

function finishTest(expired = false) {
  const s = state.session;
  if (!s) return;
  const result = scoreSession(s.questions, s.answers);
  const attempt = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), mode: s.mode, elapsedSeconds: Math.round((Date.now() - s.startedAt) / 1000), ...result };
  state.attempts.unshift(attempt); state.attempts = state.attempts.slice(0, 100); state.session = null;
  save(); selectedAttempt = attempt.id; view = 'result'; render(); main.focus();
  if (expired) showToast('Time is up. Your answers were submitted.');
}

function openQuestion(id = null) {
  const q = state.questions.find(q => q.id === id);
  form.reset(); form.elements.id.value = q?.id || '';
  form.elements.topic.value = q?.topic || '';
  form.elements.prompt.value = q?.prompt || '';
  for (let i = 0; i < 4; i++) form.elements[`option-${i}`].value = q?.options[i] || '';
  form.elements.answer.value = q?.answer ?? 0;
  form.elements.explanation.value = q?.explanation || '';
  document.querySelector('#dialog-title').textContent = q ? 'Edit question' : 'Add a question';
  dialog.showModal();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) { if (state.session && !confirm('Leave this test? Your answers will be saved and you can resume from Overview.')) return; view = button.dataset.view; render(); main.focus(); return; }
  if (button.hasAttribute('data-new-question')) { openQuestion(); return; }
  if (button.hasAttribute('data-close-dialog')) { dialog.close(); return; }
  if (button.dataset.edit) { openQuestion(button.dataset.edit); return; }
  if (button.dataset.delete) {
    const q = state.questions.find(q => q.id === button.dataset.delete);
    if (q && confirm(`Delete “${q.prompt}”?`)) { state.questions = state.questions.filter(item => item.id !== q.id); save(); renderBank(); showToast('Question deleted.'); }
    return;
  }
  if (button.hasAttribute('data-scroll-setup')) { document.querySelector('#test-setup')?.scrollIntoView({ behavior: 'smooth' }); return; }
  if (button.hasAttribute('data-resume')) { view = 'test'; render(); main.focus(); return; }
  if (button.dataset.start) { startTest(button.dataset.start); return; }
  if (button.hasAttribute('data-test-prev')) { state.session.index--; save(); renderTest(); return; }
  if (button.hasAttribute('data-test-next')) { if (state.session.index < state.session.questions.length - 1) { state.session.index++; save(); renderTest(); } else showToast('Use “Finish test” when you are ready to submit.'); return; }
  if (button.dataset.jump !== undefined) { state.session.index = Number(button.dataset.jump); save(); renderTest(); return; }
  if (button.hasAttribute('data-submit-test')) { const unanswered = state.session.questions.length - Object.keys(state.session.answers).length; if (!unanswered || confirm(`Submit now? ${unanswered} question${unanswered === 1 ? '' : 's'} unanswered.`)) finishTest(); return; }
  if (button.dataset.result) { selectedAttempt = button.dataset.result; view = 'result'; render(); main.focus(); return; }
  if (button.hasAttribute('data-export')) { download('examforge-question-bank.json', JSON.stringify({ app: 'ExamForge', version: 1, questions: state.questions }, null, 2)); showToast('Question bank downloaded.'); return; }
  if (button.hasAttribute('data-import')) document.querySelector('#import-file').click();
});

document.addEventListener('input', event => { if (event.target.id === 'search') { searchTerm = event.target.value; renderBankList(); } });
document.addEventListener('change', event => {
  if (event.target.matches('input[name="answer"]') && state.session) {
    state.session.answers[state.session.questions[state.session.index].id] = Number(event.target.value);
    save(); renderTest();
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const id = form.elements.id.value;
    const q = makeQuestion({ topic: form.elements.topic.value, prompt: form.elements.prompt.value, options: Array.from({ length: 4 }, (_, i) => form.elements[`option-${i}`].value), answer: form.elements.answer.value, explanation: form.elements.explanation.value }, id || undefined);
    if (id) state.questions = state.questions.map(item => item.id === id ? q : item);
    else state.questions.unshift(q);
    save(); dialog.close(); view = 'bank'; render(); showToast(id ? 'Question updated.' : 'Question added.');
  } catch (error) { showToast(error.message); }
});

document.querySelector('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('File is too large.');
    const data = JSON.parse(await file.text());
    if (data?.app !== 'ExamForge' || !Array.isArray(data.questions) || data.questions.length > 1000 || !data.questions.every(validQuestion)) throw new Error('This is not a valid ExamForge question bank.');
    const ids = new Set(state.questions.map(q => q.id));
    let added = 0; for (const q of data.questions) if (!ids.has(q.id)) { state.questions.push(q); ids.add(q.id); added++; }
    save(); render(); showToast(added ? `Imported ${added} question${added === 1 ? '' : 's'}.` : 'These questions are already in your bank.');
  } catch (error) { showToast(error.message || 'Could not read that file.'); }
  event.target.value = '';
});

if (state.session?.endsAt && state.session.endsAt <= Date.now()) finishTest(true);
else render();
