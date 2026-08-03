(function () {
  "use strict";

  var feed = document.getElementById("wtChatFeed");
  var root = document.getElementById("wtPhone");
  if (!feed || !root) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Shared with app.js's convention -- one script, both locales, picking
  // content by document.documentElement.lang rather than shipping two files.
  var isFa = document.documentElement.lang === "fa";

  // A completely ordinary friend-to-friend chat about the app's real parts
  // (Shahnameh, REAL, Clan) -- rolled back 2026-08-03 from a multi-scene
  // app tour that read as broken. "in" = the other friend (name shown
  // above the bubble, left-aligned); "out" = the account this phone
  // belongs to (no name label, same convention real chat UIs use for
  // your own messages).
  var EN_CHAT = [
    { side: "in",  name: "Sina", text: "did you unlock chapter 12 in shahnameh yet? 👀" },
    { side: "out", text: "not yet — earning REAL from daily check-in first" },
    { side: "in",  name: "Sina", text: "smart, the reward table went up this week" },
    { side: "out", text: "yeah I noticed! clan war starts tonight too" },
    { side: "in",  name: "Sina", text: "oh right, are we close to top 3?" },
    { side: "out", text: "barely 😅 need everyone online" },
    { side: "in",  name: "Sina", text: "bet, I'll ping the clan chat" },
    { side: "out", text: "REAL balance is looking good today btw" },
    { side: "in",  name: "Sina", text: "shahnameh really pays off lol" },
    { side: "out", text: "opening the app now, see you in there" },
    { side: "in",  name: "Sina", text: "wait, did the referral bonus land for you too?" },
    { side: "out", text: "yeah! got extra GB from it" },
    { side: "in",  name: "Sina", text: "nice, inviting my brother next" },
    { side: "out", text: "do it, free traffic for both of you" },
    { side: "in",  name: "Sina", text: "clan chat is blowing up rn 😂" },
    { side: "out", text: "let's go, see you in the war" },
  ];
  var FA_CHAT = [
    { side: "in",  name: "سینا", text: "فصل ۱۲ شاهنامه رو باز کردی؟ 👀" },
    { side: "out", text: "هنوز نه — اول دارم از چک-این روزانه REAL جمع می‌کنم" },
    { side: "in",  name: "سینا", text: "عاقلانه‌س، جدول جایزه‌ها این هفته بیشتر شده" },
    { side: "out", text: "آره متوجه شدم! امشب هم جنگ قبیله شروع می‌شه" },
    { side: "in",  name: "سینا", text: "آها راست میگی، نزدیک رتبه‌های برتریم؟" },
    { side: "out", text: "به‌زور 😅 باید همه آنلاین باشن" },
    { side: "in",  name: "سینا", text: "چشم، تو گروه قبیله خبر می‌دم" },
    { side: "out", text: "راستی موجودی REAL امروز خوب شده" },
    { side: "in",  name: "سینا", text: "شاهنامه واقعاً به‌صرفه‌س 😄" },
    { side: "out", text: "الان اپ رو باز می‌کنم، اونجا می‌بینمت" },
    { side: "in",  name: "سینا", text: "راستی پاداش دعوتت هم افتاد؟" },
    { side: "out", text: "آره! گیگ اضافه گرفتم ازش" },
    { side: "in",  name: "سینا", text: "خوبه، برادرمو بعدی دعوت می‌کنم" },
    { side: "out", text: "بکن، ترافیک رایگان واسه هردوتون" },
    { side: "in",  name: "سینا", text: "گروه قبیله داره منفجر میشه 😂" },
    { side: "out", text: "بریم، تو جنگ می‌بینمت" },
  ];
  var CHAT = isFa ? FA_CHAT : EN_CHAT;

  var TYPE_MS = 1100;   // how long the typing dots show before the bubble lands
  var GAP_MS = 850;     // pause after a bubble lands before the next one starts typing
  var LOOP_PAUSE_MS = 2400; // pause on the finished conversation before it clears and restarts

  var running = false;
  var isInViewport = false;
  var timer = null;
  var idx = 0;

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function scrollToBottom() {
    feed.scrollTop = feed.scrollHeight;
  }

  function addBubble(msg) {
    var row = document.createElement("div");
    row.className = "wt-chat-row wt-" + msg.side;
    var html = "";
    if (msg.side === "in" && msg.name) html += '<span class="wt-chat-name">' + escapeHtml(msg.name) + "</span>";
    html += '<div class="bubble bubble-' + msg.side + '">' + escapeHtml(msg.text) + "</div>";
    row.innerHTML = html;
    feed.appendChild(row);
    scrollToBottom();
  }

  function addTyping(msg) {
    var row = document.createElement("div");
    row.className = "wt-chat-row wt-" + msg.side;
    var html = "";
    if (msg.side === "in" && msg.name) html += '<span class="wt-chat-name">' + escapeHtml(msg.name) + "</span>";
    html += '<div class="wt-typing"><span></span><span></span><span></span></div>';
    row.innerHTML = html;
    feed.appendChild(row);
    scrollToBottom();
    return row;
  }

  function step() {
    if (!running) return;
    if (idx >= CHAT.length) {
      timer = setTimeout(function () {
        if (!running) return;
        feed.innerHTML = "";
        idx = 0;
        step();
      }, LOOP_PAUSE_MS);
      return;
    }
    var msg = CHAT[idx];
    var typingRow = addTyping(msg);
    timer = setTimeout(function () {
      if (!running) return;
      typingRow.remove();
      addBubble(msg);
      idx++;
      timer = setTimeout(step, GAP_MS);
    }, TYPE_MS);
  }

  function start() {
    if (running) return;
    running = true;
    idx = 0;
    feed.innerHTML = "";
    step();
  }

  function stop() {
    running = false;
    clearTimeout(timer);
  }

  if (reduceMotion) {
    // Static: the whole conversation, laid out once, no typing simulation
    // and no loop -- this site's own global reduced-motion rule already
    // collapses the entrance transition to near-instant.
    CHAT.forEach(addBubble);
    return;
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isInViewport = entry.isIntersecting;
        if (isInViewport && !document.hidden) start();
        else stop();
      });
    }, { threshold: 0.35 });
    io.observe(root);
  } else {
    isInViewport = true;
    start();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (isInViewport) start();
  });
})();
