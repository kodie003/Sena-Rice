/* Sena Rice — waving, mouse-reactive hero logo.
   The logo is drawn in thin vertical strips, each offset on a travelling sine wave
   (like a flag), with light/shade per strip. The pointer pushes the strips and tilts
   the logo; a click recolours it and bursts rice grains out from the click point. */
(() => {
  const wrap = document.getElementById("heroLogo");
  const canvas = document.getElementById("heroLogoCanvas");
  const fx = document.getElementById("heroFx");
  const hero = document.getElementById("hero");
  const hint = document.getElementById("heroHint");
  if (!wrap || !canvas || !fx) return;

  const ctx = canvas.getContext("2d");
  const fctx = fx.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#ffffff", "#f2cd5c", "#8ed1ff", "#fbe7b5"];
  const SRC_W = 1800, SRC_H = 502;

  const img = new Image();
  img.src = "assets/img/logo-white-hi.webp";

  let dpr = 1, lw = 0, lh = 0, pad = 0, tw = 0, th = 0;
  let tints = [];            // one recoloured copy of the logo per colour
  let cur = 0, prev = 0, mix = 1;

  // smoothed interaction state
  const S = { hover: 0, mu: 0.5, push: 0, tiltX: 0, tiltY: 0, shock: 0, intro: reduced ? 0 : 1 };
  const T = { hover: 0, mu: 0.5, push: 0, tiltX: 0, tiltY: 0 };

  const tint = (hex, index) => {
    const c = document.createElement("canvas");
    c.width = tw; c.height = th;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, tw, th);
    if (index === 0) return c;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const goldText = index === 1;
    const d = x.getImageData(0, 0, tw, th);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      if (p[i + 2] > 150) { p[i] = r; p[i + 1] = g; p[i + 2] = b; }   // white lettering → new colour
      else if (goldText) { p[i] = 255; p[i + 1] = 255; p[i + 2] = 255; } // gold leaf flips to white on gold text
    }
    x.putImageData(d, 0, 0);
    return c;
  };

  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    lw = wrap.getBoundingClientRect().width;
    lh = lw * SRC_H / SRC_W;
    pad = lh * 0.28;
    tw = Math.round(lw * dpr); th = Math.round(lh * dpr);
    canvas.width = tw; canvas.height = Math.round((lh + pad * 2) * dpr);
    canvas.style.height = lh + pad * 2 + "px";
    tints = COLORS.map(tint);

    const hr = hero.getBoundingClientRect();
    fx.width = Math.round(hr.width * dpr); fx.height = Math.round(hr.height * dpr);
  };

  /* ---------- pointer ---------- */
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.2)));
    const near = Math.max(0, 1 - Math.hypot(nx * 0.8, ny * 1.4));
    T.hover = e.pointerType === "mouse" ? 0.25 + near * 0.75 : near;
    T.mu = (e.clientX - r.left) / r.width;
    T.push = -ny;
    T.tiltY = nx * 12;
    T.tiltX = -ny * 9;
  });
  hero.addEventListener("pointerleave", () => { T.hover = 0; T.push = 0; T.tiltX = 0; T.tiltY = 0; });

  /* ---------- rice burst ---------- */
  const grains = [], rings = [];
  const burst = (clientX, clientY) => {
    const hr = hero.getBoundingClientRect();
    const x = (clientX - hr.left) * dpr, y = (clientY - hr.top) * dpr;
    const k = Math.min(1.2, Math.max(0.6, hr.width / 1200)) * dpr;
    const n = reduced ? 40 : 170;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (4 + Math.random() * 13) * k;
      const husk = Math.random() < 0.14;
      grains.push({
        x: x + (Math.random() - 0.5) * 30 * k, y: y + (Math.random() - 0.5) * 16 * k,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5 * k,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        len: (5 + Math.random() * 2.6) * k, wid: (1.15 + Math.random() * 0.35) * k,
        c: husk ? `hsl(${42 + Math.random() * 8}, 70%, ${55 + Math.random() * 12}%)`
                : `hsl(${40 + Math.random() * 12}, ${25 + Math.random() * 35}%, ${92 + Math.random() * 7}%)`,
        life: 0, max: 110 + Math.random() * 70, g: 0.34 * k,
      });
    }
    rings.push({ x, y, r: 10 * k, life: 0, k });
  };

  const trigger = (clientX, clientY) => {
    prev = cur; cur = (cur + 1) % COLORS.length; mix = 0;
    S.shock = 1;
    canvas.classList.remove("is-pop"); void canvas.offsetWidth; canvas.classList.add("is-pop");
    burst(clientX, clientY);
    if (hint) hint.classList.add("is-gone");
  };
  wrap.addEventListener("click", (e) => trigger(e.clientX, e.clientY));
  wrap.setAttribute("role", "button");
  wrap.setAttribute("tabindex", "0");
  wrap.setAttribute("aria-label", "Sena Rice logo. Press to burst rice and change its colour");
  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    trigger(r.left + r.width / 2, r.top + r.height / 2);
  });

  /* ---------- render loop ---------- */
  let running = true, live = false, rafId = 0, last = performance.now(), introStart = 0;
  const kick = () => { if (!rafId && running && live) rafId = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { running = e.isIntersecting; last = performance.now(); kick(); }).observe(hero);

  const drawLogo = (t) => {
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const base = lh * dpr * 0.045;
    const amp = base * (1 + S.hover * 0.9 + S.intro * 2.2);
    const pushAmt = S.push * lh * dpr * 0.16 * S.hover;
    const top = pad * dpr;
    const strip = Math.max(2, Math.round(2 * dpr));
    const sigma2 = 2 * 0.14 * 0.14;
    const layers = mix < 1 ? [[tints[prev], 1 - mix], [tints[cur], mix]] : [[tints[cur], 1]];
    const offs = [];

    for (let sx = 0; sx < tw; sx += strip) {
      const u = sx / tw;
      const ramp = 0.3 + 0.7 * u;                       // anchored on the left, freer on the right
      const ph = u * 6.4 - t * 2.4;
      let dy = amp * ramp * (Math.sin(ph) + 0.35 * Math.sin(u * 13 - t * 3.7));
      const du = u - S.mu;
      dy += pushAmt * Math.exp(-(du * du) / sigma2);
      if (S.shock > 0.001) dy += S.shock * base * 3 * Math.sin(u * 20 - t * 24);
      offs.push([sx, dy, Math.cos(ph) * ramp]);
      for (const [src, a] of layers) {
        ctx.globalAlpha = a;
        ctx.drawImage(src, sx, 0, strip + 1, th, sx, top + dy, strip + 1, th);
      }
    }
    ctx.globalAlpha = 1;

    // light and shade on the folds (only where the logo is painted)
    ctx.globalCompositeOperation = "source-atop";
    for (const [sx, , s] of offs) {
      ctx.fillStyle = s > 0 ? `rgba(255,255,255,${(s * 0.16).toFixed(3)})` : `rgba(4,26,56,${(-s * 0.32).toFixed(3)})`;
      ctx.fillRect(sx, 0, Math.min(strip, tw - sx), H);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const drawFx = (dt) => {
    fctx.clearRect(0, 0, fx.width, fx.height);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt; r.r += 9 * r.k * dt;
      const a = 1 - r.life / 28;
      if (a <= 0) { rings.splice(i, 1); continue; }
      fctx.strokeStyle = `rgba(242,205,92,${a * 0.8})`;
      fctx.lineWidth = 3 * r.k * a;
      fctx.beginPath(); fctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); fctx.stroke();
    }
    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i];
      g.life += dt;
      if (g.life > g.max || g.y > fx.height + 40) { grains.splice(i, 1); continue; }
      g.vx *= Math.pow(0.985, dt); g.vy = g.vy * Math.pow(0.985, dt) + g.g * dt;
      g.x += g.vx * dt; g.y += g.vy * dt; g.r += g.vr * dt;
      const a = Math.min(1, (g.max - g.life) / 40);
      fctx.save();
      fctx.globalAlpha = a;
      fctx.translate(g.x, g.y); fctx.rotate(g.r);
      fctx.fillStyle = g.c;
      fctx.beginPath(); fctx.ellipse(0, 0, g.len, g.wid, 0, 0, Math.PI * 2); fctx.fill();
      fctx.restore();
    }
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  function frame(now) {
    rafId = 0;
    if (!running) return;
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;
    const t = reduced ? 0 : now / 1000;

    if (document.body.classList.contains("is-ready")) {
      if (!introStart) introStart = now;
      S.intro = reduced ? 0 : Math.max(0, 1 - (now - introStart) / 2200);
    }
    const k = 1 - Math.pow(0.9, dt);
    for (const key of ["hover", "mu", "push", "tiltX", "tiltY"]) S[key] = lerp(S[key], T[key], k);
    S.shock *= Math.pow(0.93, dt);
    mix = Math.min(1, mix + 0.045 * dt);

    wrap.style.transform = `perspective(1100px) rotateX(${S.tiltX.toFixed(2)}deg) rotateY(${S.tiltY.toFixed(2)}deg)`;
    drawLogo(t);
    drawFx(dt);
    kick();
  }

  const start = () => {
    layout();
    wrap.classList.add("is-live");
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
    live = true;
    kick();
  };
  if (img.complete && img.naturalWidth) start();
  else img.addEventListener("load", start, { once: true });
})();
