(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Tap-to-earn preview inside the phone mockup was replaced by the full
  // animated app walkthrough (walkthrough.js, loaded separately) — the old
  // #tapTarget/#earnToast/.phone-body element IDs this block used to wire
  // up no longer exist in the mockup's markup.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Journey waypoints + general section reveals fade in as they scroll into
  // view. Same observer covers both .waypoint (thread stops) and .reveal
  // (section headers, card grids) — one mechanism, not two.
  var revealTargets = document.querySelectorAll(".waypoint, .reveal");
  if (revealTargets.length && "IntersectionObserver" in window) {
    if (reduceMotion) {
      revealTargets.forEach(function (w) { w.classList.add("in-view"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: "0px 0px -60px 0px" });
      revealTargets.forEach(function (w) { io.observe(w); });
    }
  } else {
    revealTargets.forEach(function (w) { w.classList.add("in-view"); });
  }

  // Parallax on the background field — cheap, transform-only, tied to
  // scroll via rAF so it never runs more than once per frame.
  var bgField = document.querySelector(".bg-field");
  if (bgField && !reduceMotion) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        bgField.style.transform = "translateY(" + (window.scrollY * 0.12) + "px)";
        ticking = false;
      });
    }, { passive: true });
  }

  // Ambient gold dust — the same atmosphere language as Shahnameh's own
  // cinematic.js ("atmosphere supports emotion, it does not compete with
  // it"), ported here so the site and the game read as one world. 14
  // particles max, pauses when the tab is hidden, skipped entirely under
  // reduced motion.
  if (!reduceMotion) {
    var dustCanvas = document.getElementById("cinematicDust");
    if (dustCanvas) {
      var ctx = dustCanvas.getContext("2d");
      var W = 0, H = 0;
      function resizeDust() {
        W = dustCanvas.width = window.innerWidth;
        H = dustCanvas.height = window.innerHeight;
      }
      resizeDust();
      window.addEventListener("resize", resizeDust, { passive: true });

      var COUNT = Math.min(14, Math.floor(window.innerWidth / 28));
      var pts = [];
      for (var i = 0; i < COUNT; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.1 + 0.2,
          vx: (Math.random() - 0.5) * 0.10,
          vy: -(Math.random() * 0.13 + 0.03),
          base: Math.random() * 0.32 + 0.06,
          phase: Math.random() * Math.PI * 2,
          col: Math.random() < 0.65 ? "212,175,55" : "199,125,255"
        });
      }

      var tick = 0, raf;
      function drawDust() {
        tick++;
        if (tick % 2 === 0) {
          ctx.clearRect(0, 0, W, H);
          pts.forEach(function (p) {
            p.x += p.vx; p.y += p.vy; p.phase += 0.008;
            if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
            if (p.x < -8) p.x = W + 8;
            if (p.x > W + 8) p.x = -8;
            var a = p.base * (0.6 + 0.4 * Math.sin(p.phase));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(" + p.col + "," + a.toFixed(2) + ")";
            ctx.fill();
          });
        }
        raf = requestAnimationFrame(drawDust);
      }
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) cancelAnimationFrame(raf);
        else raf = requestAnimationFrame(drawDust);
      });
      raf = requestAnimationFrame(drawDust);

      requestAnimationFrame(function () {
        dustCanvas.style.transition = "opacity 3s ease";
        dustCanvas.style.opacity = "0.28";
      });
    }
  }

  // Freedom spotlight -- twinkling stars behind the orbit banner, same
  // generator as the app's own Starlink screen (docs/realgram/design/
  // theme-package). Decorative only, so it's skipped under reduced motion.
  if (!reduceMotion) {
    var starsHost = document.getElementById("freedomStars");
    if (starsHost) {
      for (var s = 0; s < 26; s++) {
        var star = document.createElement("span");
        star.className = "orbit-star";
        star.style.left = (Math.random() * 100) + "%";
        star.style.top = (Math.random() * 70) + "%";
        star.style.animationDelay = (Math.random() * 3) + "s";
        starsHost.appendChild(star);
      }
    }
  }

  // REAL token spotlight -- live price/stats straight from dyor.io's public,
  // CORS-open API (same source 3real.no's own market section uses), fetched
  // client-side since this site has no backend of its own. Fails soft: on
  // any error the static copy and the "View on DYOR" link still stand.
  var tokenPriceEl = document.getElementById("tokenPrice");
  if (tokenPriceEl) {
    var REAL_JETTON = "EQDhq_DjQUMJqfXLP8K8J6SlOvon08XQQK0T49xon2e0xU8p";
    var DYOR_BASE = "https://api.dyor.io/v1/jettons/" + REAL_JETTON;

    function dyorAmount(a) {
      if (!a || a.value == null) return null;
      return Number(a.value) / Math.pow(10, a.decimals || 0);
    }
    function fmtUsd(n) {
      if (n == null) return "—";
      var digits = n < 1 ? 4 : 2;
      return "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    function fmtCompactUsd(n) {
      if (n == null) return "—";
      return "$" + n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
    }

    fetch(DYOR_BASE)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var d = data && data.details;
        if (!d) return;
        var priceUsd = dyorAmount(d.priceUsd);
        tokenPriceEl.textContent = fmtUsd(priceUsd);

        var holdersEl = document.getElementById("tokenHolders");
        if (holdersEl && d.holdersCount != null) {
          holdersEl.textContent = Number(d.holdersCount).toLocaleString("en-US");
        }
        var mcapEl = document.getElementById("tokenMcap");
        if (mcapEl) mcapEl.textContent = fmtCompactUsd(dyorAmount(d.mcap));
        var liqEl = document.getElementById("tokenLiquidity");
        if (liqEl) liqEl.textContent = fmtCompactUsd(dyorAmount(d.liquidityUsd));

        var chartEl = document.getElementById("tokenChart");
        var preview = (d.chartPreviews || []).find(function (c) { return c.color === "dark"; });
        if (chartEl && preview) chartEl.src = preview.url;
      })
      .catch(function () { /* static copy + DYOR link already cover this */ });

    fetch(DYOR_BASE + "/stats")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var day = data && data.priceChange && data.priceChange.usd && data.priceChange.usd.day;
        var changeEl = document.getElementById("tokenChange");
        if (!changeEl || !day || day.changePercent == null) return;
        var pct = day.changePercent;
        changeEl.textContent = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "% (24h)";
        changeEl.classList.add(pct >= 0 ? "is-up" : "is-down");
      })
      .catch(function () { /* leave the 24h line blank */ });
  }
})();
