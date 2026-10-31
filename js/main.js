/* Sena Rice — shared site interactions (each block runs only if its page has the markup) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WA = "233240659154";
  const body = document.body;

  /* ------------------------------------------------------------
     Hero video (home): pick a source sized for the device
     ------------------------------------------------------------ */
  const video = $("#heroVideo");
  if (video) {
    const portraitPhone = matchMedia("(max-width: 700px) and (orientation: portrait)").matches;
    // phones only autoplay a video that is muted *as a property* and inline
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.src = portraitPhone ? video.dataset.srcMobile : video.dataset.srcDesktop;
    video.load();
  }
  const playHero = () => { if (video && video.paused) video.play().catch(() => {}); };
  if (video) {
    // only reveal the video once frames are actually moving, so a phone's own play button never shows
    video.addEventListener("playing", () => video.classList.add("is-playing"));
    video.addEventListener("pause", () => video.classList.remove("is-playing"));
    playHero();
    video.addEventListener("canplay", playHero);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) playHero(); });
    // if the phone refuses autoplay (e.g. iOS Low Power Mode), start on the first touch or scroll
    ["touchstart", "pointerdown", "scroll", "keydown"].forEach((ev) => addEventListener(ev, playHero, { once: true, passive: true }));
  }

  /* ------------------------------------------------------------
     LOADER (home) — rice pours from the bag into the bowl as the page loads
     ------------------------------------------------------------ */
  const loader = $("#loader");
  const reveal = () => {
    body.classList.remove("is-loading");
    body.classList.add("is-ready");
    playHero();
    try { sessionStorage.setItem("sena-loaded", "1"); } catch (e) {}
  };

  if (loader && document.documentElement.classList.contains("skip-loader")) {
    loader.remove();
    reveal();
  } else if (loader) {
    const stage = $("#loaderStage");
    const bag = $("#loaderBag");
    const canvas = $("#grainCanvas");
    const ctx = canvas.getContext("2d");
    const mound = $("#riceMound");
    const pctEl = $("#loaderPct");
    const barEl = $("#loaderBar");

    let W = 0, H = 0;
    const sizeCanvas = () => {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    addEventListener("resize", sizeCanvas);

    // Each task counts toward real loading progress
    let done = 0;
    const tasks = [];
    const track = (p) => tasks.push(Promise.resolve(p).catch(() => {}).then(() => done++));
    const preload = (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });
    ["assets/img/logo-white-hi.webp", "assets/img/bag.webp", "assets/video/hero-poster.jpg"].forEach((s) => track(preload(s)));
    track(document.fonts ? document.fonts.ready : null);
    track(new Promise((res) => {
      if (!video || video.readyState >= 3) return res();
      video.addEventListener("canplaythrough", res, { once: true });
      video.addEventListener("error", res, { once: true });
    }));
    track(new Promise((res) => (document.readyState === "complete" ? res() : addEventListener("load", res, { once: true }))));
    const total = tasks.length;

    const MIN_MS = reduced ? 600 : 3800; // long enough to enjoy the pour
    const MAX_MS = 9000;                 // never hold visitors hostage
    const t0 = performance.now();
    let shown = 0, pouring = false, finished = false;
    const grains = [];

    setTimeout(() => { bag.classList.add("is-pouring"); pouring = true; }, reduced ? 0 : 1150);

    const bowlGeom = () => {
      const bw = W * 0.72, scale = bw / 240;
      return { top: H - 130 * scale, scale, cx: W / 2, half: bw / 2 };
    };
    // mound offset in SVG units: 62 (empty) → -14 (heaped)
    const moundOffset = (p) => 62 - 76 * p;

    const spawn = () => {
      grains.push({
        x: W * 0.51 + (Math.random() - 0.5) * 8,
        y: H * 0.30 + 4,
        vx: (Math.random() - 0.5) * 0.7 - 0.1,
        vy: 0.6 + Math.random() * 0.8,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        len: 3.2 + Math.random() * 1.8,
        c: `hsl(${40 + Math.random() * 10}, ${20 + Math.random() * 30}%, ${90 + Math.random() * 9}%)`,
        bounce: false,
      });
    };

    const tick = (now) => {
      const elapsed = now - t0;
      const real = elapsed > MAX_MS ? 1 : done / total;
      const target = Math.min(real, Math.min(1, elapsed / MIN_MS));
      shown += (target - shown) * 0.08;
      if (target === 1 && shown > 0.995) shown = 1;

      const pct = Math.round(shown * 100);
      pctEl.textContent = pct + "%";
      barEl.style.width = pct + "%";
      mound.setAttribute("transform", `translate(0 ${moundOffset(shown).toFixed(2)})`);

      ctx.clearRect(0, 0, W, H);
      if (pouring && !finished) for (let i = 0; i < (W > 300 ? 5 : 4); i++) spawn();
      const b = bowlGeom();
      const surface = b.top + (39 + moundOffset(shown)) * b.scale;
      for (let i = grains.length - 1; i >= 0; i--) {
        const g = grains[i];
        g.vy += 0.32; g.x += g.vx; g.y += g.vy; g.r += g.vr;
        const dx = Math.abs(g.x - b.cx) / b.half;
        const land = surface + dx * dx * 26 * b.scale;
        if (g.y >= land && !g.bounce) {
          g.bounce = true; g.y = land; g.vy *= -0.25; g.vx = (Math.random() - 0.5) * 2.4; g.life = 10;
        }
        if (g.bounce && --g.life <= 0) { grains.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(g.x, g.y); ctx.rotate(g.r);
        ctx.fillStyle = g.c;
        ctx.beginPath(); ctx.ellipse(0, 0, g.len, 1.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      if (shown >= 1 && !finished) { finished = true; setTimeout(finish, 350); }
      if (!finished || grains.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    function finish() {
      bag.classList.remove("is-pouring");
      bag.classList.add("is-finished");
      setTimeout(() => {
        loader.classList.add("is-done");
        reveal();
        setTimeout(() => loader.remove(), 1300);
      }, reduced ? 0 : 700);
    }
  }

  /* ------------------------------------------------------------
     NAV — solid on scroll, hide on scroll down, hamburger
     ------------------------------------------------------------ */
  const nav = $("#nav");
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    body.classList.toggle("past-hero", !video || y > innerHeight * 0.6);
    if (y > innerHeight && y > lastY + 4 && !body.classList.contains("menu-open")) nav.classList.add("is-hidden");
    else if (y < lastY - 4 || y < innerHeight) nav.classList.remove("is-hidden");
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger"), mmenu = $("#mobileMenu");
  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mmenu.setAttribute("aria-hidden", !open);
  };
  burger.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  $$("a", mmenu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ------------------------------------------------------------
     Reveal on scroll + light parallax
     ------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const sibs = $$(".reveal:not(.is-in)", e.target.parentElement);
      e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 4) * 90 + "ms";
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  const para = [[$(".about__main img"), 0.08], [$(".why__bg"), 0.12], [$(".pbanner__img"), -0.25]].filter(([el]) => el);
  if (!reduced && para.length) {
    const loop = () => {
      para.forEach(([el, k]) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const off = (r.top + r.height / 2 - innerHeight / 2) * -k;
        el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0) scale(1.1)`;
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------
     Lightbox (shared)
     ------------------------------------------------------------ */
  const lb = $("#lb"), lbImg = $("#lbImg"), lbCount = $("#lbCount");
  let group = [], idx = 0, lastFocus = null;
  const show = (i) => {
    idx = (i + group.length) % group.length;
    lbImg.src = group[idx].src; lbImg.alt = group[idx].alt || "";
    lbCount.textContent = `${idx + 1} / ${group.length}`;
  };
  const openLb = (items, i) => {
    group = items; lastFocus = document.activeElement; show(i);
    lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden"; $("#lbClose").focus();
  };
  const closeLb = () => {
    lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
    body.style.overflow = ""; lastFocus && lastFocus.focus();
  };
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", () => show(idx - 1));
  $("#lbNext").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  let tx = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); });

  const toItems = (buttons) => buttons.map((b) => ({ src: b.dataset.src, alt: $("img", b).alt }));
  const bindGroup = (buttons) => {
    const items = toItems(buttons);
    buttons.forEach((b, i) => b.addEventListener("click", () => { if (!b.dataset.dragged) openLb(items, i); }));
  };
  bindGroup($$("[data-lb='tv']"));

  /* ------------------------------------------------------------
     SHOP — pack size, quantity, WhatsApp order
     ------------------------------------------------------------ */
  const orderWa = $("#orderWa");
  if (orderWa) {
    const segs = $$(".seg__btn"), qty = $("#qty"), pbag = $("#productBag");
    let size = "4.5kg";
    const updateOrder = () => {
      const n = Math.max(1, parseInt(qty.value, 10) || 1);
      const what = size === "bulk sacks" ? `${n} bulk sack${n > 1 ? "s" : ""}` : `${n} × ${size} pack${n > 1 ? "s" : ""}`;
      const msg = `Hello Sena Rice! I'd like to order ${what} of Sena Long Grain Premium Rice. Please share the price and delivery details.`;
      orderWa.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    };
    segs.forEach((b) => b.addEventListener("click", () => {
      segs.forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", x === b); });
      size = b.dataset.size;
      pbag.classList.toggle("is-small", size === "1kg");
      updateOrder();
    }));
    $("#qtyMinus").addEventListener("click", () => { qty.value = Math.max(1, (+qty.value || 1) - 1); updateOrder(); });
    $("#qtyPlus").addEventListener("click", () => { qty.value = (+qty.value || 0) + 1; updateOrder(); });
    qty.addEventListener("input", updateOrder);
    updateOrder();
  }

  /* ------------------------------------------------------------
     MEDIA — billboards crossfade + advert rail
     ------------------------------------------------------------ */
  const bbs = $$("#bbTrack img"), bbDots = $("#bbDots");
  if (bbs.length) {
    let bbi = 0, bbTimer;
    const goBb = (i) => {
      bbi = (i + bbs.length) % bbs.length;
      bbs.forEach((im, k) => im.classList.toggle("is-on", k === bbi));
      $$("button", bbDots).forEach((d, k) => d.classList.toggle("is-on", k === bbi));
    };
    const restartBb = () => { clearInterval(bbTimer); bbTimer = setInterval(() => goBb(bbi + 1), 5000); };
    bbs.forEach((_, i) => {
      const d = document.createElement("button");
      d.setAttribute("aria-label", `Show billboard ${i + 1}`);
      d.addEventListener("click", () => { goBb(i); restartBb(); });
      bbDots.appendChild(d);
    });
    goBb(0); restartBb();
  }

  const rail = $("#rail");
  if (rail) {
    const adAlts = ["Time turns grains into nourishment", "Nature's finest, Ghana's pride", "Ghana feeds Ghana", "Taste the pride of Ghana",
      "From farm to table", "Every delicious recipe starts with Sena Rice", "Cooked in silence, served with love", "Goodness in every grain",
      "Superior taste, superior rice", "Wholesome and nutritious", "Grain by grain perfection", "Superior taste with plain rice and stew",
      "Rich in nutrients", "Cook with confidence", "How do you want your rice?", "Happy Mother's Day from Sena Rice",
      "Happy Father's Day from Sena Rice", "Eid Mubarak from Sena Rice", "Together we cheer: World Cup", "Taste the difference"];
    rail.innerHTML = adAlts.map((alt, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `<button data-src="assets/img/ad-${n}.webp"><img src="assets/img/ad-${n}.webp" alt="${alt}" loading="lazy" draggable="false"></button>`;
    }).join("");
    const originals = $$("button", rail);
    bindGroup(originals);
    // a second copy of the adverts lets the strip loop seamlessly
    const items = toItems(originals);
    originals.forEach((b, i) => {
      const c = b.cloneNode(true);
      c.setAttribute("aria-hidden", "true"); c.tabIndex = -1;
      c.addEventListener("click", () => { if (!c.dataset.dragged) openLb(items, i); });
      rail.appendChild(c);
    });
    const railBtns = $$("button", rail);
    const step = () => (railBtns[0].getBoundingClientRect().width + 18) * 2;
    $("#railPrev").addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
    $("#railNext").addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));
    // mouse drag-to-scroll
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const d = e.clientX - sx; moved = Math.max(moved, Math.abs(d));
      if (moved > 6) rail.classList.add("is-drag");
      rail.scrollLeft = sl - d;
    });
    addEventListener("pointerup", () => {
      if (!down) return; down = false;
      rail.classList.remove("is-drag");
      if (moved > 6) { railBtns.forEach((b) => (b.dataset.dragged = "1")); setTimeout(() => railBtns.forEach((b) => delete b.dataset.dragged), 50); }
    });

    // auto-scroll: drifts continuously, pauses while the visitor hovers, drags, swipes or uses the arrows
    let pos = rail.scrollLeft, pausedUntil = 0, hovering = false, railVisible = false, lastT = 0;
    const half = () => rail.scrollWidth / 2;
    const hold = (ms = 2500) => { pausedUntil = performance.now() + ms; };
    rail.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
    rail.addEventListener("pointerleave", () => { hovering = false; hold(600); });
    rail.addEventListener("touchstart", () => hold(4000), { passive: true });
    rail.addEventListener("wheel", () => hold(2500), { passive: true });
    rail.addEventListener("pointerdown", () => hold(3000));
    $("#railPrev").addEventListener("click", () => hold(3500));
    $("#railNext").addEventListener("click", () => hold(3500));
    new IntersectionObserver(([en]) => { railVisible = en.isIntersecting; }).observe(rail);
    const drift = (t) => {
      const dt = lastT ? Math.min(50, t - lastT) : 16; lastT = t;
      const h = half();
      if (Math.abs(rail.scrollLeft - pos) > 2) pos = rail.scrollLeft;   // the visitor moved it
      if (!reduced && railVisible && !hovering && !down && t > pausedUntil) {
        pos += dt * 0.045;                                                // ~45px per second
        rail.scrollLeft = pos;
      }
      if (h > 0 && rail.scrollLeft >= h) { pos = rail.scrollLeft - h; rail.scrollLeft = pos; }
      else if (rail.scrollLeft <= 0 && !hovering && t <= pausedUntil) { pos = h; rail.scrollLeft = pos; }
      requestAnimationFrame(drift);
    };
    requestAnimationFrame(drift);
  }

  /* ------------------------------------------------------------
     GALLERY — masonry
     ------------------------------------------------------------ */
  const masonry = $("#masonry");
  if (masonry) {
    const farmAlts = ["Sena Rice team member in the rice field", "Rice heads swaying against a blue sky", "Inspecting the crop before harvest",
      "Farmer standing among the rice", "Combine harvester at work", "Celebrating harvest day", "Field visit by the Sena team",
      "Harvest team bagging paddy", "Operators preparing the harvester", "Paddy sacks lined up in the field", "Hands checking the ripening rice",
      "Loading the harvest", "Harvester crossing the field", "Rice heads close up", "Supervising the harvest", "Bagging fresh paddy",
      "Harvester in the golden field", "A weaver bird over the rice field"];
    // fixed layout that always ends flush on a 3-column grid: blocks of [tall, small, tall, small]
    // spanning two rows, with one panoramic band (t = tall, s = small, w = wide)
    const layout = [[1, "t"], [5, "s"], [3, "t"], [9, "s"], [6, "t"], [8, "s"], [4, "t"], [10, "s"], [13, "w"], [2, "s"],
      [7, "t"], [15, "s"], [11, "t"], [16, "s"], [12, "t"], [17, "s"], [14, "t"], [18, "s"]];
    masonry.innerHTML = layout.map(([k, t]) => {
      const n = String(k).padStart(2, "0");
      return `<button class="reveal is-${t}" data-src="assets/img/farm-${n}.webp"><img src="assets/img/farm-${n}.webp" alt="${farmAlts[k - 1]}" loading="lazy"></button>`;
    }).join("");
    const mBtns = $$("button", masonry);
    mBtns.forEach((el) => io.observe(el));
    bindGroup(mBtns);
  }

  /* ------------------------------------------------------------
     RENTALS — thumbnails
     ------------------------------------------------------------ */
  const rentMain = $("#rentMain");
  if (rentMain) {
    const thumbs = $$("#rentThumbs button");
    thumbs.forEach((t) => t.addEventListener("click", () => {
      if (t.classList.contains("is-on")) return openLb(toItems(thumbs), thumbs.indexOf(t));
      thumbs.forEach((x) => x.classList.toggle("is-on", x === t));
      rentMain.style.opacity = 0;
      setTimeout(() => { rentMain.onload = () => (rentMain.style.opacity = 1); rentMain.src = t.dataset.src; rentMain.alt = $("img", t).alt; }, 200);
    }));
    rentMain.parentElement.addEventListener("click", () => openLb(toItems(thumbs), thumbs.findIndex((x) => x.classList.contains("is-on"))));
  }

  /* ------------------------------------------------------------
     CONTACT — form → WhatsApp or email (no backend needed)
     ------------------------------------------------------------ */
  const form = $("#contactForm");
  if (form) {
    const err = $("#formErr");
    let via = "wa";
    $$("button[type=submit]", form).forEach((b) => b.addEventListener("click", () => (via = b.dataset.via)));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = form.elements, name = f.name.value.trim(), phone = f.phone.value.trim();
      if (!name || !phone) { err.textContent = "Please add your name and phone number so we can reach you."; return; }
      err.textContent = "";
      const topic = f.topic.value, msg = f.message.value.trim();
      const text = `Hello Sena Rice,\n\nName: ${name}\nPhone: ${phone}\nInterested in: ${topic}${msg ? `\n\n${msg}` : ""}`;
      if (via === "mail") {
        location.href = `mailto:senaricegh@gmail.com?subject=${encodeURIComponent("Website enquiry: " + topic)}&body=${encodeURIComponent(text)}`;
      } else {
        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    });
  }

  /* ------------------------------------------------------------
     Drifting rice grains for empty margins
     ------------------------------------------------------------ */
  $$("[data-scatter]").forEach((el) => {
    for (let i = 0, n = +el.dataset.scatter || 12; i < n; i++) {
      const g = document.createElement("i");
      g.style.left = 8 + Math.random() * 80 + "%";
      g.style.top = 6 + Math.random() * 88 + "%";
      g.style.setProperty("--r", Math.round(Math.random() * 180) + "deg");
      g.style.setProperty("--d", (5 + Math.random() * 5).toFixed(1) + "s");
      g.style.animationDelay = -(Math.random() * 8).toFixed(1) + "s";
      g.style.scale = (0.8 + Math.random() * 0.6).toFixed(2);
      el.appendChild(g);
    }
  });

  /* ------------------------------------------------------------
     FOOTER — plant leans toward the pointer; grain bed scatters and settles
     ------------------------------------------------------------ */
  const footer = $(".footer"), plant = $("#footerPlant"), gCanvas = $("#footerGrains");
  if (footer && plant) {
    footer.addEventListener("pointermove", (e) => {
      const r = plant.getBoundingClientRect();
      const lean = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 500)) * 5;
      plant.style.setProperty("--lean", lean.toFixed(2) + "deg");
    });
    footer.addEventListener("pointerleave", () => plant.style.setProperty("--lean", "0deg"));
  }

  if (footer && gCanvas) {
    const gctx = gCanvas.getContext("2d");
    const GRAV = 0.38, AIR = 0.992, BOUNCE = 0.22, FRICTION = 0.82, REPOSE = 0.45;
    let W = 0, H = 0, dpr = 1, bed = null, grains = [], sprites = [];
    let mouse = null, raf = 0, visible = false;

    // outline of the real rice-pile photo: top edge per column (0 = top of image, 1 = bottom)
    const PILE = { w: 1200, h: 534, top: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.406, 0.356, 0.328, 0.315, 0.303, 0.283, 0.262, 0.26, 0.262, 0.266, 0.24, 0.191, 0.163, 0.154, 0.14, 0.114, 0.118, 0.101, 0.092, 0.081, 0.075, 0.067, 0.062, 0.06, 0.039, 0.032, 0.039, 0.045, 0.036, 0.024, 0.022, 0.017, 0.002, 0.0, 0.024, 0.026, 0.021, 0.017, 0.017, 0.026, 0.041, 0.043, 0.06, 0.067, 0.075, 0.096, 0.09, 0.09, 0.12, 0.14, 0.144, 0.146, 0.159, 0.174, 0.2, 0.219, 0.234, 0.245, 0.255, 0.257, 0.277, 0.298, 0.3, 0.301, 0.277, 0.277, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] };
    const pileImg = new Image();
    pileImg.src = "assets/img/rice-pile.webp";
    let heights = null;

    const makeSprite = (light, mid, dark) => {
      // slim long grain, about 4:1, like Sena's long-grain rice
      const c = document.createElement("canvas");
      c.width = Math.ceil(16 * dpr); c.height = Math.ceil(5 * dpr);
      const x = c.getContext("2d");
      x.scale(dpr, dpr);
      const g = x.createLinearGradient(0, 0.4, 0, 4.6);
      g.addColorStop(0, light); g.addColorStop(0.45, mid); g.addColorStop(1, dark);
      x.fillStyle = g;
      x.beginPath(); x.ellipse(8, 2.5, 7.4, 1.85, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "rgba(255,255,255,.75)";
      x.beginPath(); x.ellipse(7, 1.7, 4.2, 0.5, 0, 0, Math.PI * 2); x.fill();
      return c;
    };
    // height of the pile above the canvas bottom at x (from the photo mounds once laid out)
    const pile = (x) => {
      if (heights) return heights[Math.max(0, Math.min(heights.length - 1, Math.round(x)))];
      return 30 + 8 * Math.sin(x / 90 + 1) + 6 * Math.sin(x / 37 + 2);
    };
    const floorAt = (g, x) => H - pile(x) + g.depth;
    const drawGrain = (ctx, sp, x, y, a) => {
      const c = Math.cos(a) * dpr, s = Math.sin(a) * dpr;
      ctx.setTransform(c, s, -s, c, x * dpr, y * dpr);
      ctx.drawImage(sp, -8, -2.5, 16, 5);
    };
    const pickSprite = () => sprites[Math.random() < 0.15 ? 2 : Math.random() < 0.5 ? 1 : 0];

    const build = () => {
      const r = gCanvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      gCanvas.width = Math.round(W * dpr); gCanvas.height = Math.round(H * dpr);
      sprites = [makeSprite("#ffffff", "#f1efe8", "#bdb7a8"), makeSprite("#fdfcf8", "#e8e4d8", "#aaa393"), makeSprite("#fffaf0", "#efe6cf", "#c2b48f")];

      // lay real rice mounds side by side along the bottom; record the combined surface
      bed = document.createElement("canvas");
      bed.width = gCanvas.width; bed.height = gCanvas.height;
      const b = bed.getContext("2d");
      const photoOk = pileImg.naturalWidth > 0;
      heights = photoOk ? new Float32Array(Math.ceil(W) + 1) : null;
      const base = W < 600 ? 58 : 80;
      const mounds = [];
      for (let x = -base * 0.8; x < W + base; ) {
        const sc = 0.8 + Math.random() * 0.45;
        mounds.push({ x, sc, flip: Math.random() < 0.5 });
        x += base * 2.25 * sc * (0.36 + Math.random() * 0.12);
      }
      mounds.push({ x: W * 0.9 - base * 1.6, sc: 1.45, flip: false });   // bigger heap under the plant
      mounds.sort((p, q) => p.sc - q.sc);
      for (const m of photoOk ? mounds : []) {
        const h = base * m.sc, w = h * PILE.w / PILE.h, y = H - h + 6;
        b.setTransform(m.flip ? -dpr : dpr, 0, 0, dpr, (m.flip ? m.x + w : m.x) * dpr, y * dpr);
        b.drawImage(pileImg, 0, 0, w, h);
        for (let px = Math.max(0, Math.floor(m.x)); px < Math.min(W, m.x + w); px++) {
          let u = (px - m.x) / w; if (m.flip) u = 1 - u;
          const t = PILE.top[Math.min(PILE.top.length - 1, Math.floor(u * PILE.top.length))];
          heights[px] = Math.max(heights[px], h * (1 - t) - 6);
        }
      }
      b.setTransform(1, 0, 0, 1, 0, 0);
      const shade = b.createLinearGradient(0, bed.height * 0.55, 0, bed.height);
      shade.addColorStop(0, "rgba(4,26,56,0)"); shade.addColorStop(1, "rgba(4,26,56,.28)");
      b.globalCompositeOperation = "source-atop"; b.fillStyle = shade; b.fillRect(0, 0, bed.width, bed.height);

      // loose surface grains — these are the ones that move
      grains = [];
      for (let i = 0, n = Math.min(900, Math.round(W * 0.5)); i < n; i++) {
        const g = { x: Math.random() * W, depth: Math.random() * 10, a: (Math.random() - 0.5) * 2.6, vx: 0, vy: 0, va: 0, moving: false, sp: pickSprite() };
        g.y = floorAt(g, g.x);
        grains.push(g);
      }
      grains.sort((p, q) => p.depth - q.depth);
      render();
    };

    const render = () => {
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, gCanvas.width, gCanvas.height);
      gctx.drawImage(bed, 0, 0);
      for (const g of grains) drawGrain(gctx, g.sp, g.x, g.y, g.a);
    };

    const kick = (g, vx, vy) => { g.vx += vx; g.vy += vy; g.va += vx * 0.05 + (Math.random() - 0.5) * 0.25; g.moving = true; };

    const step = () => {
      raf = 0;
      let active = 0;
      // the pointer only disturbs grains while it is moving through them
      if (mouse && (mouse.vx || mouse.vy)) {
        // cap the pointer's speed so a fast flick brushes grains rather than firing them
        const raw = Math.hypot(mouse.vx, mouse.vy), speed = Math.min(16, raw);
        const mvx = raw ? mouse.vx / raw * speed : 0, mvy = raw ? mouse.vy / raw * speed : 0;
        const R = 26 + speed * 1.2;
        for (const g of grains) {
          const dx = g.x - mouse.x, dy = g.y - mouse.y;
          if (dx > R || dx < -R || dy > R || dy < -R) continue;
          const d = Math.hypot(dx, dy);
          if (d > R) continue;
          const k = (1 - d / R) * (0.6 + Math.random() * 0.8);
          kick(g, mvx * 0.32 * k + (dx / (d || 1)) * 0.5 * k,
                  -(0.6 + speed * 0.09) * k + Math.min(0, mvy) * 0.15 * k);
        }
        mouse.vx = 0; mouse.vy = 0;
      }
      for (const g of grains) {
        if (!g.moving) continue;
        active++;
        g.vy += GRAV;
        g.vx *= AIR; g.vy *= AIR;
        g.x += g.vx; g.y += g.vy; g.a += g.va;
        if (g.x < 3) { g.x = 3; g.vx = Math.abs(g.vx) * 0.4; }
        if (g.x > W - 3) { g.x = W - 3; g.vx = -Math.abs(g.vx) * 0.4; }
        const fl = floorAt(g, g.x);
        if (g.y >= fl) {
          g.y = fl;
          if (g.vy > 1.2) {                       // small bounce off the pile
            g.vy = -g.vy * BOUNCE;
            g.vx *= 0.7; g.va *= 0.6;
          } else {                                // on the surface: slide downhill, then rest
            g.vy = 0;
            const slope = (floorAt(g, g.x + 2) - floorAt(g, g.x - 2)) / 4;
            if (Math.abs(slope) > REPOSE) g.vx += slope * 0.25;
            g.vx *= FRICTION; g.va *= 0.7;
            if (Math.abs(g.vx) < 0.04 && Math.abs(slope) <= REPOSE) { g.vx = 0; g.va = 0; g.moving = false; }
          }
        }
      }
      render();
      if (visible && active) raf = requestAnimationFrame(step);
    };
    const wake = () => { if (!raf && visible && !reduced) raf = requestAnimationFrame(step); };

    footer.addEventListener("pointermove", (e) => {
      const r = gCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (mouse) { mouse.vx += x - mouse.x; mouse.vy += y - mouse.y; mouse.x = x; mouse.y = y; }
      else mouse = { x, y, vx: 0, vy: 0 };
      if (y > H - 220) wake();
    });
    footer.addEventListener("pointerleave", () => { mouse = null; });
    footer.addEventListener("pointerdown", (e) => {
      if (reduced || e.target.closest("#footerPlant")) return;
      const r = gCanvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (y < H - 140) return;
      for (const g of grains) {
        const d = Math.hypot(g.x - x, g.y - y);
        if (d > 90) continue;
        const k = (1 - d / 90) * (0.5 + Math.random() * 0.7);
        kick(g, (g.x - x) * 0.07 * k + (Math.random() - 0.5) * 1.6, -(4 + Math.random() * 3.5) * k);
      }
      wake();
    });

    // tapping the plant shakes grains off its heads onto the pile, then returns to the top
    if (plant) {
      const svg = $(".fplant", plant);
      const heads = $$(".fplant__pan ellipse", plant);
      const extras = [];
      let busy = false;
      plant.addEventListener("click", () => {
        if (busy) return;
        busy = true;
        svg.classList.remove("is-shaking"); void svg.getBoundingClientRect(); svg.classList.add("is-shaking");
        const pick = heads.filter((el) => !el.classList.contains("is-fallen")).sort(() => Math.random() - 0.5).slice(0, 40);
        pick.forEach((el, i) => setTimeout(() => {
          const b = el.getBoundingClientRect(), cr = gCanvas.getBoundingClientRect();
          el.classList.add("is-fallen");
          const x = b.left + b.width / 2 - cr.left, y = b.top + b.height / 2 - cr.top;
          if (x < 0 || x > W || reduced) return;   // part of the plant sits off-screen
          const g = { x, y, depth: Math.random() * 14, a: Math.random() * Math.PI, vx: (Math.random() - 0.5) * 1.8 - 0.5, vy: -Math.random() * 1.5,
                      va: (Math.random() - 0.5) * 0.3, moving: true, sp: pickSprite() };
          grains.push(g); extras.push(g);
          if (extras.length > 320) grains.splice(grains.indexOf(extras.shift()), 1);
          wake();
        }, 60 + i * 20));
        setTimeout(() => heads.forEach((el) => el.classList.remove("is-fallen")), 6000); // the heads fill back in
        setTimeout(() => { busy = false; scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); }, reduced ? 300 : 1900);
      });
    }

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(gCanvas);
    let lastW = 0, rt;
    const onResize = () => { const w = gCanvas.getBoundingClientRect().width; if (Math.abs(w - lastW) > 2) { lastW = w; build(); } };
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(onResize, 150); });
    if (pileImg.complete && pileImg.naturalWidth) onResize();
    else { pileImg.addEventListener("load", onResize, { once: true }); pileImg.addEventListener("error", onResize, { once: true }); }
  }

  $("#year").textContent = new Date().getFullYear();
})();
