(function () {
  "use strict";

  var root = document.getElementById("wtPhone");
  if (!root) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // This one script is shared verbatim between index.html and fa/index.html
  // (same convention as app.js) -- the couple of strings/digits this file
  // sets dynamically (connect-state label, speed jitter) must match
  // whichever page it's running on instead of always writing English/Latin
  // over a correctly Farsi-authored static value.
  var isFa = document.documentElement.lang === "fa";
  var CONNECTING_TEXT = isFa ? "در حال اتصال…" : "Connecting…";
  var CONNECTED_TEXT  = isFa ? "متصل" : "Connected";
  var FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  function localizeDigits(str) {
    if (!isFa) return str;
    return str.replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; }).replace(/\./g, "٫");
  }

  var SCENE_KEYS = ["home", "messages", "game", "freedom"];
  var scenesEl = {};
  SCENE_KEYS.forEach(function (k) {
    scenesEl[k] = root.querySelector('.wt-scene[data-scene="' + k + '"]');
  });
  var dotEls = {};
  var dotButtons = document.querySelectorAll(".wt-dot");
  dotButtons.forEach(function (btn) {
    dotEls[btn.getAttribute("data-scene")] = btn;
  });

  var menuBtn = document.getElementById("wtMenuBtn");
  var drawerEl = document.getElementById("wtDrawer");
  var scrimEl = document.getElementById("wtScrim");
  var drawerMessagesEl = document.getElementById("wtDrawerMessages");

  var speedEl = document.getElementById("wtSpeed");
  var msgNewEl = document.getElementById("wtMsgNew");
  var typingEl = document.getElementById("wtTyping");
  var replyBubbleEl = document.getElementById("wtReplyBubble");
  var zarEl = document.getElementById("wtZar");
  var chapterFillEl = document.getElementById("wtChapterFill");
  var rewardPopEl = document.getElementById("wtRewardPop");
  var gameSceneEl = scenesEl.game;
  var germanyNodeEl = document.getElementById("wtNodeGermany");
  var connectStateEl = document.getElementById("wtConnectState");
  var connectTextEl = document.getElementById("wtConnectText");

  var currentKey = "home";
  var epoch = 0;
  var beatIndex = 0;
  var isPlaying = false;
  var isInViewport = false;
  var manualPauseActive = false;
  var autoplayTimer = null;
  var resumeTimer = null;

  // ---- generic tap-ripple simulation (Home->Menu, Menu->Messages beats) ----
  function simulateTap(el) {
    if (!el) return;
    el.classList.add("wt-tap-active");
    setTimeout(function () { el.classList.remove("wt-tap-active"); }, 260);
  }

  // ---- reward particle burst -- same recipe the old tap-to-earn preview
  // used (BRAND.md 4: scale-on-press, gold radial burst, ~900ms life),
  // generalized to any container instead of one hardcoded phone-body. ----
  function spawnBurst(container) {
    if (reduceMotion || !container) return;
    var count = 10;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "burst-particle";
      var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      var dist = 40 + Math.random() * 30;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist - 26;
      p.style.transition = "transform 900ms cubic-bezier(.15,.7,.3,1), opacity 900ms ease";
      container.appendChild(p);
      requestAnimationFrame(function (el, ddx, ddy) {
        return function () {
          el.style.transform = "translate(" + ddx + "px," + ddy + "px)";
          el.style.opacity = "0";
        };
      }(p, dx, dy));
      (function (el) { setTimeout(function () { el.remove(); }, 950); })(p);
    }
  }

  // ---- per-scene "realistic movement" beats, each guarded by an epoch
  // check so a stale timeout from a scene the visitor already left (via a
  // manual tap mid-sequence) can never mutate the DOM out of turn. ----
  function runMessagesEnter(myEpoch) {
    if (!msgNewEl || !typingEl || !replyBubbleEl) return;
    msgNewEl.classList.remove("wt-msg-new");
    typingEl.classList.remove("is-visible");
    replyBubbleEl.classList.remove("is-visible");
    void msgNewEl.offsetWidth; // restart the CSS arrival animation
    setTimeout(function () { if (epoch === myEpoch) msgNewEl.classList.add("wt-msg-new"); }, 180);
    setTimeout(function () { if (epoch === myEpoch) typingEl.classList.add("is-visible"); }, 1100);
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      typingEl.classList.remove("is-visible");
      replyBubbleEl.classList.add("is-visible");
    }, 2000);
  }

  function runGameEnter(myEpoch) {
    if (!chapterFillEl || !rewardPopEl) return;
    chapterFillEl.style.width = "0%";
    rewardPopEl.classList.remove("show");
    setTimeout(function () { if (epoch === myEpoch) chapterFillEl.style.width = "64%"; }, 300);
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      rewardPopEl.classList.add("show");
      spawnBurst(gameSceneEl);
      if (zarEl) {
        // Number() only parses ASCII digits -- undo localizeDigits() first
        // so this doesn't silently read NaN off the Farsi page's ۸۶۰.
        var asciiZar = zarEl.textContent.replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); });
        zarEl.textContent = localizeDigits(String(Number(asciiZar) + 40));
      }
    }, 1900);
    setTimeout(function () { if (epoch === myEpoch) rewardPopEl.classList.remove("show"); }, 3000);
  }

  function runFreedomEnter(myEpoch) {
    if (!germanyNodeEl || !connectStateEl || !connectTextEl) return;
    germanyNodeEl.classList.remove("is-selected");
    connectStateEl.classList.remove("is-connected");
    connectTextEl.textContent = CONNECTING_TEXT;
    setTimeout(function () { if (epoch === myEpoch) germanyNodeEl.classList.add("is-selected"); }, 500);
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      connectStateEl.classList.add("is-connected");
      connectTextEl.textContent = CONNECTED_TEXT;
    }, 2500);
  }

  // ---- scene switch: the one place that swaps .is-current/.is-prev and
  // fires whichever per-scene beat function belongs to the new scene. ----
  function setScene(key) {
    if (!scenesEl[key] || key === currentKey) return;
    var myEpoch = ++epoch;
    var prevEl = scenesEl[currentKey];
    var nextEl = scenesEl[key];
    if (prevEl) {
      prevEl.classList.remove("is-current");
      prevEl.classList.add("is-prev");
      setTimeout(function () { prevEl.classList.remove("is-prev"); }, 450);
    }
    nextEl.classList.add("is-current");
    currentKey = key;
    Object.keys(dotEls).forEach(function (k) {
      dotEls[k].classList.toggle("is-active", k === key);
      dotEls[k].setAttribute("aria-selected", k === key ? "true" : "false");
    });
    if (key === "messages") runMessagesEnter(myEpoch);
    if (key === "game") runGameEnter(myEpoch);
    if (key === "freedom") runFreedomEnter(myEpoch);
  }

  // ---- autoplay timeline: Home(3s) -> Menu(2s, drawer overlay, no scene
  // change underneath) -> Messages(3s) -> Play(4s) -> Freedom(4s) -> loop. ----
  var BEATS = [
    { key: "home", duration: 3000 },
    { key: "menu", duration: 2000 },
    { key: "messages", duration: 3000 },
    { key: "game", duration: 4000 },
    { key: "freedom", duration: 4000 },
  ];
  var KEY_TO_BEAT = { home: 0, messages: 2, game: 3, freedom: 4 };

  function runBeat(i) {
    var beat = BEATS[i];
    if (beat.key === "menu") {
      simulateTap(menuBtn);
      setTimeout(function () {
        if (!isPlaying) return;
        drawerEl.classList.add("is-open");
        scrimEl.classList.add("is-open");
      }, 160);
      setTimeout(function () {
        if (isPlaying) drawerMessagesEl.classList.add("is-highlighted");
      }, 900);
      setTimeout(function () { if (isPlaying) simulateTap(drawerMessagesEl); }, beat.duration - 500);
      setTimeout(function () {
        drawerEl.classList.remove("is-open");
        scrimEl.classList.remove("is-open");
        drawerMessagesEl.classList.remove("is-highlighted");
      }, beat.duration - 320);
    } else {
      setScene(beat.key);
    }
  }

  function scheduleAdvance(i) {
    clearTimeout(autoplayTimer);
    autoplayTimer = setTimeout(function () {
      if (!isPlaying) return;
      beatIndex = (i + 1) % BEATS.length;
      runBeat(beatIndex);
      scheduleAdvance(beatIndex);
    }, BEATS[i].duration);
  }

  function startAutoplay(fromIndex) {
    if (reduceMotion || isPlaying) return;
    isPlaying = true;
    beatIndex = fromIndex || 0;
    runBeat(beatIndex);
    scheduleAdvance(beatIndex);
  }

  function stopAutoplay() {
    isPlaying = false;
    clearTimeout(autoplayTimer);
    drawerEl.classList.remove("is-open");
    scrimEl.classList.remove("is-open");
    if (drawerMessagesEl) drawerMessagesEl.classList.remove("is-highlighted");
  }

  // ---- manual controls: nav dots below the phone ----
  function manualSelect(key) {
    stopAutoplay();
    clearTimeout(resumeTimer);
    setScene(key);
    manualPauseActive = true;
    if (reduceMotion) return; // static controls only, per prefers-reduced-motion
    resumeTimer = setTimeout(function () {
      manualPauseActive = false;
      if (isInViewport) startAutoplay(KEY_TO_BEAT[key] != null ? KEY_TO_BEAT[key] : 0);
    }, 4500);
  }

  dotButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      manualSelect(btn.getAttribute("data-scene"));
    });
  });

  // ---- optional swipe navigation on the phone screen itself ----
  var screenEl = document.getElementById("wtScreen");
  if (screenEl) {
    var touchStartX = null;
    screenEl.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    screenEl.addEventListener("touchend", function (e) {
      if (touchStartX == null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 40) return;
      var idx = SCENE_KEYS.indexOf(currentKey);
      var nextIdx = dx < 0 ? (idx + 1) % SCENE_KEYS.length : (idx - 1 + SCENE_KEYS.length) % SCENE_KEYS.length;
      manualSelect(SCENE_KEYS[nextIdx]);
    }, { passive: true });
  }

  // ---- autoplay only while the mockup is on screen (and the tab is
  // visible) -- avoids burning CPU on an animation nobody's looking at. ----
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isInViewport = entry.isIntersecting;
        if (isInViewport && !manualPauseActive && !document.hidden) startAutoplay(beatIndex);
        else if (!isInViewport) stopAutoplay();
      });
    }, { threshold: 0.35 });
    io.observe(root);
  } else {
    isInViewport = true;
    startAutoplay(0);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAutoplay();
    else if (isInViewport && !manualPauseActive) startAutoplay(beatIndex);
  });

  // ---- Home scene ambient movement: speed-meter jitter. Cheap text-only
  // update, gated to only run while Home is actually the visible scene. ----
  if (!reduceMotion && speedEl) {
    setInterval(function () {
      if (document.hidden || currentKey !== "home") return;
      speedEl.textContent = localizeDigits((40 + Math.random() * 10).toFixed(1));
    }, 1400);
  }
})();
