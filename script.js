(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme toggle ---------- */
  document.getElementById("theme").addEventListener("click", function () {
    var current = root.getAttribute("data-theme");
    if (!current) current = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    drawStatic();
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Project filter ---------- */
  var chips = document.querySelectorAll(".chip");
  var works = document.querySelectorAll(".work");
  var sems = document.querySelectorAll(".sem");
  var empty = document.getElementById("empty");

  function applyFilter(tag) {
    var shown = 0;
    works.forEach(function (w) {
      var match = tag === "all" || w.dataset.tags.split(" ").indexOf(tag) !== -1;
      w.hidden = !match;
      if (match) shown++;
    });
    sems.forEach(function (s) {
      s.hidden = !s.querySelector(".work:not([hidden])");
    });
    empty.hidden = shown !== 0;
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyFilter(chip.dataset.filter);
    });
  });

  /* Open the matching project if the page is loaded with a #hash */
  function openHash() {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (el && el.classList.contains("work")) {
      if (el.hidden) { document.querySelector('.chip[data-filter="all"]').click(); }
      var d = el.querySelector("details");
      if (d) d.open = true;
    }
  }
  window.addEventListener("hashchange", openHash);
  openHash();

  /* ---------- Active nav link ---------- */
  var navLinks = document.querySelectorAll(".bar nav a");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (a) {
            a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false");
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["about", "projects", "experience", "education", "contact"].forEach(function (id) {
      var s = document.getElementById(id); if (s) io.observe(s);
    });
  }

  /* ---------- YouTube intro (loads only when played) ---------- */
  var box = document.querySelector(".video");
  var vid = box.dataset.videoId;
  if (!vid || vid === "VIDEO_ID") {
    box.innerHTML = '<div class="video-empty"><div>Intro video coming soon<p>Add your YouTube video ID in index.html to show it here.</p></div></div>';
  } else {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Play the introduction video");
    btn.innerHTML = '<img alt="" loading="lazy" src="https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg">' +
      '<span class="play"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#10201c"/></svg></span>';
    btn.addEventListener("click", function () {
      box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + vid +
        '?autoplay=1&rel=0" title="Introduction by Tirth Popat" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
    box.appendChild(btn);
  }

  /* ---------- Leaky integrate-and-fire neuron ---------- */
  var canvas = document.getElementById("neuron");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var trace = [];            // membrane voltage samples, one per drawn column
  var spikes = [];           // true where a spike was emitted in that column
  var v = 0, tau = 40, vth = 1, vreset = 0, input = 1.15, target = 1.15;
  var pointerActive = false, last = 0;

  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = Math.floor(r.width); H = Math.floor(r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(W / 2) + 2;
    while (trace.length < cols) { trace.unshift(0); spikes.unshift(false); }
    while (trace.length > cols) { trace.shift(); spikes.shift(); }
  }

  /* One column = a few small time steps; returns [voltage, didSpike] */
  function stepColumn() {
    var fired = false, steps = 1, dt = 1;
    for (var i = 0; i < steps; i++) {
      v += dt * (-v / tau + input * 0.0275);
      if (v >= vth) { v = vreset; fired = true; }
    }
    return [v, fired];
  }

  function draw() {
    var green = css("--green"), gold = css("--gold"), line = css("--line"), muted = css("--muted");
    ctx.clearRect(0, 0, W, H);
    var top = 22, bottom = H - 16, span = bottom - top;
    function y(val) { return bottom - Math.max(0, Math.min(1.15, val)) / 1.15 * span; }

    // threshold line
    ctx.setLineDash([5, 5]); ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y(vth)); ctx.lineTo(W, y(vth)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = muted; ctx.font = "12px " + css("--display");
    ctx.fillText("firing threshold", 10, y(vth) - 6);

    // membrane voltage
    ctx.strokeStyle = green; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < trace.length; i++) {
      var x = i * 2, yy = y(trace[i]);
      if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();

    // spikes
    ctx.strokeStyle = gold; ctx.lineWidth = 2.5;
    for (var j = 0; j < spikes.length; j++) {
      if (spikes[j]) { ctx.beginPath(); ctx.moveTo(j * 2, y(vth)); ctx.lineTo(j * 2, 6); ctx.stroke(); }
    }
  }

  function advance(n) {
    for (var k = 0; k < n; k++) {
      var s = stepColumn();
      trace.push(s[0]); spikes.push(s[1]);
      trace.shift(); spikes.shift();
    }
  }

  function prefill() { var n = trace.length; for (var i = 0; i < n; i++) advance(1); }

  function frame(ts) {
    if (ts - last > 16) {
      last = ts;
      if (!pointerActive) target = 1.15 + 0.25 * Math.sin(ts / 3200);
      input += (target - input) * 0.08;
      advance(1);
      draw();
    }
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    if (!reduceMotion) return;
    input = 1.15;
    prefill();
    draw();
  }

  function setFromPointer(e) {
    var r = canvas.getBoundingClientRect();
    var f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    target = 0.55 + f * 1.9;        // input current: low on the left, high on the right
    pointerActive = true;
  }
  canvas.addEventListener("pointermove", setFromPointer);
  canvas.addEventListener("pointerdown", setFromPointer);
  canvas.addEventListener("pointerleave", function () { pointerActive = false; });

  window.addEventListener("resize", function () {
    trace = []; spikes = []; v = 0;
    resize(); prefill();
    draw();
  });
  resize();
  prefill();
  if (reduceMotion) { drawStatic(); } else { requestAnimationFrame(frame); }
})();
