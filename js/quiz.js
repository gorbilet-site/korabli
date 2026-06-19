/* ============================================================
   Горбилет · Тест подбора прогулки (4 вопроса)
   Механика: скоринг по тегам (как Marquiz)
   Данные акций берутся из data/piers.json (все actions всех причалов)
   ============================================================ */

(function () {
  'use strict';

  // оси ответов = data-add у кнопок .q-opt в index.html
  //   время:   day | sunset | night | cheap
  //   звук:    music | tour | any
  //   вид:     canals | gulf | unusual
  //   палуба:  single | double | any

  let actions = [];     // плоский список всех акций с тегами
  let answers = [];

  /* ---------- алгоритм подбора ---------- */
  function pickAction(ans) {
    let best = null, bestScore = -1;
    for (const a of actions) {
      let score = 0;
      for (const tag of ans) {
        if (tag === 'any' || tag === 'any1' || tag === 'any2') { score += 0.5; continue; }
        if (a.tags.includes(tag)) score += 1;
      }
      // при равенстве баллов выигрывает большая скидка — тест "продаёт горящее"
      const tie = (a.discount || 0) / 1000;
      if (score + tie > bestScore) { bestScore = score + tie; best = a; }
    }
    return best;
  }

  /* ---------- загрузка акций из quiz-actions.json ---------- */
  function loadActions() {
    return fetch('data/quiz-actions.json')
      .then(r => r.json())
      .then(data => {
        actions = data.map(a => ({
          title: a.title,
          url: a.url,
          discount: a.discount || 0,
          tags: a.tags || [],
          pier: a.pier || '',
          price: a.price
        }));
      });
  }

  /* ---------- UI теста (работает с разметкой лендинга) ---------- */
  function initQuizUI() {
    const steps = [...document.querySelectorAll('.q-step')];
    const bars = [...document.querySelectorAll('.q-progress .bar')];
    if (!steps.length) return;   // на этой странице теста нет
    let step = 0;
    answers = [];

    function show(n) {
      steps.forEach(s => s.classList.remove('active'));
      const res = document.querySelector('.q-result');
      if (res) res.classList.remove('active');
      if (n < steps.length) steps[n].classList.add('active');
      bars.forEach((b, i) => b.classList.toggle('done', i < n));
    }

    document.querySelectorAll('.q-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        answers.push(opt.dataset.add);
        step++;
        if (step < steps.length) show(step);
        else { bars.forEach(b => b.classList.add('done')); showResult(); }
      });
    });

    function showResult() {
      steps.forEach(s => s.classList.remove('active'));
      const r = pickAction(answers);
      const res = document.querySelector('.q-result');
      if (!r || !res) return;
      const t = document.getElementById('resTitle');
      const d = document.getElementById('resDesc');
      const buy = document.getElementById('resBuy');
      if (t) t.textContent = r.title;
      if (d) d.textContent = (r.pier ? `Отправление: ${r.pier}` : '') + (r.price ? ` · от ${r.price} ₽` : '') + (r.discount ? ` · −${r.discount}%` : '');
      if (buy) { buy.href = r.url; buy.target = '_blank'; buy.rel = 'noopener'; }
      res.classList.add('active');
    }

    // кнопка "пройти заново"
    window.restartQuiz = function () { step = 0; answers = []; show(0); };
    show(0);
  }

  loadActions().then(initQuizUI);
})();
