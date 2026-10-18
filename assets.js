/* =====================================================================
   Ali Rospawan site — Shared site script
   - Injects the header + footer (edit them ONCE, here).
   - Homepage: nav links scroll to sections, the nav item of the section
     in view lights up (scroll-spy), and the address bar updates to
     #section so any position can be shared as a link.
   - Scroll progress bar under the header (all pages).
   - Homepage stats banner is counted from the content on the same page.
   - Mobile menu, back-to-top button, GoatCounter analytics.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Navigation config ---------- */
  // Homepage sections: [section id, label]. Each id must match a
  // <section id="..."> in index.html, in the same top-to-bottom order.
  var SECTIONS = [
    ["home",           "HOME"],
    ["publications",   "PUBLICATIONS"],
    ["awards",         "AWARDS"],
    ["qualifications", "QUALIFICATIONS"],
    ["service",        "SERVICE"]
  ];
  // Separate pages shown after the divider: [href, label]
  var PAGES = [
    ["research.html", "RESEARCH"],
    ["activity.html", "ACTIVITY"]
  ];

  var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var isHome = (current === "index.html");

  function buildHeader() {
    var prefix = isHome ? "" : "index.html";
    var links = SECTIONS.map(function (s) {
      return '<a href="' + prefix + '#' + s[0] + '" data-section="' + s[0] + '">' + s[1] + '</a>';
    }).join("");
    var pages = PAGES.map(function (p) {
      var cls = "nav-page" + (p[0] === current ? " nav-active" : "");
      return '<a href="' + p[0] + '" class="' + cls + '">' + p[1] + ' <span aria-hidden="true">↗</span></a>';
    }).join("");

    return '' +
      '<a href="' + (isHome ? "#home" : "index.html") + '" class="logo">' +
      '<img src="images/logo.svg" alt="AR" class="logo-img">' +
      '<span>Ali Rospawan</span>' +
      '</a>' +
      '<button class="menu-toggle" aria-label="Toggle navigation">' +
      '<span></span><span></span><span></span>' +
      '</button>' +
      '<nav>' + links + '<span class="nav-sep" aria-hidden="true"></span>' + pages + '</nav>' +
      '<div class="scroll-progress" aria-hidden="true"></div>';
  }

  function buildFooter() {
    return '' +
      '<h3 style="color:#fff;margin-top:0;font-size:1.0rem;">Ali Rospawan | Ph.D. Candidate & Lecturer</h3>' +
      '<div class="footer-links">' +
      '<a href="https://scholar.google.com/citations?user=oFUWGWoAAAAJ" target="_blank">Google Scholar</a>' +
      '<a href="https://www.researchgate.net/profile/Ali-Rospawan" target="_blank">ResearchGate</a>' +
      '<a href="https://www.linkedin.com/in/alirospawan/" target="_blank">LinkedIn</a>' +
      '<a href="https://orcid.org/0000-0001-5667-2269" target="_blank">ORCID</a>' +
      '</div>' +
      '<p style="margin-top:30px;opacity:0.5;font-size:0.8rem;">&copy; 2026 Ali Rospawan. All rights reserved.</p>';
  }

  function injectShell() {
    var header = document.querySelector("header");
    if (header) header.innerHTML = buildHeader();
    var footer = document.querySelector("footer");
    if (footer) footer.innerHTML = buildFooter();

    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector("header nav");
    if (toggle && nav) {
      function closeMenu() {
        nav.classList.remove("open");
        toggle.classList.remove("open");
      }
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
        toggle.classList.toggle("open");
      });
      // Close after tapping a link
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) closeMenu();
      });
      // Close when tapping anywhere outside the header
      document.addEventListener("click", function (e) {
        if (nav.classList.contains("open") && !e.target.closest("header")) closeMenu();
      });
      // Close with the Escape key
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
      });
    }
  }

  /* ---------- 2. Scroll-spy + shareable links (homepage only) ---------- */
  // The active section is the last one whose top has passed a line 40%
  // down the viewport. At the very bottom of the page, the last section wins.
  // Once the visitor scrolls, the address bar follows along (#awards, ...)
  // without adding history entries, so the Back button still works normally.
  function wireScrollSpy() {
    if (!isHome) return;
    var links = {};
    document.querySelectorAll("header nav a[data-section]").forEach(function (a) {
      links[a.getAttribute("data-section")] = a;
    });
    var sections = SECTIONS.map(function (s) { return document.getElementById(s[0]); })
                           .filter(Boolean);
    if (!sections.length) return;

    var activeId = null, ticking = false, userScrolled = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var id = sections[0].id;
      sections.forEach(function (el) {
        if (el.getBoundingClientRect().top <= line) id = el.id;
      });
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) id = sections[sections.length - 1].id;
      if (id === activeId) return;
      activeId = id;
      Object.keys(links).forEach(function (k) {
        links[k].classList.toggle("nav-active", k === id);
      });
      // Shareable link: keep the address bar in sync with the section in view
      if (userScrolled && window.history && history.replaceState) {
        var url = (id === sections[0].id) ? location.pathname + location.search : "#" + id;
        history.replaceState(null, "", url);
      }
    }
    function onScroll() {
      userScrolled = true;
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- 3. Scroll progress bar (all pages) ---------- */
  function wireProgress() {
    var bar = document.querySelector(".scroll-progress");
    if (!bar) return;
    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "scaleX(" + p + ")";
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------- 4. Back-to-top ---------- */
  function wireBackToTop() {
    var btn = document.getElementById("backToTop");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.style.display = window.scrollY > 300 ? "flex" : "none";
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 5. Homepage stats banner ---------- */
  // Counted from the content already on index.html — no fetching.
  // The numbers written in the HTML are only shown if JavaScript is off.
  function updateBanner() {
    if (!document.querySelector("[data-banner]")) return;
    var counts = {
      publications: document.querySelectorAll(".pub-item").length,
      q1:           document.querySelectorAll(".pub-item .badge-q1").length,
      awards:       document.querySelectorAll(".award-card").length,
      firstplace:   document.querySelectorAll(".award-card.gold").length,
      committees:   document.querySelectorAll(".committee-row").length
    };
    Object.keys(counts).forEach(function (k) {
      var el = document.querySelector('[data-banner="' + k + '"]');
      if (el && counts[k]) el.textContent = counts[k];
    });
  }

  /* ---------- 6. GoatCounter analytics ---------- */
  var GOATCOUNTER_CODE = "rospawan";
  function loadAnalytics() {
    if (!GOATCOUNTER_CODE || GOATCOUNTER_CODE === "YOURCODE") return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "//gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count");
    document.body.appendChild(s);
  }

   /* ---------- 7. Count-up animation on the stats banner ---------- */
  // Numbers count from 0 to their value the first time the banner is
  // mostly on screen. Slow ease-out so the final numbers settle gently.
  function wireCountUp() {
    var banner = document.querySelector(".stats-banner");
    if (!banner || !("IntersectionObserver" in window)) return;

    var nums = Array.prototype.slice.call(banner.querySelectorAll("[data-banner]"));
    var targets = nums.map(function (el) { return parseInt(el.textContent, 10) || 0; });
    var done = false;
    nums.forEach(function (el) { el.textContent = "0"; });

    function finish() {
      done = true;
      nums.forEach(function (el, i) { el.textContent = targets[i]; });
    }
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = null, duration = 2200, delay = 250;
      function step(ts) {
        if (done) return;
        if (start === null) start = ts + delay;
        var t = Math.max(0, Math.min(1, (ts - start) / duration));
        var eased = 1 - Math.pow(1 - t, 4);           // slow, gentle finish
        nums.forEach(function (el, i) { el.textContent = Math.round(targets[i] * eased); });
        if (t < 1) window.requestAnimationFrame(step); else finish();
      }
      window.requestAnimationFrame(step);
    }, { threshold: 0.7 });
    io.observe(banner);

    // Safety: show real numbers before a Word/txt download
    document.addEventListener("click", function (e) {
      if (e.target.closest("#dlDocx, #dlTxt")) { io.disconnect(); finish(); }
    }, true);
  }
  
  /* ---------- Init ---------- */
  function init() {
    injectShell();
    wireScrollSpy();
    wireProgress();
    wireBackToTop();
    updateBanner();
    wireCountUp();     // must run after updateBanner (reads the final numbers)
    loadAnalytics();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
