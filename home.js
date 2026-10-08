(() => {
  const D = document, H = D.documentElement, W = window;
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const geo = (a, b, t) => a * Math.pow(b / a, t);
  const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  const intro = $('#intro'), box = $('.iw-box'), svgDraw = $('.iw-draw'), svgBh = $('.iw-bh'),
        fontEl = $('.iw-font'), etym = $('.intro-etym'), canvas = $('canvas.glitch');
  const title = $('.title'), w1 = $('.w1'), w2 = $('.w2'), L1 = [...w1.children], L2 = [...w2.children];
  const pres = $('.pres'), pws = $$('.pw'), proj = $('.proj-title'), anchor = $('.proj-anchor'),
        heroSpace = $('.hero-space'), bar = $('.bar'), logo = $('.logo'), icons = $$('.social a'), hint = $('.scroll-hint');
  const BASE = 200, PBASE = 64;
  const st = { rise: 1, k: 0, kTarget: 0, intro: false, lock: false, hintTimer: 0,
               bx: 0, by: 0, rot: 0, vibDone: false, vibTimer: 0, buzzing: false };
  let M = null;

  /* ---------- Mesures ---------- */
  function inkBox(font, txt, size) {
    const c = D.createElement('canvas').getContext('2d');
    c.font = font;
    const m = c.measureText(txt);
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    const base = fa != null ? (size - (fa + fd)) / 2 + fa : size * .8; // ligne de base dans une boîte line-height: 1
    return { base, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, width: m.width };
  }

  function measure() {
    const vw = H.clientWidth, vh = W.innerHeight, mob = vw <= 700;
    const m = { vw, vh, mob, barH: mob ? 56 : 64, pad: mob ? 16 : 28 };
    [...L1, ...L2].forEach(l => { l.style.width = ''; });
    title.classList.remove('sq');
    m.lw1 = L1.map(l => l.offsetWidth); m.lw2 = L2.map(l => l.offsetWidth);
    m.W1 = m.lw1.reduce((a, b) => a + b, 0); m.W2 = m.lw2.reduce((a, b) => a + b, 0);
    const a1 = inkBox(`400 ${BASE}px Anton`, 'SOMÉAN', BASE), a2 = inkBox(`400 ${BASE}px Anton`, 'YOYOTTE', BASE);
    m.base = a2.base; m.capH = a2.asc; m.ascE = a1.asc;

    // Grand titre (accueil)
    const frac = mob ? .86 : .56;
    m.fY = Math.min(frac * vw * BASE / m.W2, .2 * vh * BASE / m.capH, 260);
    m.fS = .62 * m.fY;
    m.gap = .035 * m.fY;
    m.G = m.ascE * m.fS / BASE + m.gap + m.capH * m.fY / BASE;

    // Présentation
    pres.style.width = Math.min(580, vw - 2 * (mob ? 20 : 40)) + 'px';
    m.presW = pres.offsetWidth; m.presH = pres.offsetHeight;
    m.presL = (vw - m.presW) / 2;
    const gapP = clamp(.05 * vh, 26, 46);
    const block = m.G + gapP + m.presH;
    m.gTopRise = Math.max(m.barH + 20, (vh - block) / 2 - .03 * vh);
    m.presTop = m.gTopRise + m.G + gapP;

    // Taille dans le bandeau : on réduit si « Projets » au centre et le titre à droite se touchent
    m.ic = mob ? 20 : 22; m.igap = mob ? 10 : 12;
    m.iconsW = 3 * m.ic + 2 * m.igap + (mob ? 12 : 16);
    m.pbig = clamp(.085 * vw, 48, 96);
    const pInk = inkBox(`400 ${PBASE}px Anton`, 'P', PBASE);
    m.pW = proj.offsetWidth; m.pBase = pInk.base; m.pAsc = pInk.asc;
    m.fh = mob ? 18 : 22;
    for (;;) {
      m.ps = Math.round(m.fh * 1.3);
      const sh = m.fh / BASE;
      const tW = (m.W1 + m.W2) * sh + .3 * m.fh;
      const sy = (m.lw1[0] + m.lw2[0]) * sh + .08 * m.fh + m.iconsW;
      const free = vw - m.pad - (vw / 2 + m.pW * m.ps / PBASE / 2) - 14;
      if (Math.max(tW, sy) <= free || m.fh <= 13) break;
      m.fh -= 1;
    }

    // Repère « Projets » sous l'accueil
    anchor.style.fontSize = m.pbig + 'px';
    heroSpace.style.height = '0px';
    const a0 = anchor.getBoundingClientRect().top + W.scrollY;
    m.S1 = .55 * vh;
    m.T1 = .34 * vh; m.T0 = .06 * vh;
    const target = Math.max(vh + 24, m.S1 + m.T1 + .07 * vh, m.presTop + m.presH + .14 * vh);
    heroSpace.style.height = Math.max(0, target - a0) + 'px';
    m.anchorTop = anchor.getBoundingClientRect().top + W.scrollY;
    M = m;
  }

  /* ---------- Rendu ---------- */
  const place = (el, x, baseline, size, a = 0, cx = 0, cy = 0) => {
    const s = size / BASE;
    let px = x, py = baseline - M.base * s, rot = '';
    if (a) { // pivot autour du centre du titre
      const dx = px - cx, dy = py - cy, c = Math.cos(a), si = Math.sin(a);
      px = cx + dx * c - dy * si; py = cy + dx * si + dy * c;
      rot = ` rotate(${a.toFixed(4)}rad)`;
    }
    el.style.transform = `translate(${px.toFixed(2)}px,${py.toFixed(2)}px)${rot} scale(${s.toFixed(5)})`;
  };
  let lastK = -1, lastWords = '';

  function letterK(k, j, n) { return clamp(k * 1.35 - (n - 1 - j) / (n - 1) * .35); }

  function render() {
    if (!M) return;
    const { vw, vh } = M, y = W.scrollY;
    const p1 = clamp(y / M.S1), e1 = ss(p1);
    const rt = M.anchorTop - y;
    const p2 = clamp((M.T1 - rt) / (M.T1 - M.T0)), e2 = ss(p2), e2t = ss(clamp(p2 * 1.6));
    const r = eio(st.rise), k = eio(st.k);

    // Lettres comprimées (SY)
    if (k !== lastK) {
      title.classList.toggle('sq', k > 0);
      [L1, L2].forEach((L, wi) => {
        const lw = wi ? M.lw2 : M.lw1;
        L.forEach((l, j) => {
          if (!j) return;
          const kj = letterK(k, j, L.length);
          l.style.width = kj ? (lw[j] * (1 - kj)).toFixed(2) + 'px' : '';
          l.style.opacity = kj ? (1 - kj).toFixed(3) : '';
        });
      });
      lastK = k;
    }
    const wk = (lw, L) => lw.reduce((a, w, j) => a + (j ? w * (1 - letterK(k, j, L.length)) : w), 0);

    // Accueil
    const sS = M.fS, sY = M.fY;
    const gTop = lerp(vh / 2 - M.G / 2, M.gTopRise, r);
    const bS = gTop + M.ascE * sS / BASE;
    const bY = bS + M.gap + M.capH * sY / BASE;
    const xS = (vw - M.W1 * sS / BASE) / 2, xY = (vw - M.W2 * sY / BASE) / 2;

    // Bandeau
    const sh = M.fh / BASE;
    const W1k = wk(M.lw1, L1) * sh, W2k = wk(M.lw2, L2) * sh;
    const g = lerp(.3, .08, k) * M.fh;
    const tW = W1k + g + W2k, groupW = tW + k * M.iconsW;
    const GL = lerp((vw - groupW) / 2, vw - M.pad - groupW, e2t);
    const tL = GL + k * M.iconsW;
    const hb = M.barH / 2 + M.capH * sh / 2;

    // Passage accueil -> bandeau : on interpole les centres des mots, et tant que les mots
    // se recouvrent horizontalement on les garde l'un au-dessus de l'autre (aucun chevauchement).
    const ex = ss(clamp(p1 / .8));
    const f1 = geo(sS, M.fh, e1), f2 = geo(sY, M.fh, e1);
    const ww1 = (e1 < 1 ? M.W1 : wk(M.lw1, L1)) * f1 / BASE, ww2 = (e1 < 1 ? M.W2 : wk(M.lw2, L2)) * f2 / BASE;
    const c1 = lerp(xS + M.W1 * sS / BASE / 2, tL + W1k / 2, ex), c2 = lerp(xY + M.W2 * sY / BASE / 2, tL + W1k + g + W2k / 2, ex);
    let b1 = lerp(bS, hb, e1), b2 = lerp(bY, hb, e1);
    const ovX = Math.min(c1 + ww1 / 2, c2 + ww2 / 2) - Math.max(c1 - ww1 / 2, c2 - ww2 / 2);
    const need = b1 - (b2 - M.capH * f2 / BASE - .03 * f2);
    if (ovX > -3 && need > 0) { const d = need * ss(clamp((ovX + 3) / 3)) * (1 - k); b1 -= d * .6; b2 += d * .4; }
    const pcx = (c1 - ww1 / 2 + c2 + ww2 / 2) / 2 + st.bx, pcy = (b1 + b2) / 2 - M.capH * f2 / BASE / 2 + st.by;
    place(w1, c1 - ww1 / 2 + st.bx, b1 + st.by, f1, st.rot, pcx, pcy);
    place(w2, c2 - ww2 / 2 + st.bx, b2 + st.by, f2, st.rot, pcx, pcy);
    vibArm(e2t > .999 && p1 > .98 && k === 0 && !st.kTarget);
    title.classList.toggle('tap', p1 > .98);

    // Logos
    icons.forEach((a, i) => {
      const ki = clamp((k - (2 - i) * .14) / .72);
      a.classList.toggle('on', ki > .5 && p1 > .98);
      a.style.opacity = ki.toFixed(3);
      const x = tL - M.iconsW + i * (M.ic + M.igap) - (1 - ki) * 10;
      a.style.transform = `translate(${x.toFixed(2)}px,${(M.barH / 2 - M.ic / 2).toFixed(2)}px) scale(${(.7 + .3 * ki).toFixed(3)})`;
    });

    // Présentation : apparaît mot à mot, puis se dissout vers le haut
    const n = pws.length;
    const key = r.toFixed(3) + '|' + p1.toFixed(3);
    pres.style.transform = `translate(${M.presL.toFixed(2)}px,${(M.presTop - y * .45).toFixed(2)}px)`;
    if (key !== lastWords) {
      pws.forEach((w, i) => {
        const rv = clamp((r - .26 - i * (.3 / n)) / .4);
        const d = clamp((p1 - .02 - i / n * .22) / .2);
        const op = rv * (1 - d);
        w.style.opacity = op.toFixed(3);
        w.style.transform = op ? `translateY(${((1 - rv) * 12 - d * 22).toFixed(2)}px)` : '';
        w.style.filter = d > 0 && d < 1 ? `blur(${(d * 4).toFixed(2)}px)` : '';
      });
      lastWords = key;
    }

    // « Projets »
    const pf = geo(M.pbig, M.ps, e2), ps = pf / PBASE;
    const hy = M.barH / 2 - (M.pBase - M.pAsc / 2) * (M.ps / PBASE);
    const py = lerp(rt, hy, e2);
    proj.style.transform = `translate(${((vw - M.pW * ps) / 2).toFixed(2)}px,${py.toFixed(2)}px) scale(${ps.toFixed(5)})`;

    bar.classList.toggle('line', y > M.S1 * .9);
    if (y > 20 && hint.classList.contains('on')) hint.classList.remove('on');
    if (p1 < .98 && st.kTarget) toggleSY(false);
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

  function tween(key, to, ms) {
    return new Promise(res => {
      const from = st[key], t0 = performance.now();
      const step = now => {
        const t = clamp((now - t0) / ms);
        st[key] = lerp(from, to, t);
        render();
        if (t < 1 && st['_' + key] === t0) requestAnimationFrame(step); else res();
      };
      st['_' + key] = t0;
      requestAnimationFrame(step);
    });
  }

  /* ---------- Vibration du titre quand il est rangé en haut à droite ---------- */
  function vibArm(atRight) {
    if (!atRight || st.vibDone || st.intro || reduce) {
      clearTimeout(st.vibTimer); st.vibTimer = 0;
      if (st.buzzing) { st.buzzing = false; st.bx = st.by = st.rot = 0; }
      return;
    }
    if (!st.vibTimer && !st.buzzing) st.vibTimer = setTimeout(startBuzz, 5000);
  }
  function startBuzz() {
    st.vibTimer = 0; st.buzzing = true;
    const t0 = performance.now();
    const step = now => {
      if (!st.buzzing) { st.bx = st.by = st.rot = 0; render(); return; }
      // comme un téléphone : deux vibrations courtes, puis une pause.
      // Pendant chaque vibration, le titre pivote à droite puis à gauche, à une vitesse liée à celle de la vibration.
      const t = (now - t0) % 1900;
      const seg = t < 320 ? t : (t > 470 && t < 790 ? t - 470 : -1);
      if (seg >= 0) {
        const env = Math.sin(Math.PI * seg / 320), w = .19; // vibration ~30 Hz
        st.bx = 2.2 * env * Math.sin(seg * w);
        st.by = .9 * env * Math.sin(seg * w * 1.4);
        st.rot = .045 * env * Math.sin(seg * w / 5); // balancement 5 fois plus lent que la vibration
      } else st.bx = st.by = st.rot = 0;
      render();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function stopVib() { st.vibDone = true; clearTimeout(st.vibTimer); st.vibTimer = 0; st.buzzing = false; st.bx = st.by = st.rot = 0; }

  function toggleSY(on) {
    if (st.kTarget === +on) return;
    st.kTarget = +on;
    // la tween travaille sur k linéaire, le rendu applique eio
    tween('k', +on, 520);
  }

  /* ---------- Indication « Défilez » ---------- */
  function showHint() {
    if (W.scrollY > 20 || st.intro) return;
    hint.classList.add('on');
    let t = 0;
    const parts = [...hint.querySelectorAll('path')];
    parts.forEach(p => {
      const len = p.getTotalLength();
      const dur = p.classList.contains('sh-stroke') ? 90 : Math.max(20, len * 1.6);
      p.style.strokeDasharray = len + 1;
      p.animate([{ strokeDashoffset: len + 1 }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: 'both', easing: 'linear' });
      t += dur;
    });
  }
  function scheduleHint() { clearTimeout(st.hintTimer); st.hintTimer = setTimeout(showHint, 6000); }

  /* ---------- Intro ---------- */
  const FONTS = [['Reenie Beanie', 250], ['Gochi Hand', 100], ['Monoton', 100]];
  const LOOP = ['Instrument Serif', 'Abril Fatface', 'Michroma', 'Anton', 'Rubik Glitch', 'Gochi Hand',
                'Playfair Display', 'Orbitron', 'Monoton', 'BH', 'Major Mono Display', 'Herr Von Muellerhoff',
                'Fredoka', 'Abril Fatface', 'Gluten', 'Reenie Beanie', 'Pixelify Sans'], TOURS = 2;

  const block = e => { if (st.lock) e.preventDefault(); if (st.intro && st.onSkip) st.onSkip(); };
  ['pointerdown', 'touchstart'].forEach(ev => W.addEventListener(ev, () => { if (st.intro && st.onSkip) st.onSkip(); }, { passive: true }));
  W.addEventListener('wheel', block, { passive: false });
  W.addEventListener('touchmove', block, { passive: false });
  W.addEventListener('keydown', e => {
    if (st.lock && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) e.preventDefault();
    if (st.intro && st.onSkip) st.onSkip();
  });

  function layoutIntro() {
    const vw = H.clientWidth, vh = W.innerHeight;
    const bw = Math.min(.82 * vw, 860), bh = bw / 2.13;
    box.style.width = bw + 'px'; box.style.height = bh + 'px';
    return { bw, bh };
  }
  function fitFont(fam, bw, bh) {
    const c = D.createElement('canvas').getContext('2d');
    c.font = `100px "${fam}"`;
    const w = c.measureText('portfolio').width || 400;
    return Math.min(.8 * bw * 100 / w, .62 * bh);
  }

  // Glitchs pendant le 2e tour, de plus en plus forts :
  // d'abord quelques liserés blancs, noirs et gris, puis davantage, puis l'écran tremble, puis ça commence à recouvrir l'écran
  function microGlitch() {
    const vh = W.innerHeight, cw = 220, ch = Math.max(90, Math.round(vh / 2.5));
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const stage = $('.intro-stage');
    const COLORS = ['#000', '#fff', '#8a8a8a', '#c4c4c4', '#000', '#fff'];
    let lvl = 0, on = true, burst = 0;
    const frame = () => {
      if (!on) return;
      ctx.clearRect(0, 0, cw, ch);
      if (burst <= 0 && Math.random() < .15 + lvl * .85) burst = 1 + (Math.random() * (2 + lvl * 8) | 0);
      if (burst > 0) {
        burst--;
        const cover = clamp((lvl - .6) / .4); // recouvrement à la fin
        const n = 1 + (Math.random() * (2 + Math.pow(lvl, 1.5) * 50 + cover * 70) | 0);
        for (let i = 0; i < n; i++) {
          const y = Math.random() * ch | 0;
          const h = cover > 0 && Math.random() < cover ? 1 + (Math.random() * (3 + cover * 9) | 0) : (Math.random() < .8 ? 1 : 2);
          const maxW = cw * (.15 + lvl * .55 + cover * .3);
          const w = 6 + Math.random() * maxW | 0, x = Math.random() * (cw - w) | 0;
          ctx.fillStyle = COLORS[Math.random() * COLORS.length | 0];
          ctx.fillRect(x, y, w, h);
        }
      }
      const shake = clamp((lvl - .35) / .65);
      if (shake > 0 && burst > 0 && Math.random() < .5 + shake * .4) {
        const a = 1.5 + shake * 9;
        stage.style.transform = `translate(${((Math.random() - .5) * 2 * a).toFixed(1)}px,${((Math.random() - .5) * a * .6).toFixed(1)}px)`;
      } else stage.style.transform = '';
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return { level: v => { lvl = clamp(v); }, stop: () => { on = false; ctx.clearRect(0, 0, cw, ch); stage.style.transform = ''; } };
  }

  // Transition : glitch noir et blanc en bandes horizontales
  function glitch(I0 = 0) {
    return new Promise(res => {
      const vh = W.innerHeight;
      const cw = 220, ch = Math.max(90, Math.round(vh / 2.5));
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(cw, ch), buf = new Uint32Array(img.data.buffer);
      const BLACK = 0xff000000, WHITE = 0xffffffff;
      const t0 = performance.now(), UP = 380, HOLD = 190, DOWN = 460;
      let swapped = false;
      const frame = now => {
        const t = now - t0;
        let I;
        if (t < UP) I = I0 + (1 - I0) * Math.pow(t / UP, 1.6);
        else if (t < UP + HOLD) I = 1;
        else I = Math.pow(clamp(1 - (t - UP - HOLD) / DOWN), 1.8);
        if (!swapped && t >= UP + HOLD / 2) { swapped = true; intro.classList.add('swap'); H.classList.add('ready'); }
        buf.fill(0);
        let y = 0;
        while (y < ch) {
          const band = 1 + (Math.random() * Math.random() * 6 | 0);
          const noisy = Math.random() < .08 + I * .92;
          if (noisy) {
            const dens = I > .98 ? 1 : .15 + I * .8;
            const shift = Math.random() < .2 ? (Math.random() * 40 | 0) : 0;
            let x = 0;
            const row = new Uint32Array(cw);
            while (x < cw) {
              const len = 1 + (Math.random() * Math.random() * 70 | 0);
              const v = Math.random() < dens ? (Math.random() < .55 ? BLACK : WHITE) : 0;
              row.fill(v, x, Math.min(cw, x + len));
              x += len;
            }
            for (let b = 0; b < band && y + b < ch; b++) {
              const o = (y + b) * cw;
              for (let i = 0; i < cw; i++) {
                const v = row[(i + shift + (Math.random() < .04 ? 3 : 0)) % cw];
                if (v) buf[o + i] = v;
              }
            }
          }
          y += band;
        }
        ctx.putImageData(img, 0, 0);
        if (t < UP + HOLD + DOWN) requestAnimationFrame(frame);
        else { ctx.clearRect(0, 0, cw, ch); res(); }
      };
      requestAnimationFrame(frame);
    });
  }

  async function runIntro() {
    if (st.intro) return;
    st.intro = true; st.lock = true; st.skip = false;
    let skipNow;
    const skipped = new Promise(r => { skipNow = r; });
    const skipEl = $('.intro-skip');
    skipEl.textContent = matchMedia('(hover: none)').matches ? "Touchez pour passer l'intro" : "Cliquez pour passer l'intro";
    skipEl.classList.remove('on', 'off');
    const skipTimer = setTimeout(() => skipEl.classList.add('on'), 1000);
    const hideSkip = () => { clearTimeout(skipTimer); skipEl.classList.add('off'); };
    st.onSkip = () => { if (!st.skip) { st.skip = true; hideSkip(); skipNow(); } };
    const wait = ms => Promise.race([sleep(ms), skipped]); // une attente qu'un geste du visiteur interrompt
    clearTimeout(st.hintTimer); hint.classList.remove('on');
    H.classList.add('intro-run'); H.classList.remove('ready');
    intro.classList.remove('swap');
    W.scrollTo(0, 0);
    st.k = 0; st.kTarget = 0; st.rise = 0;
    setLogoFont('Herr Von Muellerhoff'); store.set('logoPolice', 'Herr Von Muellerhoff');
    etym.classList.remove('on', 'off');
    svgDraw.style.visibility = 'visible'; svgBh.style.visibility = 'hidden'; fontEl.style.visibility = 'hidden';
    const letters = [...svgDraw.querySelectorAll('.iw-letter')];
    letters.forEach(p => { p.getAnimations().forEach(a => a.cancel()); const l = p.getTotalLength(); p.style.strokeDasharray = l + 1; p.style.strokeDashoffset = l + 1; p.style.fillOpacity = 0; });

    await Promise.race([Promise.all(['Anton', 'Herr Von Muellerhoff', ...FONTS.map(f => f[0])]
      .concat(LOOP.filter(f => f !== 'BH')).map(f => D.fonts.load(`100px "${f}"`, 'portfolioSOMÉAN'))), sleep(3500)]).catch(() => {});
    measure(); render();
    const { bw, bh } = layoutIntro();

    // 1. « portfolio » se dessine en 2 s
    const lens = letters.map(p => p.getTotalLength()), total = lens.reduce((a, b) => a + b, 0);
    let t = 0;
    letters.forEach((p, i) => {
      const d = 1800 * lens[i] / total;
      p.animate([{ strokeDashoffset: lens[i] + 1 }, { strokeDashoffset: 0 }], { duration: d, delay: t, fill: 'forwards', easing: 'ease-in-out' });
      p.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 200, delay: t + d * .7, fill: 'forwards' });
      t += d;
    });
    setTimeout(() => etym.classList.add('on'), 1300);
    await wait(2000);
    await wait(750);

    // 2. Changements de police
    const setFont = fam => { fontEl.style.fontFamily = `"${fam}"`; fontEl.style.fontSize = fitFont(fam, bw, bh) + 'px'; };
    if (!st.skip) {
      svgDraw.style.visibility = 'hidden'; svgBh.style.visibility = 'visible';
      await wait(500);
    }
    if (!st.skip) {
      svgBh.style.visibility = 'hidden'; fontEl.style.visibility = 'visible';
      for (const [fam, ms] of FONTS) { if (st.skip) break; setFont(fam); await wait(ms); }
    }
    // la boucle tourne 2 fois ; effets dès le début du 2e tour, transition lancée à 1,75 tour
    // (le mot continue de changer de police pendant que le glitch arrive)
    const N = LOOP.length, steps = TOURS * N, fxStart = N, trans = Math.round(1.75 * N);
    let fx = null, glitching = null;
    for (let i = 0; i < steps && !intro.classList.contains('swap') && !(st.skip && !glitching); i++) {
      const fam = LOOP[i % N];
      if (fam === 'BH') { fontEl.style.visibility = 'hidden'; svgBh.style.visibility = 'visible'; }
      else { svgBh.style.visibility = 'hidden'; fontEl.style.visibility = 'visible'; setFont(fam); }
      if (i === fxStart) fx = microGlitch();
      if (fx) fx.level((i - fxStart) / (trans - fxStart));
      if (i === trans) { hideSkip(); etym.classList.add('off'); if (fx) fx.stop(); glitching = glitch(.25); }
      await (glitching ? sleep(70) : wait(70));
    }

    // 3. Glitch noir et blanc, puis SOMÉAN YOYOTTE
    hideSkip(); etym.classList.add('off');
    if (fx) fx.stop();
    await (glitching || glitch());
    H.classList.remove('intro-run'); intro.classList.remove('swap');
    // la montée démarre tout de suite : la présentation commence à apparaître environ 1 s après le nom
    await tween('rise', 1, 1100);
    st.lock = false; st.intro = false;
    store.set('introVue', '1');
    scheduleHint();
  }

  /* ---------- « portfolio » change de police à chaque retour sur l'accueil ---------- */
  const LOGO_FONTS = ['Herr Von Muellerhoff', 'Instrument Serif', 'Abril Fatface', 'Anton', 'Playfair Display',
                      'Gochi Hand', 'Reenie Beanie', 'Fredoka', 'Gluten', 'Pixelify Sans'];
  function setLogoFont(fam) {
    logo.style.fontFamily = `"${fam}", cursive`;
    if (fam === 'Herr Von Muellerhoff') { logo.style.fontSize = ''; logo.style.paddingTop = ''; return; }
    const c = D.createElement('canvas').getContext('2d');
    c.font = `100px "${fam}"`;
    const mob = H.clientWidth <= 700, w = c.measureText('portfolio').width || 300;
    logo.style.fontSize = Math.min((mob ? 84 : 104) * 100 / w, mob ? 28 : 34).toFixed(1) + 'px';
    logo.style.paddingTop = '0';
  }
  function nextLogoFont() {
    const last = store.get('logoPolice');
    const pool = LOGO_FONTS.filter(f => f !== last);
    const fam = pool[Math.random() * pool.length | 0];
    store.set('logoPolice', fam);
    return D.fonts.load(`32px "${fam}"`, 'portfolio').catch(() => {}).then(() => setLogoFont(fam));
  }

  /* ---------- Événements ---------- */
  title.addEventListener('click', () => { if (W.scrollY >= M.S1 * .98) { stopVib(); toggleSY(!st.kTarget); } });
  title.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && W.scrollY >= M.S1 * .98) { e.preventDefault(); stopVib(); toggleSY(!st.kTarget); } });
  logo.addEventListener('click', e => { e.preventDefault(); if (reduce) { W.scrollTo({ top: 0, behavior: 'smooth' }); return; } runIntro(); });
  W.addEventListener('scroll', schedule, { passive: true });
  let rz = 0;
  W.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { measure(); lastK = -1; lastWords = ''; render(); }, 80); });

  // Entrée des cartes
  const cards = $$('.home .card');
  if ('IntersectionObserver' in W && !reduce) {
    cards.forEach(c => c.classList.add('wait'));
    const io = new IntersectionObserver(es => {
      let n = 0;
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const c = e.target;
        io.unobserve(c);
        c.style.transitionDelay = (n++ * 90) + 'ms';
        c.classList.add('in');
        requestAnimationFrame(() => c.classList.remove('wait'));
        setTimeout(() => { c.style.transitionDelay = ''; }, 900 + n * 90);
      });
    }, { threshold: .12 });
    cards.forEach(c => io.observe(c));
  }

  /* ---------- Démarrage ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const start = () => {
    measure(); render();
    if (H.classList.contains('intro-run')) { runIntro(); return; }
    nextLogoFont();
    H.classList.add('ready');
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (!nav || nav.type === 'navigate' || nav.type === 'prerender') {
      // déjà venu : on arrive directement sur les projets
      if (store.get('introVue')) W.scrollTo(0, Math.ceil(M.anchorTop - M.T0 + 1));
      else scheduleHint();
    }
    render();
  };
  if (H.classList.contains('intro-run')) start();
  else Promise.race([D.fonts.load('200px Anton', 'SOMÉAN'), sleep(2500)]).catch(() => {}).then(start);
})();
