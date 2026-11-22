/* Mandat – klickbare Demo (rein clientseitig, keine Daten verlassen den Browser) */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, html = '') => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (html) n.innerHTML = html;
    return n;
  };

  // ------------------------------------------------------------------
  // Zustand
  // ------------------------------------------------------------------
  const state = {
    role: 'Senior Consultant',
    moments: ['steering', 'abschluss'],
    skills: { spin: 2, medd: 1, cons: 3 },
    done: new Set(['m1']),
    diagnosed: false
  };

  // ------------------------------------------------------------------
  // Routing
  // ------------------------------------------------------------------
  const views = ['diagnose', 'pfad', 'lektion', 'rollenspiel', 'fall', 'partner'];
  function route() {
    const v = (location.hash || '#diagnose').slice(1);
    const view = views.includes(v) ? v : 'diagnose';
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + view));
    document.querySelectorAll('.side a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    if (view === 'pfad') renderPath();
    if (view === 'rollenspiel' && !rp.started) startRoleplay();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);

  // ------------------------------------------------------------------
  // Diagnose
  // ------------------------------------------------------------------
  const ROLES = ['Consultant', 'Senior Consultant', 'Manager / Projektleitung', 'Principal / Associate Partner'];
  const MOMENTS = [
    ['steering', 'Steering Committees & Statustermine'],
    ['workshop', 'Workshops mit Fachbereichen'],
    ['abschluss', 'Projektabschluss & Ergebnispräsentation'],
    ['erstgespraech', 'Erstgespräche mit neuen Stakeholdern'],
    ['proposal', 'Mitarbeit an Angeboten'],
    ['einwand', 'Budget- und Preisdiskussionen']
  ];
  const SKILLS = [
    ['spin', 'Bedarf durch Fragen herausarbeiten (SPIN)'],
    ['medd', 'Eine Chance nüchtern qualifizieren (MEDDPICC)'],
    ['cons', 'Mit dem Kunden über Geschäftswert sprechen (Consultative)']
  ];
  const LEVELS = ['Neu für mich', 'Unsicher', 'Solide', 'Sicher', 'Stärke'];

  function renderDiagnose() {
    const roles = $('#roles');
    ROLES.forEach(r => {
      const lab = el('label', { class: 'opt' + (r === state.role ? ' sel' : '') });
      lab.innerHTML = `<input type="radio" name="role" value="${r}" ${r === state.role ? 'checked' : ''}/> <span>${r}</span>`;
      roles.appendChild(lab);
    });
    roles.addEventListener('change', e => {
      state.role = e.target.value;
      roles.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o.querySelector('input').checked));
    });

    const moments = $('#moments');
    MOMENTS.forEach(([k, label]) => {
      const on = state.moments.includes(k);
      const lab = el('label', { class: 'opt' + (on ? ' sel' : '') });
      lab.innerHTML = `<input type="checkbox" value="${k}" ${on ? 'checked' : ''}/> <span>${label}</span>`;
      moments.appendChild(lab);
    });
    moments.addEventListener('change', e => {
      e.target.closest('.opt').classList.toggle('sel', e.target.checked);
      state.moments = [...moments.querySelectorAll('input:checked')].map(i => i.value);
    });

    const sliders = $('#sliders');
    SKILLS.forEach(([k, label]) => {
      const row = el('div', { class: 'slider-row' });
      row.innerHTML = `<div class="lbl">${label}</div>
        <input type="range" min="0" max="4" step="1" value="${state.skills[k]}" aria-label="${label}"/>
        <div class="val">${LEVELS[state.skills[k]]}</div>`;
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        state.skills[k] = +input.value;
        row.querySelector('.val').textContent = LEVELS[input.value];
      });
      sliders.appendChild(row);
    });

    $('#btn-diagnose').addEventListener('click', () => {
      state.diagnosed = true;
      $('#user-role').textContent = state.role;
      location.hash = '#pfad';
    });
  }

  // ------------------------------------------------------------------
  // Lernpfad
  // ------------------------------------------------------------------
  const MODULES = [
    { id: 'm1', title: 'Vom Projekt zum Folgemandat: Chancen im Alltag erkennen', skill: 'cons', min: 6, link: null },
    { id: 'm2', title: 'SPIN im Projektalltag', skill: 'spin', min: 7, link: '#lektion' },
    { id: 'm3', title: 'Rollenspiel: Kaffee nach dem Steering', skill: 'spin', min: 10, link: '#rollenspiel' },
    { id: 'm4', title: 'MEDDPICC für Folgemandate: dein echter Fall', skill: 'medd', min: 15, link: '#fall' },
    { id: 'm5', title: 'Der Business Case des Kunden: Wert in Zahlen übersetzen', skill: 'cons', min: 8, link: null },
    { id: 'm6', title: 'Einwand „Das machen wir intern“', skill: 'cons', min: 8, link: null },
    { id: 'm7', title: 'Übergabe an den Partner: eine Opportunity sauber briefen', skill: 'medd', min: 6, link: null }
  ];
  const SKILL_TAG = { spin: '<span class="tag spin">SPIN</span>', medd: '<span class="tag medd">MEDDPICC</span>', cons: '<span class="tag cons">Consultative</span>' };
  const SKILL_NAME = { spin: 'SPIN', medd: 'MEDDPICC', cons: 'Consultative' };
  const MOMENT_WHY = {
    steering: 'Passt zu deinen Steering Committees.',
    workshop: 'Direkt anwendbar in deinen Workshops.',
    abschluss: 'Ideal für deine Projektabschlüsse.',
    erstgespraech: 'Hilft dir bei Erstgesprächen.',
    proposal: 'Unterstützt deine Arbeit an Angeboten.',
    einwand: 'Relevant für deine Budgetdiskussionen.'
  };

  function orderedModules() {
    // Erstes Modul bleibt Einstieg; der Rest wird nach schwächstem Skill priorisiert,
    // die Reihenfolge innerhalb eines Skills bleibt erhalten (Lektion vor Rollenspiel).
    const [first, ...rest] = MODULES;
    const sorted = rest
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (state.skills[a.m.skill] - state.skills[b.m.skill]) || (a.i - b.i))
      .map(x => x.m);
    return [first, ...sorted];
  }

  function renderPath() {
    const list = orderedModules();
    const weakest = Object.entries(state.skills).sort((a, b) => a[1] - b[1])[0][0];
    $('#kpi-focus').textContent = SKILL_NAME[weakest];
    $('#pfad-sub').textContent = `Für ${state.role}: zusammengestellt aus deiner Diagnose. Dein größter Hebel liegt bei ${SKILL_NAME[weakest]} – diese Module kommen zuerst.`;
    const pct = Math.round((state.done.size / MODULES.length) * 100);
    $('#kpi-progress').textContent = pct + ' %';
    $('#bar-progress').style.width = pct + '%';

    const ul = $('#path');
    ul.innerHTML = '';
    let nextAssigned = false;
    list.forEach((m, idx) => {
      const done = state.done.has(m.id);
      let cls = done ? 'done' : '';
      if (!done && !nextAssigned) { cls = 'next'; nextAssigned = true; }
      const available = !!m.link;
      if (!done && !available) cls += ' locked';
      const why = idx > 0 && state.moments.length
        ? MOMENT_WHY[state.moments[idx % state.moments.length]]
        : 'Dein Einstieg in kommerzielles Denken.';
      const action = done
        ? (available ? `<a class="btn btn-ghost btn-sm" href="${m.link}">Wiederholen</a>` : '<span class="pill ok">Erledigt</span>')
        : available
          ? `<a class="btn ${cls.includes('next') ? 'btn-primary' : 'btn-ghost'} btn-sm" href="${m.link}">Starten</a>`
          : '<span class="muted" style="font-size:.85rem">In der Demo nicht enthalten</span>';
      const li = el('li', { class: cls.trim() });
      li.innerHTML = `
        <div class="num">${done ? '✓' : idx + 1}</div>
        <div>
          <div class="title">${m.title}</div>
          <div class="meta">${SKILL_TAG[m.skill]} <span>· ${m.min} Min.</span></div>
          <div class="why">${why}</div>
        </div>
        <div class="act">${action}</div>`;
      ul.appendChild(li);
    });
  }

  // ------------------------------------------------------------------
  // Lektion / Quiz
  // ------------------------------------------------------------------
  const QUIZ = [
    { q: '„Wie viele Lieferanten betreuen Sie aktuell zentral?“', a: 'S', fb: 'Situationsfrage: reine Faktenerhebung. Wichtig, aber sparsam einsetzen.' },
    { q: '„Was passiert mit Ihren Lieferzusagen, wenn Teile wieder zu spät kommen?“', a: 'I', fb: 'Implication: Sie macht die Folgen des Problems greifbar.' },
    { q: '„Womit sind Sie bei der Abstimmung zwischen den Standorten unzufrieden?“', a: 'P', fb: 'Problemfrage: Sie lädt den Kunden ein, eine Schwierigkeit zu benennen.' },
    { q: '„Wie würde Ihnen ein einheitliches Bestellcockpit im Budget-Meeting helfen?“', a: 'N', fb: 'Need-Payoff: Der Kunde formuliert den Nutzen selbst.' }
  ];
  function renderQuiz() {
    const box = $('#quiz');
    let answered = 0, right = 0;
    QUIZ.forEach(item => {
      const q = el('div', { class: 'quiz-q' });
      q.innerHTML = `<div class="q">${item.q}</div><div class="chips"></div><div class="fb"></div>`;
      const chips = q.querySelector('.chips');
      ['S', 'P', 'I', 'N'].forEach(letter => {
        const b = el('button', { class: 'chip', type: 'button' }, letter);
        b.addEventListener('click', () => {
          chips.querySelectorAll('button').forEach(x => {
            x.disabled = true;
            if (x.textContent === item.a) x.classList.add('right');
          });
          const ok = letter === item.a;
          if (!ok) b.classList.add('wrong');
          const fb = q.querySelector('.fb');
          fb.style.display = 'block';
          fb.innerHTML = (ok ? '✅ ' : '↪️ ') + item.fb;
          answered++; if (ok) right++;
          if (answered === QUIZ.length) {
            $('#quiz-score').textContent = `${right} von ${QUIZ.length} richtig.`;
            $('#quiz-done').style.display = 'block';
            state.done.add('m2');
          }
        });
        chips.appendChild(b);
      });
      box.appendChild(q);
    });
  }

  // ------------------------------------------------------------------
  // Rollenspiel
  // ------------------------------------------------------------------
  // q: Qualität (g = gut, m = mittel, b = schwach), pts: Punkte, phase: erreichte SPIN-Phase
  const SCRIPT = [
    {
      client: 'Gut, dass das Steering heute so glatt lief. Ich habe noch zehn Minuten – was liegt Ihnen auf dem Herzen?',
      options: [
        { t: 'Sie hatten letzte Woche erwähnt, dass der Einkauf gerade ein Dauerthema ist. Wie ist das bei Ihnen heute organisiert?', q: 'g', pts: 2, phase: 'S',
          coach: 'Stark: Du greifst einen beiläufigen Hinweis auf und öffnest mit einer gezielten Situationsfrage.',
          reply: 'Ach, das. Drei Standorte, jeder bestellt mehr oder weniger selbst. Zentral haben wir zwei Einkäufer, die versuchen, den Überblick zu behalten.' },
        { t: 'Wir haben übrigens ein sehr gutes Procurement-Excellence-Angebot. Soll ich Ihnen dazu mal etwas schicken?', q: 'b', pts: 0, phase: null,
          coach: 'Pitch zu früh: Der Kunde hat noch kein Problem benannt. So wirkst du wie ein Verkäufer, nicht wie ein Berater.',
          reply: 'Hm, schicken Sie ruhig mal was. Aber ehrlich gesagt weiß ich noch gar nicht, ob wir so etwas brauchen. Bei uns bestellen drei Standorte mehr oder weniger selbst …' },
        { t: 'Läuft im Einkauf eigentlich alles rund?', q: 'm', pts: 1, phase: 'P',
          coach: 'Geschlossene Frage: Sie lädt zu „Ja, passt schon“ ein. Offene Fragen bringen mehr.',
          reply: 'Na ja, rund … Drei Standorte, jeder bestellt mehr oder weniger selbst. Zentral haben wir zwei Einkäufer.' }
      ]
    },
    {
      options: [
        { t: 'Wo hakt es bei dieser Aufteilung aus Ihrer Sicht am meisten?', q: 'g', pts: 2, phase: 'P',
          coach: 'Gute Problemfrage: offen formuliert, lädt zur Ehrlichkeit ein.',
          reply: 'Ehrlich gesagt: Wir wissen nicht genau, was wir wo zu welchem Preis kaufen. Letztes Quartal hatten wir zweimal einen Bandstillstand, weil Teile fehlten.' },
        { t: 'Wie viele Lieferanten haben Sie insgesamt?', q: 'm', pts: 1, phase: 'S',
          coach: 'Noch eine Situationsfrage. Zu viele davon langweilen Entscheider – die Fakten kannst du oft selbst recherchieren.',
          reply: 'Puh, keine Ahnung, ein paar hundert. Und genau das ist das Problem: Wir wissen nicht, was wir wo kaufen. Letztes Quartal hatten wir zweimal Bandstillstand.' },
        { t: 'Das klingt nach einem klaren Fall für eine Lieferantenkonsolidierung.', q: 'b', pts: 0, phase: null,
          coach: 'Die Expertenfalle: Du lieferst die Lösung, bevor der Kunde das Problem beschrieben hat.',
          reply: 'Vielleicht. Mich nervt eher etwas anderes: Letztes Quartal hatten wir zweimal Bandstillstand, weil Teile fehlten.' }
      ]
    },
    {
      options: [
        { t: 'Was hat so ein Stillstand Sie gekostet – und wie wurde das intern aufgenommen?', q: 'g', pts: 2, phase: 'I',
          coach: 'Exzellent: Eine Implication-Frage, die Kosten und politische Wirkung zugleich sichtbar macht.',
          reply: 'Ein Tag Stillstand kostet uns rund 180.000 Euro. Und der CFO hat das Thema für das nächste Budget-Meeting auf die Agenda gesetzt. Da stehe ich ziemlich im Feuer.' },
        { t: 'Das ist ärgerlich. Kommt das öfter vor?', q: 'm', pts: 1, phase: 'P',
          coach: 'Solide, aber du bleibst beim Problem. Frag nach den Auswirkungen, um Dringlichkeit zu erzeugen.',
          reply: 'Zweimal im Quartal ist zweimal zu viel. Ein Tag kostet uns rund 180.000 Euro, und der CFO hat es für das nächste Budget-Meeting auf die Agenda gesetzt.' },
        { t: 'Da könnten wir schnell eine Spend-Analyse machen – vier Wochen, überschaubares Budget.', q: 'b', pts: 0, phase: null,
          coach: 'Zu früh angeboten. Ohne geklärte Auswirkungen hat der Kunde keinen Grund, Budget freizugeben.',
          reply: 'Langsam. Ich muss erst mal verstehen, was das Ganze wert ist. Ein Tag Stillstand kostet uns etwa 180.000 Euro, und der CFO will Antworten.' }
      ]
    },
    {
      options: [
        { t: 'Angenommen, Sie hätten volle Transparenz über Bedarfe und Bestände – was würde das für Sie im Budget-Meeting ändern?', q: 'g', pts: 2, phase: 'N',
          coach: 'Need-Payoff auf den Punkt: Der Kunde beschreibt den Nutzen selbst – und verkauft ihn damit sich selbst.',
          reply: 'Dann könnte ich dem CFO zum ersten Mal einen Plan statt einer Ausrede liefern. Können Sie mir helfen, das zu strukturieren?' },
        { t: 'Wer entscheidet denn bei Ihnen final über ein solches Projekt?', q: 'm', pts: 1, phase: null,
          coach: 'Wichtige MEDDPICC-Frage (Economic Buyer) – aber der Zeitpunkt ist zu früh. Lass den Kunden erst den Nutzen formulieren.',
          reply: 'Am Ende der CFO, Dr. Weber. Aber bevor ich zu ihm gehe, brauche ich einen Plan. Können Sie mir helfen, das zu strukturieren?' },
        { t: 'Dann sollten wir direkt ein Angebot aufsetzen.', q: 'b', pts: 0, phase: null,
          coach: 'Der Kunde hat den Nutzen noch nicht ausgesprochen. Ein Angebot jetzt fühlt sich für ihn nach Druck an.',
          reply: 'Ein Angebot ist mir zu früh. Aber ich brauche für den CFO einen Plan. Können Sie mir helfen, das zu strukturieren?' }
      ]
    },
    {
      options: [
        { t: 'Sehr gern. Damit ich das sinnvoll vorbereite: Wer wäre außer Ihnen und dem CFO beteiligt, und bis wann brauchen Sie etwas?', q: 'g', pts: 2, phase: null,
          coach: 'Consultative Close: Du sagst zu und klärst gleichzeitig Entscheidungsprozess und Timing (MEDDPICC). Jetzt hast du eine echte Opportunity.',
          reply: 'Unser Leiter Einkauf, Herr Sommer, sollte dabei sein. Das Budget-Meeting ist in sechs Wochen. Lassen Sie uns nächste Woche eine Stunde blocken.' },
        { t: 'Ich schicke Ihnen morgen unser Standardangebot.', q: 'b', pts: 0, phase: null,
          coach: 'Chance verschenkt: Ein Standardangebot ignoriert alles, was du gerade erfahren hast.',
          reply: 'Hm. Ich hatte eher an etwas gedacht, das auf unsere Situation passt. Aber schicken Sie mal.' },
        { t: 'Da muss ich erst mit meinem Partner sprechen.', q: 'm', pts: 1, phase: null,
          coach: 'Verständlich, aber du gibst die Initiative ab. Besser: Zusagen, nächsten Schritt vereinbaren – und den Partner dann gezielt einbinden.',
          reply: 'Natürlich. Melden Sie sich einfach, wenn Sie so weit sind.' }
      ]
    }
  ];

  const rp = { started: false, step: 0, score: 0, phases: new Set() };

  function addMsg(cls, html) {
    const m = el('div', { class: 'msg ' + cls }, html);
    $('#chat').appendChild(m);
    m.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return m;
  }

  function startRoleplay() {
    rp.started = true; rp.step = 0; rp.score = 0; rp.phases.clear();
    $('#chat').innerHTML = '';
    updateRpSidebar();
    addMsg('narr', 'Konferenzraum, 16:40 Uhr. Die anderen haben den Raum verlassen.');
    addMsg('client', SCRIPT[0].client);
    renderChoices();
  }

  function renderChoices() {
    const box = $('#choices');
    box.innerHTML = '';
    const step = SCRIPT[rp.step];
    // Optionen gemischt anzeigen, damit die gute Antwort nicht immer oben steht
    const opts = step.options.map((o, i) => ({ o, k: (i * 7 + rp.step * 3) % 5 })).sort((a, b) => a.k - b.k).map(x => x.o);
    opts.forEach(opt => {
      const b = el('button', { class: 'choice', type: 'button' }, opt.t);
      b.addEventListener('click', () => choose(opt));
      box.appendChild(b);
    });
  }

  function choose(opt) {
    $('#choices').innerHTML = '';
    addMsg('me', opt.t);
    const label = { g: 'Coach: Gut gemacht', m: 'Coach: Geht besser', b: 'Coach: Vorsicht' }[opt.q];
    addMsg('coach ' + opt.q, `<b>${label}${opt.phase ? ' · ' + opt.phase + '-Frage' : ''}</b>${opt.coach}`);
    rp.score += opt.pts;
    if (opt.phase && opt.q !== 'b') rp.phases.add(opt.phase);
    updateRpSidebar();
    setTimeout(() => {
      addMsg('client', opt.reply);
      rp.step++;
      if (rp.step < SCRIPT.length) renderChoices();
      else finishRoleplay();
    }, 650);
  }

  function updateRpSidebar() {
    $('#rp-score').textContent = `${rp.score} / 10`;
    $('#rp-bar').style.width = (rp.score * 10) + '%';
    document.querySelectorAll('#phases div').forEach(d => d.classList.toggle('hit', rp.phases.has(d.dataset.p)));
  }

  function finishRoleplay() {
    state.done.add('m3');
    const s = rp.score;
    const verdict = s >= 9 ? 'Hervorragend – daraus wird ein Folgemandat.'
      : s >= 6 ? 'Gutes Gespräch – mit mehr Geduld vor der Lösung holst du noch mehr heraus.'
      : 'Guter Anfang. Übe, länger in Problem und Auswirkung zu bleiben, bevor du Lösungen anbietest.';
    const missing = ['S', 'P', 'I', 'N'].filter(p => !rp.phases.has(p));
    const box = $('#choices');
    box.innerHTML = `
      <div style="padding:6px 2px">
        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
          <span class="score-big">${s}/10</span><b>${verdict}</b>
        </div>
        <p class="muted" style="margin:8px 0 14px">${missing.length ? 'Nicht erreichte SPIN-Phasen: <b>' + missing.join(', ') + '</b>.' : 'Du hast alle vier SPIN-Phasen durchlaufen.'} Nächster Schritt: Qualifiziere die Chance mit MEDDPICC, bevor du deinen Partner einbindest.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="btn btn-primary btn-sm" href="#fall">Zum MEDDPICC-Check →</a>
          <button class="btn btn-ghost btn-sm" type="button" id="rp-restart">Nochmal spielen</button>
        </div>
      </div>`;
    $('#rp-restart').addEventListener('click', startRoleplay);
  }

  // ------------------------------------------------------------------
  // Echter Fall – MEDDPICC
  // ------------------------------------------------------------------
  const MEDD = [
    { k: 'M', name: 'Metrics', hint: 'Welche Kennzahl verbessert sich für den Kunden – in seinen Worten?', val: '1 Tag Bandstillstand ≈ 180.000 €; 2 Stillstände im letzten Quartal', st: 'ok',
      qs: ['Woran würden Sie in einem Jahr festmachen, dass sich das Projekt gelohnt hat?', 'Welche Zahl muss der CFO sehen, um zuzustimmen?'] },
    { k: 'E', name: 'Economic Buyer', hint: 'Wer gibt das Budget frei – und kennst du diese Person?', val: 'CFO Dr. Weber – noch kein direkter Kontakt', st: 'part',
      qs: ['Wie sieht Dr. Weber das Thema – eher als Kostenrisiko oder als Chance?', 'Wäre es sinnvoll, wenn wir die Ausgangslage gemeinsam mit ihm durchgehen?'] },
    { k: 'D', name: 'Decision Criteria', hint: 'Nach welchen Kriterien wird eine Beratung ausgewählt?', val: '', st: 'open',
      qs: ['Was muss ein Partner für dieses Vorhaben mitbringen, damit Sie sich sicher fühlen?', 'Was war bei früheren Beratungsprojekten entscheidend – und was hat gestört?'] },
    { k: 'D', name: 'Decision Process', hint: 'Welche Schritte und Gremien bis zur Entscheidung? Welches Timing?', val: 'Budget-Meeting in 6 Wochen; Leiter Einkauf soll beteiligt sein', st: 'part',
      qs: ['Was passiert zwischen heute und dem Budget-Meeting – wer muss vorher überzeugt sein?', 'Braucht es eine Vorlage für den Vorstand?'] },
    { k: 'P', name: 'Paper Process', hint: 'Rahmenvertrag, Einkauf, Abrufverfahren, Freigabegrenzen?', val: '', st: 'open',
      qs: ['Läuft ein Folgeauftrag über unseren bestehenden Rahmenvertrag oder braucht es eine neue Ausschreibung?', 'Ab welchem Volumen muss der Einkauf eingebunden werden?'] },
    { k: 'I', name: 'Identify Pain', hint: 'Welcher Schmerz ist so groß, dass gehandelt werden muss?', val: 'Keine Transparenz über Bedarfe; COO steht beim CFO unter Druck', st: 'ok',
      qs: ['Was passiert, wenn bis zum Sommer nichts passiert?'] },
    { k: 'C', name: 'Champion', hint: 'Wer treibt das intern – und hat selbst etwas davon?', val: 'COO Thomas Albrecht – will dem CFO einen Plan liefern', st: 'ok',
      qs: ['Was bräuchten Sie von uns, um das intern gut vertreten zu können?'] },
    { k: 'C', name: 'Competition', hint: 'Andere Beratungen? Interne Lösung? Nichtstun?', val: '', st: 'open',
      qs: ['Gibt es Überlegungen, das intern oder mit einem anderen Partner anzugehen?', 'Was wäre aus Ihrer Sicht die Alternative, wenn wir es nicht gemeinsam machen?'] }
  ];
  const ST_LABEL = { ok: 'Geklärt', part: 'Teilweise', open: 'Offen' };

  function renderMedd() {
    const box = $('#medd');
    MEDD.forEach((item, i) => {
      const row = el('div', { class: 'medd-row' });
      row.innerHTML = `
        <div class="L">${item.k}</div>
        <div>
          <div class="name">${item.name}</div>
          <div class="hint">${item.hint}</div>
          <textarea rows="1" aria-label="${item.name}" placeholder="Was weißt du bereits?">${item.val}</textarea>
        </div>
        <div class="st">
          <select aria-label="Status ${item.name}" class="${item.st}">
            ${Object.entries(ST_LABEL).map(([k, v]) => `<option value="${k}" ${k === item.st ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>`;
      const sel = row.querySelector('select');
      sel.addEventListener('change', () => { item.st = sel.value; sel.className = sel.value; });
      row.querySelector('textarea').addEventListener('input', e => { item.val = e.target.value; });
      box.appendChild(row);
    });

    $('#btn-prep').addEventListener('click', buildPrep);
  }

  function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function buildPrep() {
    const ok = MEDD.filter(m => m.st === 'ok').length;
    const gaps = MEDD.filter(m => m.st !== 'ok').sort((a, b) => (a.st === 'open' ? 0 : 1) - (b.st === 'open' ? 0 : 1));
    const client = esc($('#case-client').value || 'Kunde');
    const topic = esc($('#case-topic').value || 'Folgemandat');
    const readiness = ok >= 7 ? ['ok', 'Bereit für das Gespräch mit deinem Partner.']
      : ok >= 4 ? ['part', 'Vielversprechend – aber kläre die offenen Punkte vor dem Angebot.']
      : ['open', 'Frühe Phase – noch zu viele blinde Flecken für ein Angebot.'];

    const prep = $('#prep');
    prep.innerHTML = `
      <span class="eyebrow">Deine Terminvorbereitung</span>
      <h3>${client}: ${topic}</h3>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="pill ${readiness[0]}">${ok} / 8 geklärt</span><span>${readiness[1]}</span>
      </div>
      <div class="meter">${MEDD.map(m => `<span class="${m.st}" title="${m.name}: ${ST_LABEL[m.st]}"></span>`).join('')}</div>

      <div class="grid-2" style="margin-top:18px">
        <div>
          <h4>Fragen für deinen nächsten Termin</h4>
          ${gaps.length ? gaps.slice(0, 4).map(g => `
            <div class="gap-item">
              <b>${g.name}</b> <span class="pill ${g.st}">${ST_LABEL[g.st]}</span>
              <ul>${g.qs.map(q => `<li>„${q}“</li>`).join('')}</ul>
            </div>`).join('') : '<p class="muted">Keine Lücken – stark!</p>'}
        </div>
        <div>
          <h4>Empfohlener nächster Schritt</h4>
          <p>${gaps.some(g => g.name === 'Economic Buyer')
            ? 'Bitte Thomas Albrecht, ein gemeinsames 30-Minuten-Gespräch mit dem CFO zu ermöglichen. Bereite dafür die Kostenrechnung des Stillstands als Ausgangspunkt vor.'
            : 'Vereinbare einen Termin, um gemeinsam mit dem Champion eine Lösungsskizze für das Entscheidungsgremium zu erarbeiten.'}</p>
          <h4 style="margin-top:18px">Briefing für deinen Partner</h4>
          <p class="muted" style="font-size:.92rem">${client} · ${topic}. Champion: ${esc(MEDD[6].val || 'offen')}. Schmerz: ${esc(MEDD[5].val || 'offen')}. Kennzahl: ${esc(MEDD[0].val || 'offen')}. Offene Punkte: ${gaps.map(g => g.name).join(', ') || 'keine'}.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            <button class="btn btn-dark btn-sm" type="button" id="btn-share">An Partner freigeben</button>
          </div>
          <p class="note" id="share-note" style="display:none">✓ Freigegeben. Die Opportunity erscheint jetzt in der <a href="#partner">Partner-Ansicht</a>.</p>
        </div>
      </div>`;
    prep.style.display = 'block';
    prep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    state.done.add('m4');
    $('#btn-share').addEventListener('click', e => {
      e.target.disabled = true;
      $('#share-note').style.display = 'block';
    });
  }

  // ------------------------------------------------------------------
  // Partner-Ansicht
  // ------------------------------------------------------------------
  function renderBars() {
    const data = [
      ['SPIN', 38, 64],
      ['MEDDPICC', 29, 58],
      ['Consultative', 51, 67],
      ['Implication-Fragen', 22, 49]
    ];
    $('#bars').innerHTML = data.map(([l, b, a]) => `
      <div class="bar-row">
        <span>${l}</span>
        <div class="bars"><div class="before" style="width:${b}%"></div><div class="after" style="width:${a}%"></div></div>
        <b style="text-align:right">${b} → ${a}</b>
      </div>`).join('');
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  renderDiagnose();
  renderQuiz();
  renderMedd();
  renderBars();
  route();
})();
