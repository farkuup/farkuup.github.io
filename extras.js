(() => {
  const D = document, H = D.documentElement, W = window;
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const typing = () => { const a = D.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };

  /* ---------- Petit message en bas de l'écran ---------- */
  const toast = D.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); D.body.appendChild(toast);
  let toastT = 0;
  function say(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2600); }

  /* ---------- 1. Mode Ambilight ---------- */
  const glow = D.createElement('div'); glow.className = 'ambi-glow'; glow.setAttribute('aria-hidden', 'true'); D.body.appendChild(glow);
  function toggleAmbilight() {
    const on = H.classList.toggle('ambilight');
    say(on ? 'Mode Ambilight allumé' : 'Mode Ambilight éteint');
    return on;
  }
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kIdx = 0, typed = '';
  W.addEventListener('keydown', e => {
    if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) { kIdx = 0; toggleAmbilight(); }
    if (k.length === 1) { typed = (typed + k).slice(-6); if (typed === 'jarvis') { typed = ''; openJarvis(); } }
  });
  // Sur téléphone : 5 touchers rapides sur « Projets » dans le bandeau
  const projTitle = $('.proj-title');
  let taps = [];
  W.addEventListener('pointerdown', e => {
    if (!projTitle) return;
    const r = projTitle.getBoundingClientRect(), bar = $('.bar');
    if (r.top > (bar ? bar.offsetHeight : 64)) return; // seulement quand « Projets » est rangé dans le bandeau
    if (e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
    const now = performance.now();
    taps = taps.filter(t => now - t < 2500); taps.push(now);
    if (taps.length >= 5) { taps = []; toggleAmbilight(); }
  }, { passive: true });

  /* ---------- 2. Jarvis ---------- */
  let term = null, out = null, input = null;
  const cards = $$('#projets .card').map(c => ({ el: c, title: (c.querySelector('h3') || {}).textContent || '', href: c.getAttribute('href') }));
  const CMDS = {
    aide: () => [
      'projets     les projets de Soméan',
      'contact     pour lui écrire',
      'qui         qui est Soméan',
      'alternance  ce qu\'il recherche',
      'ambilight   allume ou éteint le mode Ambilight',
      'intro       rejoue l\'intro',
      'secrets     les œufs cachés du site',
      'effacer     vide le terminal',
      'quitter     ferme Jarvis'].join('\n'),
    projets: () => {
      const f = D.createDocumentFragment();
      cards.forEach((c, i) => {
        const a = D.createElement('a');
        a.textContent = `${i + 1}. ${c.title}`;
        a.href = c.href || '#projets';
        if (!c.href) a.addEventListener('click', ev => { ev.preventDefault(); closeJarvis(); c.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
        f.appendChild(a); f.appendChild(D.createTextNode('\n'));
      });
      return f;
    },
    contact: () => {
      const f = D.createDocumentFragment();
      [['E-mail', 'someanyoyotte@gmail.com', 'mailto:someanyoyotte@gmail.com'],
       ['LinkedIn', 'linkedin.com/in/soméan-yoyotte', 'https://www.linkedin.com/in/som%C3%A9an-yoyotte-b241a2222/'],
       ['GitHub', 'github.com/farkuup', 'https://github.com/farkuup']].forEach(([n, t, h]) => {
        f.appendChild(D.createTextNode(n.padEnd(10)));
        const a = D.createElement('a'); a.textContent = t; a.href = h; if (h.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
        f.appendChild(a); f.appendChild(D.createTextNode('\n'));
      });
      return f;
    },
    qui: () => 'Soméan Yoyotte, étudiant ingénieur à Sup Galilée.\nIl construit des machines depuis 2013 : robots, LED, code, et un peu de vidéo.',
    alternance: () => 'Soméan cherche une alternance, disponible dès septembre 2027.\nTapez « contact » pour lui écrire.',
    secrets: () => { setTimeout(() => { closeJarvis(); openEggs(); }, 350); return 'Je vous montre les secrets du site.'; },
    cv: () => 'Le CV arrive bientôt. En attendant, tapez « contact ».',
    ambilight: () => toggleAmbilight() ? 'Ambilight allumé. Retapez « ambilight » pour l\'éteindre.' : 'Ambilight éteint.',
    intro: () => { setTimeout(() => { closeJarvis(); const l = $('.logo'); if (l) l.click(); }, 350); return 'Je relance l\'intro.'; },
    effacer: () => { out.textContent = ''; return null; },
    quitter: () => { setTimeout(closeJarvis, 250); return 'À bientôt.'; },
    jarvis: () => 'Oui ?',
    bonjour: () => 'Bonjour ! Tapez « aide » pour voir ce que je sais faire.',
    merci: () => 'Avec plaisir.',
  };
  const ALIAS = { help: 'aide', '?': 'aide', projet: 'projets', contacts: 'contact', mail: 'contact', email: 'contact', 'qui est someanyoyotte': 'qui', 'qui es-tu': 'jarvis',
                  dispo: 'alternance', oeufs: 'secrets', œufs: 'secrets', secret: 'secrets', 'easter eggs': 'secrets', clear: 'effacer', cls: 'effacer', exit: 'quitter', fermer: 'quitter', salut: 'bonjour', hello: 'bonjour', coucou: 'bonjour', somean: 'qui', soméan: 'qui' };
  function print(content, cls) {
    const line = D.createElement('div');
    if (cls) line.className = cls;
    out.appendChild(line);
    if (typeof content !== 'string') { line.appendChild(content); out.scrollTop = out.scrollHeight; return; }
    if (reduce) { line.textContent = content; out.scrollTop = out.scrollHeight; return; }
    let i = 0;
    const step = () => { i = Math.min(content.length, i + 3); line.textContent = content.slice(0, i); out.scrollTop = out.scrollHeight; if (i < content.length) requestAnimationFrame(step); };
    step();
  }
  function run(raw) {
    const q = raw.trim().toLowerCase();
    if (!q) return;
    print('› ' + raw.trim(), 'me');
    const key = CMDS[q] ? q : ALIAS[q];
    setTimeout(() => {
      if (!key) { print(`Je ne connais pas « ${raw.trim()} ». Tapez « aide ».`); return; }
      const r = CMDS[key]();
      if (r) print(r);
    }, 140);
  }
  function buildJarvis() {
    term = D.createElement('section');
    term.className = 'jarvis'; term.setAttribute('aria-label', 'Jarvis, le terminal du site');
    term.innerHTML = '<header><span class="orb"></span><b>jarvis</b> terminal<button type="button" aria-label="Fermer">×</button></header><div class="out" aria-live="polite"></div><form><span>›</span><input id="jarvis-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Commande pour Jarvis"></form>';
    D.body.appendChild(term);
    out = term.querySelector('.out'); input = term.querySelector('input');
    term.querySelector('button').addEventListener('click', closeJarvis);
    term.querySelector('form').addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; });
    term.addEventListener('keydown', e => { if (e.key === 'Escape') closeJarvis(); e.stopPropagation(); });
    print('Bonjour, je suis Jarvis, l\'assistant de Soméan.\nTapez « aide » pour voir ce que je sais faire.');
  }
  function openJarvis() {
    if (!term) buildJarvis();
    term.classList.add('on');
    setTimeout(() => input.focus({ preventScroll: true }), 60);
  }
  function closeJarvis() { if (term) { term.classList.remove('on'); input.blur(); } }

  /* ---------- 5. Vidéo au survol ---------- */
  $$('.thumb.has-vid').forEach(th => {
    const v = th.querySelector('video'), card = th.closest('.card');
    if (!v || reduce) return;
    const load = () => { if (!v.src) v.src = v.canPlayType('video/mp4; codecs="avc1.42E01E"') || !v.dataset.webm ? v.dataset.src : v.dataset.webm; };
    const play = () => { load(); v.play().then(() => v.classList.add('on')).catch(() => {}); };
    const stop = () => { v.classList.remove('on'); v.pause(); };
    if (fine) { card.addEventListener('mouseenter', play); card.addEventListener('mouseleave', stop); }
    else if ('IntersectionObserver' in W) {
      new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? play() : stop())), { threshold: .75 }).observe(th);
    }
  });

  /* ---------- 6. Plume et trace d'encre ---------- */
  if (fine) {
    H.classList.add('plume');
    if (!reduce) {
      const cv = D.createElement('canvas'); cv.className = 'ink-trail'; cv.setAttribute('aria-hidden', 'true'); D.body.appendChild(cv);
      const ctx = cv.getContext('2d');
      let pts = [], raf = 0, dpr = 1;
      const size = () => { dpr = Math.min(2, W.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
      size(); W.addEventListener('resize', size);
      const LIFE = 650;
      const draw = () => {
        raf = 0;
        const now = performance.now();
        pts = pts.filter(p => now - p.t < LIFE);
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (pts.length > 1) {
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const ink = getComputedStyle(D.body).color;
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            if (b.t - a.t > 80) continue;
            const sp = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
            ctx.globalAlpha = .55 * (1 - (now - b.t) / LIFE);
            ctx.strokeStyle = ink;
            ctx.lineWidth = clamp(2.6 - sp * .9, .7, 2.6) * dpr;
            ctx.beginPath(); ctx.moveTo(a.x * dpr, a.y * dpr); ctx.lineTo(b.x * dpr, b.y * dpr); ctx.stroke();
          }
        }
        if (pts.length) raf = requestAnimationFrame(draw);
      };
      W.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || H.classList.contains('intro-run')) return;
        pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (pts.length > 80) pts.shift();
        if (!raf) raf = requestAnimationFrame(draw);
      }, { passive: true });
    }
  }

  /* ---------- 7. Frise qui se dessine au stylo ---------- */
  const tl = $('#debut .timeline');
  if (tl) {
    tl.classList.add('ink');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = D.createElementNS(NS, 'svg'); svg.setAttribute('class', 'ink-line'); svg.setAttribute('aria-hidden', 'true');
    const path = D.createElementNS(NS, 'path'); svg.appendChild(path); tl.prepend(svg);
    const items = [...tl.children].filter(li => li.tagName === 'LI');
    let len = 0, h = 0;
    const shape = () => {
      h = tl.offsetHeight; svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 6 ${h}`); svg.style.height = h + 'px';
      let d = 'M3 0', seed = 7;
      for (let y = 10; y <= h; y += 10) { seed = (seed * 9301 + 49297) % 233280; d += ` L${(3 + Math.sin(y * .045) * .7 + (seed / 233280 - .5) * .6).toFixed(2)} ${y}`; }
      path.setAttribute('d', d); len = path.getTotalLength(); path.style.strokeDasharray = len;
    };
    const update = () => {
      const r = tl.getBoundingClientRect();
      const p = reduce ? 1 : clamp((innerHeight * .82 - r.top) / Math.max(1, r.height));
      path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
      items.forEach(li => li.classList.toggle('lit', p * h >= li.offsetTop + 8));
    };
    shape(); update();
    W.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    W.addEventListener('resize', () => { shape(); update(); });
  }

  /* ---------- L'œuf du pied de page ---------- */
  const footP = $('footer p');
  let eggBtn = null, dlg = null;
  const EGGS = [
    ['Le mode Ambilight', 'Tapez le code Konami au clavier :<span class="keys"><kbd>↑</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><kbd>←</kbd><kbd>→</kbd><kbd>B</kbd><kbd>A</kbd></span>Sur téléphone, touchez 5 fois « Projets » dans le bandeau.', 'Allumer', () => { closeEggs(); setTimeout(toggleAmbilight, 250); }],
    ['Jarvis', 'Tapez « jarvis » au clavier, n\'importe où sur la page. Il connaît mes projets et sait comment me joindre.', 'Ouvrir Jarvis', () => { closeEggs(); setTimeout(openJarvis, 250); }],
    ['Le bras robotique', 'Sur la carte « Bras robotique 4 axes », il suit votre souris ou votre doigt, sans dépasser ses butées. Cliquez pour qu\'il serre la pince.', 'Le voir', () => { closeEggs(); const c = $('canvas.arm'); if (c) c.closest('.card').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }],
    ['Mon nom qui sonne', 'Quand mon nom est rangé en haut à droite, il vibre au bout de 5 secondes, comme un téléphone. Cliquez dessus pour répondre.'],
    ['« portfolio » change d\'écriture', 'Il prend une nouvelle police à chaque retour sur l\'accueil. Cliquez dessus pour revoir l\'intro.', 'Revoir l\'intro', () => { closeEggs(); setTimeout(() => { const l = $('.logo'); if (l) l.click(); }, 250); }],
    ['La plume', 'Sur ordinateur, votre curseur est une plume qui laisse une trace d\'encre.'],
    ['Le carnet de l\'Ambilight', 'Feuilletez le carnet de bord jusqu\'à la dernière page : un petit jeu vous attend.', 'Aller au carnet', 'ambilight.html#carnet'],
  ];
  function buildEggs() {
    dlg = D.createElement('dialog');
    dlg.className = 'eggs'; dlg.setAttribute('aria-labelledby', 'eggs-t');
    dlg.innerHTML = '<button type="button" class="eggs-x" aria-label="Fermer">×</button><h2 id="eggs-t">Les œufs cachés</h2><p class="eggs-sub">Bravo, vous avez trouvé le premier. Voici les autres.</p><ol></ol><p class="eggs-foot">Et aussi : la frise se dessine quand vous défilez, et la carte Ambilight s\'allume au survol.</p>';
    const ol = dlg.querySelector('ol');
    EGGS.forEach(([t, txt, label, act]) => {
      const li = D.createElement('li');
      li.innerHTML = `<div><b>${t}</b><p>${txt}</p></div>`;
      if (label) {
        const b = D.createElement(typeof act === 'string' ? 'a' : 'button');
        b.className = 'eggs-go'; b.textContent = label;
        if (typeof act === 'string') b.href = act; else { b.type = 'button'; b.addEventListener('click', act); }
        li.appendChild(b);
      }
      ol.appendChild(li);
    });
    dlg.querySelector('.eggs-x').addEventListener('click', closeEggs);
    dlg.addEventListener('click', e => { if (e.target === dlg) closeEggs(); });
    dlg.addEventListener('close', () => { H.classList.remove('eggs-open'); if (eggBtn) setTimeout(() => eggBtn.classList.remove('cracked'), 400); });
    dlg.addEventListener('keydown', e => e.stopPropagation());
    D.body.appendChild(dlg);
  }
  function openEggs() {
    if (!dlg) buildEggs();
    if (dlg.open) return;
    H.classList.add('eggs-open');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeEggs() { if (dlg && dlg.open) { if (dlg.close) dlg.close(); else { dlg.removeAttribute('open'); dlg.dispatchEvent(new Event('close')); } } }
  if (footP) {
    eggBtn = D.createElement('button');
    eggBtn.type = 'button'; eggBtn.className = 'egg';
    eggBtn.setAttribute('aria-label', 'Un petit œuf. Cliquez pour découvrir les secrets du site');
    eggBtn.innerHTML = '<svg viewBox="0 0 24 30" aria-hidden="true"><defs>'
      + '<clipPath id="egg-top"><path d="M0 0H24V16L19.5 13L16 17L12 13L8 17L4.5 13L0 16Z"/></clipPath>'
      + '<clipPath id="egg-bot"><path d="M0 16L4.5 13L8 17L12 13L16 17L19.5 13L24 16V30H0Z"/></clipPath></defs>'
      + '<g class="egg-bot" clip-path="url(#egg-bot)"><path class="shell" d="M12 1C5.5 1 1.5 12 1.5 18.5S6 29 12 29s10.5-4 10.5-10.5S18.5 1 12 1Z"/><ellipse class="yolk" cx="12" cy="18" rx="5.2" ry="3.4"/></g>'
      + '<g class="egg-top" clip-path="url(#egg-top)"><path class="shell" d="M12 1C5.5 1 1.5 12 1.5 18.5S6 29 12 29s10.5-4 10.5-10.5S18.5 1 12 1Z"/></g></svg>';
    footP.appendChild(eggBtn);
    eggBtn.addEventListener('click', () => {
      if (eggBtn.classList.contains('cracked')) { openEggs(); return; }
      eggBtn.classList.add('cracked');
      setTimeout(openEggs, reduce ? 0 : 650);
    });
  }

  /* ---------- 3. Bras robotique pixel art qui suit la souris ---------- */
  const armCv = $('canvas.arm');
  if (armCv) {
    const thumb = armCv.parentElement, ctx = armCv.getContext('2d');
    const hex = h => { const n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
    const PAL = {
      ink: hex('#101010'),
      yel: [hex('#f9dc8c'), hex('#edb65a'), hex('#c98a38')],
      ora: [hex('#e69766'), hex('#c8643a'), hex('#97462a')],
      gry: [hex('#d3dee3'), hex('#93a6af'), hex('#4f5e66')],
    };
    let cw = 0, ch = 0, P = 3, img = null, buf = null, K = 1;
    const L = { l1: 17, l2: 24, l3: 8, g: 7 };
    const S = { x: 0, y: 0 }, B = { x: 0 };
    // épaule, coude, poignet : angle, vitesse, consigne, vitesse max (rad/s)
    const J = [{ a: -.8, v: 0, t: -.8, vmax: 1 }, { a: -2, v: 0, t: -2, vmax: 1.4 }, { a: 1.6, v: 0, t: 1.6, vmax: 2.2 }];
    let grip = .5, gripT = .5;
    let mouse = null, lastMove = 0, down = false;
    const layout = () => {
      const w = thumb.clientWidth, h = thumb.clientHeight;
      P = clamp(Math.round(w / 110), 2, 4);
      cw = Math.round(w / P); ch = Math.round(h / P);
      armCv.width = cw; armCv.height = ch;
      img = ctx.createImageData(cw, ch); buf = new Uint32Array(img.data.buffer);
      K = clamp(ch / 72, .6, 1.3);
      B.x = cw - Math.round(19 * K);                         // socle posé sur la ligne entre l'image et le texte
      S.x = B.x - Math.round(5 * K); S.y = ch - Math.round(22 * K); // épaule en haut de la colonne
    };
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < cw && y < ch) buf[y * cw + x] = c; };
    // segment épais : contour noir, trois tons (clair d'un côté, sombre de l'autre)
    function seg(x0, y0, ang, len, w0, pal, w1 = w0) {
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const x1 = x0 + ux * len, y1 = y0 + uy * len, m = Math.max(w0, w1);
      const minX = Math.floor(Math.min(x0, x1) - m), maxX = Math.ceil(Math.max(x0, x1) + m);
      const minY = Math.floor(Math.min(y0, y1) - m), maxY = Math.ceil(Math.max(y0, y1) + m);
      for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
        const dx = px + .5 - x0, dy = py + .5 - y0, u = dx * ux + dy * uy, v = dx * nx + dy * ny;
        const hw = (w0 + (w1 - w0) * clamp(u / Math.max(1, len))) / 2;
        if (u < -.5 || u > len + .5 || Math.abs(v) > hw) continue;
        const side = ny < 0 ? -v : v; // le côté éclairé est toujours en haut
        let c;
        if (Math.abs(v) > hw - 1 || u < .5 || u > len - .5) c = PAL.ink;
        else c = side > hw * .3 ? pal[0] : (side < -hw * .35 ? pal[2] : pal[1]);
        put(px, py, c);
      }
    }
    // articulation : boîtier rond avec un axe gris au centre
    function disc(cx, cy, r, pal, hole) {
      for (let py = Math.floor(cy - r - 1); py <= cy + r + 1; py++) for (let px = Math.floor(cx - r - 1); px <= cx + r + 1; px++) {
        const dx = px + .5 - cx, dy = py + .5 - cy, d = Math.hypot(dx, dy);
        if (d > r) continue;
        let c = d > r - 1 ? PAL.ink : (dx + dy < -r * .4 ? pal[0] : (dx + dy > r * .5 ? pal[2] : pal[1]));
        if (hole) {
          if (d < hole) c = dx + dy < -hole * .3 ? PAL.gry[0] : PAL.gry[1];
          else if (d < hole + 1.1) c = PAL.gry[2];
          else if (d < hole + 2) c = PAL.ink;
        }
        put(px, py, c);
      }
    }
    function rect(x0, y0, x1, y1, pal) {
      x0 = Math.round(x0); x1 = Math.round(x1);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const edge = x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1;
        put(x, y, edge ? PAL.ink : (y === y0 + 1 ? pal[0] : (y === y1 - 2 ? pal[2] : pal[1])));
      }
    }
    const pt = (o, a, d) => ({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d });
    function drawArm() {
      buf.fill(0);
      const k = K, l1 = L.l1 * k, l2 = L.l2 * k, l3 = L.l3 * k, g = L.g * k;
      const a1 = J[0].a, a12 = a1 + J[1].a, a123 = a12 + J[2].a;
      const E = pt(S, a1, l1), Wr = pt(E, a12, l2), T = pt(Wr, a123, l3);
      // socle et colonne inclinée
      rect(B.x - 15 * k, ch - 4, B.x + 15 * k, ch, PAL.gry);
      rect(B.x - 11 * k, ch - 7, B.x + 11 * k, ch - 3, PAL.ora);
      const colA = Math.atan2(S.y - (ch - 6), S.x - B.x);
      seg(B.x, ch - 6, colA, Math.hypot(S.x - B.x, S.y - (ch - 6)), 13 * k, PAL.yel, 10 * k);
      // pince (dessinée d'abord, l'avant-bras passe par-dessus)
      const spread = .1 + grip * .5, nA = a123 + Math.PI / 2;
      [-1, 1].forEach(s => {
        const root = pt(pt(T, a123, 1.5 * k), nA, s * 4 * k), ja = a123 + s * spread;
        seg(root.x, root.y, ja, g, 2.6 * k, PAL.gry);
        const tip = pt(root, ja, g - 1);
        seg(tip.x, tip.y, ja - s * 1.45, 4 * k, 2.4 * k, PAL.gry);
      });
      const cb = pt(pt(T, a123, .5 * k), nA, -5 * k);
      seg(cb.x, cb.y, nA, 10 * k, 3.4 * k, PAL.gry);
      // bras, avant-bras, poignet
      seg(E.x, E.y, a12, l2, 7.5 * k, PAL.yel, 6.5 * k);
      seg(pt(E, a12, 2 * k).x, pt(E, a12, 2 * k).y, a12, l2 * .4, 5.5 * k, PAL.gry);
      seg(S.x, S.y, a1, l1, 10 * k, PAL.ora, 8.5 * k);
      disc(E.x, E.y, 5 * k, PAL.ora, 1.8 * k);
      seg(Wr.x, Wr.y, a123, l3 * .62, 6 * k, PAL.yel, 5 * k);
      seg(pt(Wr, a123, l3 * .55).x, pt(Wr, a123, l3 * .55).y, a123, l3 * .45, 5 * k, PAL.gry);
      disc(Wr.x, Wr.y, 4.6 * k, PAL.ora, 1.6 * k);
      disc(S.x, S.y, 6.4 * k, PAL.yel, 2.6 * k);
      ctx.putImageData(img, 0, 0);
    }
    // cinématique inverse : la pince vise la souris sans dépasser les butées ni sortir du cadre
    const LIM = [[-Math.PI + .1, -.3], [-2.7, 2.7], [-1.9, 1.9]];
    function solve(tx, ty) {
      const k = K, l1 = L.l1 * k, l2 = L.l2 * k, tool = (L.l3 + L.g) * k;
      tx = clamp(tx, 6, cw - 4); ty = clamp(ty, 9, ch - 10);
      const dx = tx - S.x, dy = ty - S.y, dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      const reach = clamp(dist - tool * .8, Math.abs(l1 - l2) + 3, l1 + l2 - .6);
      const wx = S.x + ux * reach, wy = Math.min(S.y + uy * reach, ch - 12);
      const d = clamp(Math.hypot(wx - S.x, wy - S.y), Math.abs(l1 - l2) + 1, l1 + l2 - .5);
      const base = Math.atan2(wy - S.y, wx - S.x);
      const c2 = clamp((d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1);
      let best = null;
      [Math.acos(c2), -Math.acos(c2)].forEach(a2 => {
        let a1 = base - Math.atan2(l2 * Math.sin(a2), l1 + l2 * Math.cos(a2));
        a1 = Math.atan2(Math.sin(a1), Math.cos(a1));
        if (a1 > 0) a1 = a1 > Math.PI / 2 ? LIM[0][0] : LIM[0][1];
        const c1 = clamp(a1, ...LIM[0]);
        const ey = S.y + Math.sin(c1) * l1, err = Math.abs(c1 - a1) * 40;
        if (!best || ey + err < best.score) best = { a1: c1, a2, score: ey + err };
      });
      const a1 = best.a1, a2 = clamp(best.a2, ...LIM[1]);
      const e = pt(S, a1, l1), w = pt(e, a1 + a2, l2);
      let a3 = Math.atan2(ty - w.y, tx - w.x) - (a1 + a2);
      a3 = clamp(Math.atan2(Math.sin(a3), Math.cos(a3)), ...LIM[2]);
      J[0].t = a1; J[1].t = a2; J[2].t = a3;
    }
    let raf = 0, last = 0, visible = false;
    const tick = now => {
      raf = 0;
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      const r = armCv.getBoundingClientRect();
      let tx, ty;
      if (mouse && now - lastMove < (fine ? 1e9 : 3500)) { tx = (mouse.x - r.left) / P; ty = (mouse.y - r.top) / P; }
      else { const s = now / 1000; tx = S.x - 40 * K + Math.sin(s * .5) * 16 * K; ty = S.y - 14 * K + Math.sin(s * .8) * 9 * K; }
      solve(tx, ty);
      gripT = down ? 0 : (mouse && Math.abs(mouse.x - (r.left + r.width / 2)) < r.width * .7 && Math.abs(mouse.y - (r.top + r.height / 2)) < r.height ? 1 : .45);
      let moving = false;
      J.forEach(j => {
        const acc = 16 * (j.t - j.a) - 8 * j.v;
        j.v = clamp(j.v + acc * dt, -j.vmax, j.vmax);
        j.a += j.v * dt;
        if (Math.abs(j.t - j.a) > .002 || Math.abs(j.v) > .002) moving = true;
      });
      grip += (gripT - grip) * Math.min(1, dt * 7);
      drawArm();
      if (visible && (moving || !fine || Math.abs(gripT - grip) > .01 || !mouse)) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (visible && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
    layout();
    solve(S.x - 40 * K, S.y - 14 * K); J.forEach(j => { j.a = j.t; }); drawArm();
    if (!reduce) {
      W.addEventListener('pointermove', e => { mouse = { x: e.clientX, y: e.clientY }; lastMove = performance.now(); wake(); }, { passive: true });
      W.addEventListener('pointerdown', e => { down = true; mouse = { x: e.clientX, y: e.clientY }; lastMove = performance.now(); wake(); }, { passive: true });
      W.addEventListener('pointerup', () => { down = false; wake(); }, { passive: true });
      W.addEventListener('scroll', wake, { passive: true });
      if ('IntersectionObserver' in W) new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(thumb);
      else visible = true;
    }
    W.addEventListener('resize', () => { layout(); drawArm(); wake(); });
  }
})();
