/* =====================================================================
   Ali Rospawan sites — Shared site script
   - Injects the canonical header + footer (edit them ONCE, here).
   - Auto-highlights the current page's nav link.
   - Wires the mobile menu toggle and back-to-top button.
   - On the homepage, auto-updates the stats banner from the live
     publications/awards pages, falling back to data/stats.json.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Canonical header & footer (single source of truth) ---------- */
  // Nav links: [href, label]. To add/rename a page, edit this once.
  var NAV = [
    ["index.html",        "HOME"],
    ["about.html",        "ABOUT ME"],
    ["publications.html", "PUBLICATIONS"],
    ["research.html",     "RESEARCH"],
    ["awards.html",       "AWARDS"],
    ["activity.html",     "ACTIVITY"]
  ];

  // Current page filename, e.g. "index.html". Treat "/" as index.html.
  var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (current === "") current = "index.html";

  function buildHeader() {
    var links = NAV.map(function (item) {
      var href = item[0], label = item[1];
      var active = (href.toLowerCase() === current) ? ' class="nav-active"' : "";
      return '<a href="' + href + '"' + active + ">" + label + "</a>";
    }).join("\n            ");

    return '' +
      '<a href="index.html" class="logo">' +
      '<img src="images/logo.svg" alt="AR" class="logo-img">' +
      '<span>Ali Rospawan</span>' +
      '</a>' +
      '<button class="menu-toggle" aria-label="Toggle navigation">' +
      '<span></span><span></span><span></span>' +
      '</button>' +
      '<nav>' + links + '</nav>';
  }

  function buildFooter() {
    return '' +
      '<h3 style="color:#fff;margin-top:0;font-size:1.0rem;">Ali Rospawan | PhD Researcher & Lecturer</h3>' +
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

    // Wire mobile menu toggle (header was just rebuilt, so query now).
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector("header nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
        toggle.classList.toggle("open");
      });
    }
  }

  /* ---------- 2. Back-to-top button (shared behaviour) ---------- */
  function wireBackToTop() {
    var btn = document.getElementById("backToTop");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.style.display = window.scrollY > 300 ? "flex" : "none";
    });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 3. Homepage stats banner auto-update ---------- */
  // Strategy: prefer LIVE counts parsed from publications.html / awards.html
  // (always truthful). If a fetch fails, fall back to data/stats.json so the
  // numbers are still sensible. The hard-coded HTML numbers are the final
  // fallback if everything fails.
  function setBanner(key, value) {
    if (value == null) return;
    var el = document.querySelector('[data-banner="' + key + '"]');
    if (el) el.textContent = value;
  }

  function parseDoc(text) {
    return new DOMParser().parseFromString(text, "text/html");
  }

  async function fetchDoc(url) {
    var res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(url + " -> " + res.status);
    return parseDoc(await res.text());
  }

  async function updateBanner() {
    // Only run if the banner exists on this page.
    if (!document.querySelector("[data-banner]")) return;

    var live = {};
    // --- Live counts from the two source pages ---
    try {
      var pubs = await fetchDoc("publications.html");
      live.publications = pubs.querySelectorAll(".pub-item").length || null;
      live.q1 = pubs.querySelectorAll(".badge-q1").length || null;
    } catch (e) { /* keep going; awards may still work */ }

    try {
      var awards = await fetchDoc("awards.html");
      var totalAwards = awards.querySelectorAll(".award-card").length || null;
      var firstPlace = awards.querySelectorAll(".award-card.gold").length || null;
      live.awards = totalAwards;
      live.firstplace = firstPlace;
    } catch (e) { /* keep going */ }

    // --- JSON fallback for anything live counting didn't fill ---
    var needFallback = ["publications", "q1", "awards", "firstplace"]
      .some(function (k) { return live[k] == null; });

    if (needFallback) {
      try {
        var res = await fetch("data/stats.json", { cache: "no-cache" });
        if (res.ok) {
          var json = await res.json();
          ["publications", "q1", "awards", "firstplace"].forEach(function (k) {
            if (live[k] == null && json[k] != null) live[k] = json[k];
          });
        }
      } catch (e) { /* leave hard-coded HTML numbers in place */ }
    }

    setBanner("publications", live.publications);
    setBanner("q1", live.q1);
    setBanner("awards", live.awards);
    setBanner("firstplace", live.firstplace);
  }

  /* ---------- 4. Privacy-friendly visitor analytics (GoatCounter) ---------- */
  // Counts a pageview on every page, on every visit. The data goes ONLY to
  // your private GoatCounter dashboard (https://YOURCODE.goatcounter.com) —
  // nothing is shown to visitors, no cookies are set.
  //
  // SETUP: replace YOURCODE below with the code you chose at signup, e.g.
  //   var GOATCOUNTER_CODE = "rospawan";
  // Leave it as the placeholder to disable analytics (the script no-ops).
  var GOATCOUNTER_CODE = "rospawan";

  function loadAnalytics() {
    if (!GOATCOUNTER_CODE || GOATCOUNTER_CODE === "YOURCODE") return; // not configured yet
    // Don't count your own local testing.
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "//gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count");
    document.body.appendChild(s);
  }

  /* ---------- Init ---------- */
  function init() {
    injectShell();
    wireBackToTop();
    updateBanner();
    loadAnalytics();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
