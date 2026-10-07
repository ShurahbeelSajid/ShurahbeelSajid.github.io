/* Progressive enhancement for the site. The page is fully readable without this file.
   No network requests, no storage beyond the visitor's own theme choice. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function prefersReducedMotion() {
    return reduceMotionQuery.matches;
  }

  function onMediaChange(mql, fn) {
    if (mql.addEventListener) mql.addEventListener("change", fn);
    else if (mql.addListener) mql.addListener(fn);
  }

  function each(selector, fn, scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(selector), fn);
  }

  /* ---------------------------------------------------------------- Theme
     The site follows the visitor's OS colour scheme; there is no manual toggle.
     Re-tint the hero flow field when the OS setting changes. */
  function initTheme() {
    onMediaChange(darkQuery, function () {
      document.dispatchEvent(new CustomEvent("themechange"));
    });
  }

  /* ------------------------------------------------- Header, progress, menu */
  function initHeader() {
    var header = document.querySelector("[data-header]");
    var bar = document.querySelector(".scroll-progress span");
    var menuBtn = document.querySelector("[data-menu-toggle]");
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (header) header.classList.toggle("is-scrolled", y > 8);
      if (bar) {
        var max = root.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      }
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();

    if (!header || !menuBtn) return;

    function setOpen(open) {
      header.classList.toggle("nav-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    menuBtn.addEventListener("click", function () {
      setOpen(!header.classList.contains("nav-open"));
    });
    each(".nav__link", function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    }, header);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) {
        setOpen(false);
        menuBtn.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (header.classList.contains("nav-open") && !header.contains(e.target)) setOpen(false);
    });
    onMediaChange(window.matchMedia("(min-width: 881px)"), function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------------------------------------------------- Active nav section */
  function initActiveNav() {
    if (!("IntersectionObserver" in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
    var byId = {};
    links.forEach(function (link) {
      var id = (link.getAttribute("href") || "").slice(1);
      if (id && document.getElementById(id)) byId[id] = link;
    });

    function setActive(id) {
      links.forEach(function (link) {
        var on = link === byId[id];
        link.classList.toggle("is-active", on);
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(byId).forEach(function (id) {
      observer.observe(document.getElementById(id));
    });
    var hero = document.getElementById("top");
    if (hero) observer.observe(hero);
  }

  /* --------------------------------------------------------- Scroll reveal */
  function initReveal() {
    each("[data-stagger]", function (group) {
      var i = 0;
      Array.prototype.forEach.call(group.children, function (child) {
        if (!child.classList.contains("reveal")) return;
        child.style.setProperty("--reveal-delay", i * 90 + "ms");
        child.setAttribute("data-reveal-delay", String(i * 90));
        i += 1;
      });
    });

    var items = document.querySelectorAll(".reveal");

    function show(el) {
      el.classList.add("is-visible");
      var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
      // After the entrance finishes, switch cards to their snappier hover transitions.
      window.setTimeout(function () {
        el.classList.add("is-settled");
      }, 950 + delay);
    }

    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      Array.prototype.forEach.call(items, show);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    Array.prototype.forEach.call(items, function (el) {
      observer.observe(el);
    });
  }

  /* --------------------------------------------------------- Hero rotator */
  function initRotator() {
    var el = document.querySelector("[data-rotator]");
    if (!el) return;
    var items = el.querySelectorAll(".rotator__item");
    if (items.length < 2) return;

    var index = 0;
    var timer = 0;
    var inView = true;

    function advance() {
      var current = items[index];
      index = (index + 1) % items.length;
      var next = items[index];
      current.classList.remove("is-active");
      current.classList.add("is-leaving");
      next.classList.remove("is-leaving");
      next.classList.add("is-active");
      window.setTimeout(function () {
        current.classList.remove("is-leaving");
      }, 700);
    }

    function stop() {
      window.clearInterval(timer);
      timer = 0;
    }

    function start() {
      stop();
      if (prefersReducedMotion() || !inView || document.hidden) return;
      timer = window.setInterval(advance, 3200);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        start();
      }).observe(el);
    }
    document.addEventListener("visibilitychange", start);
    onMediaChange(reduceMotionQuery, start);
    start();
  }

  /* -------------------------------------------- Card pointer spotlight */
  function initSpotlight() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    each("[data-spotlight]", function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - rect.left + "px");
        card.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ------------------------- One-shot "live" animations ([data-live] → .is-live) */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var duration = 1600;
    var start = 0;
    function frame(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(1) + "%";
      if (t < 1) window.requestAnimationFrame(frame);
    }
    el.textContent = "0.0%";
    window.requestAnimationFrame(frame);
  }

  function initLive() {
    // Bar lengths come from data-value so the chart stays in sync with the HTML.
    each(".bar[data-value]", function (bar) {
      bar.style.setProperty("--v", bar.getAttribute("data-value"));
    });

    var targets = document.querySelectorAll("[data-live]");
    function activate(el) {
      el.classList.add("is-live");
      if (!prefersReducedMotion()) each("[data-count]", countUp, el);
    }
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, activate);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        activate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------- Email link (assembled at runtime) */
  function initEmail() {
    each("[data-email]", function (link) {
      var user = link.getAttribute("data-user");
      var domain = link.getAttribute("data-domain");
      if (!user || !domain) return;
      var address = user + "@" + domain;
      link.setAttribute("href", "mailto:" + address);
      var label = link.querySelector("[data-email-text]");
      if (label) label.textContent = address;
    });
  }

  /* ------------------------------------------------------- Copy BibTeX */
  function initCopy() {
    var btn = document.querySelector("[data-copy-bibtex]");
    var code = document.querySelector("[data-bibtex]");
    if (!btn || !code) return;
    var label = btn.querySelector("[data-copy-label]");
    var timer = 0;

    function done(text) {
      if (label) label.textContent = text;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        if (label) label.textContent = "Copy";
      }, 2000);
    }

    btn.addEventListener("click", function () {
      var text = code.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          done("Copied");
        }, function () {
          selectCode();
        });
      } else {
        selectCode();
      }
    });

    function selectCode() {
      var range = document.createRange();
      range.selectNodeContents(code);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      done("Press Ctrl+C");
    }
  }

  /* ------------------------------------------------------- CV preview
     Desktop browsers with a built-in PDF viewer get an in-page preview dialog;
     phones, tablets and browsers without one follow the link to the PDF itself. */
  function initCv() {
    var dialog = document.getElementById("cv-modal");
    if (!dialog || typeof dialog.showModal !== "function") return;
    var frame = dialog.querySelector("iframe");
    var closeBtn = dialog.querySelector("[data-cv-close]");
    var lastTrigger = null;
    var wide = window.matchMedia("(min-width: 720px) and (pointer: fine)");

    each("[data-cv-open]", function (trigger) {
      trigger.addEventListener("click", function (e) {
        if (navigator.pdfViewerEnabled === false || !wide.matches) return;
        e.preventDefault();
        lastTrigger = trigger;
        if (frame && !frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
        root.classList.add("modal-open");
        dialog.showModal();
        if (closeBtn) closeBtn.focus();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        dialog.close();
      });
    }
    // A click on the backdrop lands on the <dialog> element itself.
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () {
      root.classList.remove("modal-open");
      if (lastTrigger) lastTrigger.focus();
    });
  }

  /* --------------------------------------------- Local time in Islamabad */
  function initClock() {
    var el = document.querySelector("[data-local-time]");
    if (!el || !window.Intl) return;
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch (e) {
      return;
    }
    function tick() {
      var now = new Date();
      el.textContent = fmt.format(now) + " (UTC+5)";
      el.setAttribute("datetime", now.toISOString());
    }
    tick();
    window.setInterval(tick, 30000);
  }

  function initYear() {
    var year = String(new Date().getFullYear());
    each("[data-year]", function (el) {
      el.textContent = year;
    });
  }

  /* ------------------------------------------------- Hero flow field
     Particles drift along a slowly evolving Perlin-noise field, leaving fine
     ink-like threads. Pauses off-screen and in background tabs; renders a
     single still frame when the visitor prefers reduced motion. */
  function createNoise(seed) {
    var perm = new Uint8Array(512);
    var source = [];
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    function rand() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    }
    var i;
    for (i = 0; i < 256; i++) source[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = source[i];
      source[i] = source[j];
      source[j] = tmp;
    }
    for (i = 0; i < 512; i++) perm[i] = source[i & 255];

    function fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function lerp(a, b, t) {
      return a + t * (b - a);
    }
    function grad(hash, x, y, z) {
      var h = hash & 15;
      var u = h < 8 ? x : y;
      var v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    return function noise(x, y, z) {
      var X = Math.floor(x) & 255;
      var Y = Math.floor(y) & 255;
      var Z = Math.floor(z) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);
      var u = fade(x);
      var v = fade(y);
      var w = fade(z);
      var A = perm[X] + Y;
      var AA = perm[A] + Z;
      var AB = perm[A + 1] + Z;
      var B = perm[X + 1] + Y;
      var BA = perm[B] + Z;
      var BB = perm[B + 1] + Z;
      return lerp(
        lerp(
          lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
          lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
          v
        ),
        lerp(
          lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
          lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
          v
        ),
        w
      );
    };
  }

  function initFlowField() {
    var canvas = document.querySelector("[data-flowfield]");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var noise = createNoise(20261008);
    var TRAIL = 72;
    var SPEED = 1.35;
    var SCALE = 0.0014;
    var TIME_STEP = 0.0011;
    var POINTER_RADIUS = 180;

    var width = 0;
    var height = 0;
    var spawnFrom = 0;
    var particles = [];
    var palette = null;
    var t = 0;
    var raf = 0;
    var inView = true;
    var pointer = { x: 0, y: 0, active: false };

    function readPalette() {
      var cs = getComputedStyle(root);
      palette = {
        a: cs.getPropertyValue("--flow-a").trim() || "36, 66, 194",
        b: cs.getPropertyValue("--flow-b").trim() || "21, 23, 28",
        alphaA: parseFloat(cs.getPropertyValue("--flow-alpha-a")) || 0.5,
        alphaB: parseFloat(cs.getPropertyValue("--flow-alpha-b")) || 0.2
      };
    }

    function spawn(p) {
      // On wide screens the text sits on the left, so threads are seeded where they are visible.
      p.x = spawnFrom + Math.random() * (width - spawnFrom);
      p.y = Math.random() * height;
      p.age = 0;
      p.life = 160 + Math.random() * 280;
      p.accent = Math.random() < 0.36;
      p.trail = [p.x, p.y];
      return p;
    }

    function step() {
      t += TIME_STEP;
      var r2 = POINTER_RADIUS * POINTER_RADIUS;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var angle = noise(p.x * SCALE, p.y * SCALE, t) * Math.PI * 2.4;
        if (pointer.active) {
          var dx = p.x - pointer.x;
          var dy = p.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < r2) angle += (1 - Math.sqrt(d2) / POINTER_RADIUS) * 1.9;
        }
        p.x += Math.cos(angle) * SPEED;
        p.y += Math.sin(angle) * SPEED;
        p.trail.push(p.x, p.y);
        if (p.trail.length > TRAIL * 2) p.trail.splice(0, 2);
        p.age += 1;
        if (p.age > p.life || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) spawn(p);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var tr = p.trail;
        if (tr.length < 6) continue;
        var fadeIn = Math.min(1, p.age / 45, (p.life - p.age) / 45);
        if (fadeIn <= 0) continue;
        var alpha = fadeIn * (p.accent ? palette.alphaA : palette.alphaB);
        ctx.strokeStyle = "rgba(" + (p.accent ? palette.a : palette.b) + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = p.accent ? 1.15 : 0.85;
        ctx.beginPath();
        ctx.moveTo(tr[0], tr[1]);
        for (var j = 2; j < tr.length; j += 2) ctx.lineTo(tr[j], tr[j + 1]);
        ctx.stroke();
      }
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      spawnFrom = width > 880 ? width * 0.28 : 0;
      var area = (width - spawnFrom) * height;
      var count = Math.round(Math.min(280, Math.max(80, area / 3600)));
      particles = [];
      for (var i = 0; i < count; i++) {
        var p = spawn({});
        p.age = Math.random() * p.life * 0.6;
        particles.push(p);
      }
      // Warm up so the very first frame already shows flowing threads.
      for (var k = 0; k < TRAIL; k++) step();
      draw();
    }

    function frame() {
      raf = 0;
      step();
      draw();
      schedule();
    }

    function schedule() {
      if (raf || !inView || document.hidden || prefersReducedMotion()) return;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (!raf) return;
      window.cancelAnimationFrame(raf);
      raf = 0;
    }

    readPalette();
    resize();
    schedule();

    var resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        var rect = canvas.getBoundingClientRect();
        if (Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1) return;
        resize();
      }, 160);
    }
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(canvas);
    else window.addEventListener("resize", onResize, { passive: true });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) schedule();
        else stop();
      }).observe(canvas);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else schedule();
    });

    onMediaChange(reduceMotionQuery, function () {
      if (prefersReducedMotion()) stop();
      else schedule();
    });

    document.addEventListener("themechange", function () {
      readPalette();
      draw();
    });

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !inView) {
        pointer.active = false;
        return;
      }
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.y >= 0 && pointer.y <= rect.height;
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      pointer.active = false;
    });
  }

  /* ------------------------------------------------------------- Boot */
  function init() {
    initTheme();
    initHeader();
    initActiveNav();
    initReveal();
    initRotator();
    initSpotlight();
    initLive();
    initEmail();
    initCopy();
    initCv();
    initClock();
    initYear();
    initFlowField();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
