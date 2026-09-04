/* Enterprise AI Pulse — app.js */
(function () {
  "use strict";

  var VENDORS = window.VENDORS;
  var GROUPS = window.GROUPS;
  var TYPES = window.TYPES;
  var IMPACTS = window.IMPACTS;
  var NEWS = window.NEWS;
  var ONESHEETS = window.ONESHEETS;

  var vendorById = {};
  VENDORS.forEach(function (v) { vendorById[v.id] = v; });
  var impactById = {};
  IMPACTS.forEach(function (i) { impactById[i.id] = i; });
  var sheetByVendor = {};
  ONESHEETS.forEach(function (s) { sheetByVendor[s.vendor] = s; });

  var state = {
    query: "",
    types: new Set(),
    impacts: new Set(),
    vendors: new Set(),
    view: "cards", // cards | list
  };

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.indexOf("data-") === 0) node.setAttribute(k, attrs[k]);
      else node[k] = attrs[k];
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function tint(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function monthLabel(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function kpiBadge(kind, value) {
    var bands;
    if (kind === "pricing") {
      bands = [
        { max: 25, label: "Accessible", color: "#16A34A" },
        { max: 55, label: "Moderate", color: "#2563EB" },
        { max: 80, label: "Premium", color: "#D97706" },
        { max: 101, label: "Enterprise-only", color: "#DC2626" },
      ];
    } else if (kind === "adoption") {
      bands = [
        { max: 40, label: "Niche", color: "#7C3AED" },
        { max: 65, label: "Growing", color: "#D97706" },
        { max: 85, label: "Widespread", color: "#2563EB" },
        { max: 101, label: "Ubiquitous", color: "#16A34A" },
      ];
    } else {
      bands = [
        { max: 40, label: "Emerging", color: "#7C3AED" },
        { max: 65, label: "Growing", color: "#D97706" },
        { max: 85, label: "Established", color: "#2563EB" },
        { max: 101, label: "Leader", color: "#16A34A" },
      ];
    }
    for (var i = 0; i < bands.length; i++) {
      if (value < bands[i].max) return bands[i];
    }
    return bands[bands.length - 1];
  }

  function tierLine(sheet) {
    var m = kpiBadge("maturity", sheet.kpis.maturity.value).label;
    var a = kpiBadge("adoption", sheet.kpis.adoption.value).label;
    return m + " · " + a;
  }

  var ICONS = {
    model: '<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4" fill="none" stroke-width="1.6"/>',
    agent: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" fill="none" stroke-width="1.6"/>',
    plug: '<path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 01-12 0V9z"/><path d="M12 18v3" stroke-width="1.6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke-width="1.6"/>',
    chart: '<path d="M4 20V10M11 20V4M18 20v-7" stroke-width="2.4" stroke-linecap="round"/>',
    code: '<path d="M8 6L3 12l5 6M16 6l5 6-5 6" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1-4 4-6.5 7.5-6.5s6.5 2.5 7.5 6.5" fill="none" stroke-width="1.6"/>',
    office: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke-width="1.6"/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z" stroke-width="1.2"/>',
    eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7z" fill="none" stroke-width="1.6"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke-width="1.8"/><path d="M20 20l-5-5" stroke-width="1.8" stroke-linecap="round"/>',
  };

  function icon(key) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "cap-icon");
    svg.innerHTML = ICONS[key] || ICONS.model;
    return svg;
  }

  // ---------- vendor pills ----------
  function vendorPill(vendorId) {
    var v = vendorById[vendorId];
    return el("span", { class: "pill pill-vendor", style: "color:" + v.color + ";background:" + tint(v.color, 0.12) }, [v.name]);
  }
  function typePill(type) {
    return el("span", { class: "pill pill-type" }, [type]);
  }
  function impactPill(impactId) {
    var im = impactById[impactId];
    return el("span", { class: "pill pill-impact" }, [
      el("span", { class: "dot", style: "background:" + im.color }, []),
      im.label,
    ]);
  }

  // ---------- news card / row ----------
  function newsCard(item) {
    var v = vendorById[item.vendor];
    var card = el("a", { class: "news-card", href: item.url, target: "_blank", rel: "noopener", style: "--accent:" + v.color }, [
      el("div", { class: "news-card-tags" }, [vendorPill(item.vendor), typePill(item.type), impactPill(item.impact)]),
      el("h3", { class: "news-card-title" }, [item.title]),
      el("p", { class: "news-card-blurb" }, [item.blurb]),
      el("div", { class: "news-card-date" }, [item.dateLabel]),
    ]);
    return card;
  }

  function newsRow(item) {
    var v = vendorById[item.vendor];
    return el("a", { class: "news-row", href: item.url, target: "_blank", rel: "noopener", style: "--accent:" + v.color }, [
      el("div", { class: "news-row-main" }, [
        el("div", { class: "news-row-tags" }, [vendorPill(item.vendor), typePill(item.type), impactPill(item.impact)]),
        el("div", { class: "news-row-title" }, [item.title]),
      ]),
      el("div", { class: "news-row-date" }, [item.dateLabel]),
    ]);
  }

  // ---------- filtering ----------
  function matches(item) {
    if (state.types.size && !state.types.has(item.type)) return false;
    if (state.impacts.size && !state.impacts.has(item.impact)) return false;
    if (state.vendors.size && !state.vendors.has(item.vendor)) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (item.title + " " + item.blurb + " " + vendorById[item.vendor].name).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function sortedNews(list) {
    return list.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
  }

  // ---------- Home panel ----------
  function renderHome() {
    var panel = document.getElementById("panel-home");
    panel.innerHTML = "";

    var total = NEWS.length;
    var gaCount = NEWS.filter(function (n) { return n.impact === "ga" || n.impact === "available"; }).length;
    var announcedCount = NEWS.filter(function (n) { return n.impact === "announced"; }).length;
    var comingCount = NEWS.filter(function (n) { return n.impact === "coming"; }).length;
    var modelCount = NEWS.filter(function (n) { return n.type === "Model release"; }).length;

    var hero = el("section", { class: "hero" }, [
      el("div", { class: "hero-copy" }, [
        el("p", { class: "eyebrow" }, ["This month in Enterprise AI"]),
        el("h1", {}, ["Agentic AI goes wall-to-wall across the enterprise stack."]),
        el("p", { class: "hero-summary" }, [
          "September opens with Claude Fable 5.1 landing across Microsoft Copilot and AWS Bedrock, Google shipping Gemini 3.8 Flash to GA, and Salesforce, SAP, and 19 other vendors pushing agentic capabilities deeper into production."
        ]),
      ]),
      el("div", { class: "kpi-card" }, [
        el("p", { class: "kpi-card-label" }, ["At a glance"]),
        kpiRow(total, "announcements tracked"),
        kpiRow(gaCount, "available now"),
        kpiRow(announcedCount, "announced / in preview"),
        kpiRow(comingCount, "coming soon"),
        kpiRow(modelCount, "new model releases"),
      ]),
    ]);
    panel.appendChild(hero);

    panel.appendChild(renderFilterCard());

    var featured = NEWS.filter(function (n) { return n.featured; });
    if (featured.length) {
      panel.appendChild(el("h2", { class: "section-label" }, ["Top stories this month"]));
      panel.appendChild(el("div", { class: "grid-3" }, sortedNews(featured).map(newsCard)));
    }

    var allSection = el("div", { class: "all-section" });
    var header = el("div", { class: "all-header" }, [
      el("h2", { class: "section-label", id: "all-count-label" }, ["All announcements"]),
      el("div", { class: "view-toggle" }, [
        el("button", { class: "view-btn" + (state.view === "cards" ? " active" : ""), "data-view": "cards", onclick: function () { setView("cards"); } }, ["Cards"]),
        el("button", { class: "view-btn" + (state.view === "list" ? " active" : ""), "data-view": "list", onclick: function () { setView("list"); } }, ["List"]),
      ]),
    ]);
    allSection.appendChild(header);
    var resultsWrap = el("div", { id: "results-wrap" });
    allSection.appendChild(resultsWrap);
    panel.appendChild(allSection);

    renderResults();
  }

  function kpiRow(value, label) {
    return el("div", { class: "kpi-row" }, [
      el("span", { class: "kpi-num" }, [String(value)]),
      el("span", { class: "kpi-label" }, [label]),
    ]);
  }

  function renderFilterCard() {
    var card = el("div", { class: "filter-card" });

    var searchRow = el("div", { class: "search-row" }, [
      el("input", {
        type: "search", class: "search-input", placeholder: "Search headlines and descriptions…",
        value: state.query,
        oninput: function (e) { state.query = e.target.value; renderResults(); },
      }),
      el("button", { class: "clear-btn", onclick: clearFilters }, ["Clear"]),
    ]);
    card.appendChild(searchRow);

    card.appendChild(chipRow("Type", TYPES, state.types, function (t) { toggleSet(state.types, t); renderResults(); }));
    card.appendChild(chipRow("Impact", IMPACTS.map(function (i) { return i.label; }), state.impacts, function (label) {
      var im = IMPACTS.filter(function (i) { return i.label === label; })[0];
      toggleSet(state.impacts, im.id);
      renderResults();
    }, IMPACTS));
    card.appendChild(chipRow("Vendor", VENDORS.map(function (v) { return v.name; }), state.vendors, function (name) {
      var v = VENDORS.filter(function (x) { return x.name === name; })[0];
      toggleSet(state.vendors, v.id);
      renderResults();
    }));

    var count = el("p", { class: "result-count", id: "result-count" }, [countText()]);
    card.appendChild(count);
    return card;
  }

  function countText() {
    return NEWS.filter(matches).length + " announcements";
  }

  function chipRow(label, options, activeSet, onToggle, impactMeta) {
    var row = el("div", { class: "chip-row" }, [el("span", { class: "chip-label" }, [label])]);
    var wrap = el("div", { class: "chip-wrap" });
    options.forEach(function (opt, idx) {
      var isActive;
      if (impactMeta) {
        isActive = activeSet.has(impactMeta[idx].id);
      } else if (label === "Vendor") {
        var v = VENDORS.filter(function (x) { return x.name === opt; })[0];
        isActive = activeSet.has(v.id);
      } else {
        isActive = activeSet.has(opt);
      }
      var chip = el("button", { class: "chip" + (isActive ? " chip-active" : ""), onclick: function () { onToggle(opt); } });
      if (impactMeta) {
        chip.appendChild(el("span", { class: "dot", style: "background:" + impactMeta[idx].color }, []));
      }
      chip.appendChild(document.createTextNode(opt));
      wrap.appendChild(chip);
    });
    row.appendChild(wrap);
    return row;
  }

  function toggleSet(set, val) {
    if (set.has(val)) set.delete(val); else set.add(val);
  }

  function clearFilters() {
    state.query = "";
    state.types.clear();
    state.impacts.clear();
    state.vendors.clear();
    renderHome();
  }

  function setView(v) {
    state.view = v;
    renderHome();
  }

  function renderResults() {
    var countEl = document.getElementById("result-count");
    if (countEl) countEl.textContent = countText();
    var wrap = document.getElementById("results-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";
    var list = sortedNews(NEWS.filter(matches));
    if (!list.length) {
      wrap.appendChild(el("p", { class: "empty-state" }, ["No announcements match these filters."]));
      return;
    }
    if (state.view === "cards") {
      wrap.appendChild(el("div", { class: "grid-2" }, list.map(newsCard)));
    } else {
      wrap.appendChild(el("div", { class: "list-view" }, list.map(newsRow)));
    }
  }

  // ---------- Vendor panel ----------
  function renderVendorPanel(vendorId) {
    var panelId = "panel-" + vendorId;
    var panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = "";

    var v = vendorById[vendorId];
    var sheet = sheetByVendor[vendorId];

    var header = el("div", { class: "vendor-header" }, [
      el("div", { class: "vendor-mark-lg", style: "background:" + v.color }, [v.mark]),
      el("div", {}, [
        el("h1", {}, [v.name]),
        el("p", { class: "vendor-eyebrow" }, ["AI news · " + v.tagline]),
      ]),
    ]);
    panel.appendChild(header);

    if (sheet) {
      panel.appendChild(el("button", {
        class: "btn-ghost-sm", "data-goto": "sheet-" + vendorId,
      }, ["View one-sheet →"]));
    }

    var items = sortedNews(NEWS.filter(function (n) { return n.vendor === vendorId; }));
    var byMonth = {};
    var order = [];
    items.forEach(function (n) {
      var m = monthLabel(n.date);
      if (!byMonth[m]) { byMonth[m] = []; order.push(m); }
      byMonth[m].push(n);
    });

    var stream = el("div", { class: "vendor-stream" });
    order.forEach(function (m) {
      stream.appendChild(el("p", { class: "month-divider" }, [m]));
      byMonth[m].forEach(function (n) {
        stream.appendChild(newsRow(n));
      });
    });
    panel.appendChild(stream);
  }

  // ---------- Vendor sheets index ----------
  function renderSheetsIndex() {
    var panel = document.getElementById("panel-sheets");
    panel.innerHTML = "";
    panel.appendChild(el("p", { class: "eyebrow" }, ["Vendor sheets"]));
    panel.appendChild(el("h1", {}, [ONESHEETS.length + " vendor one-sheets — highlights, KPIs, top news"]));
    panel.appendChild(el("p", { class: "hero-summary" }, [
      "A quick briefing on each vendor's AI offering, maturity, industry adoption, and pricing tier. Click any card to open the full one-sheet.",
    ]));

    var grid = el("div", { class: "grid-3" });
    VENDORS.forEach(function (v) {
      var sheet = sheetByVendor[v.id];
      if (!sheet) return;
      var card = el("div", { class: "sheet-card", "data-goto": "sheet-" + v.id }, [
        el("div", { class: "sheet-card-top" }, [
          el("div", { class: "vendor-mark", style: "background:" + v.color }, [v.mark]),
          el("div", {}, [
            el("h3", {}, [v.name]),
            el("p", { class: "sheet-tier" }, [tierLine(sheet)]),
          ]),
        ]),
        el("p", { class: "sheet-positioning" }, [sheet.positioning]),
        miniBars(sheet),
        el("span", { class: "link-arrow" }, ["Open one-sheet →"]),
      ]);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
  }

  function miniBars(sheet) {
    var wrap = el("div", { class: "mini-bars" });
    ["maturity", "adoption", "pricing"].forEach(function (k) {
      var val = sheet.kpis[k].value;
      wrap.appendChild(el("div", { class: "mini-bar-row" }, [
        el("span", { class: "mini-bar-label" }, [k.toUpperCase()]),
        el("div", { class: "mini-bar-track" }, [
          el("div", { class: "mini-bar-fill", style: "width:" + val + "%" }, []),
        ]),
      ]));
    });
    return wrap;
  }

  // ---------- Individual one-sheet ----------
  function renderSheet(vendorId) {
    var panelId = "sheet-" + vendorId;
    var panel = document.getElementById(panelId);
    if (!panel) return;
    panel.innerHTML = "";

    var v = vendorById[vendorId];
    var sheet = sheetByVendor[vendorId];
    if (!sheet) return;

    panel.appendChild(el("button", { class: "breadcrumb", "data-goto": "sheets" }, ["← All vendor sheets"]));

    panel.appendChild(el("p", { class: "eyebrow" }, ["Vendor one-sheet"]));
    panel.appendChild(el("div", { class: "sheet-header" }, [
      el("div", { class: "vendor-mark-xl", style: "background:" + v.color }, [v.mark]),
      el("div", {}, [
        el("h1", {}, [v.name]),
      ]),
    ]));
    panel.appendChild(el("p", { class: "sheet-header-positioning" }, [sheet.positioning]));

    var cols = el("div", { class: "sheet-cols" });

    var left = el("div", {}, [el("p", { class: "section-label" }, ["Key AI capabilities"])]);
    var capGrid = el("div", { class: "cap-grid" });
    sheet.capabilities.forEach(function (c) {
      capGrid.appendChild(el("div", { class: "cap-item" }, [
        icon(c.icon),
        el("div", {}, [
          el("p", { class: "cap-title" }, [c.title]),
          el("p", { class: "cap-note" }, [c.note]),
        ]),
      ]));
    });
    left.appendChild(capGrid);
    cols.appendChild(left);

    var right = el("div", {}, [el("p", { class: "section-label" }, ["KPIs"])]);
    [
      { key: "maturity", title: "AI Maturity" },
      { key: "adoption", title: "Industry Adoption" },
      { key: "pricing", title: "Enterprise Pricing Tier" },
    ].forEach(function (meta) {
      var kpi = sheet.kpis[meta.key];
      var badge = kpiBadge(meta.key, kpi.value);
      right.appendChild(el("div", { class: "kpi-meter" }, [
        el("div", { class: "kpi-meter-top" }, [
          el("span", { class: "kpi-meter-title" }, [meta.title]),
          el("span", { class: "kpi-badge", style: "color:" + badge.color + ";background:" + tint(badge.color, 0.12) }, [badge.label]),
        ]),
        el("div", { class: "kpi-track" }, [el("div", { class: "kpi-fill", style: "width:" + kpi.value + "%;background:" + badge.color }, [])]),
        el("div", { class: "kpi-axis" }, [el("span", {}, ["0"]), el("span", {}, ["50"]), el("span", {}, ["100"])]),
        el("p", { class: "kpi-note" }, [kpi.note]),
      ]));
    });
    cols.appendChild(right);
    panel.appendChild(cols);

    var recent = sortedNews(NEWS.filter(function (n) { return n.vendor === vendorId; })).slice(0, 2);
    if (recent.length) {
      panel.appendChild(el("p", { class: "section-label" }, ["Top 2 recent announcements"]));
      panel.appendChild(el("div", { class: "grid-2" }, recent.map(newsCard)));
    }

    panel.appendChild(el("div", { class: "cta-row" }, [
      el("button", { class: "btn-primary", "data-goto": vendorId }, ["View all " + v.name + " news →"]),
      el("button", { class: "btn-ghost", "data-goto": "sheets" }, ["Back to sheets"]),
    ]));
  }

  // ---------- tab / panel navigation ----------
  function activate(panelId) {
    var panels = document.querySelectorAll(".panel");
    var found = document.getElementById("panel-" + panelId);
    if (!found) {
      panelId = "home";
      found = document.getElementById("panel-home");
    }
    panels.forEach(function (p) { p.classList.remove("panel-active"); });
    found.classList.add("panel-active");

    var tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(function (t) {
      t.classList.toggle("tab-active", t.getAttribute("data-tab") === panelId);
    });

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    if (panelId === "home") renderHome();
    else if (panelId === "sheets") renderSheetsIndex();
    else if (panelId.indexOf("sheet-") === 0) renderSheet(panelId.replace("sheet-", ""));
    else if (vendorById[panelId]) renderVendorPanel(panelId);
  }

  function buildNav() {
    var nav = document.getElementById("tabs");
    nav.appendChild(el("button", { class: "tab-btn tab-active", "data-tab": "home", onclick: function () { activate("home"); } }, ["What's New"]));
    nav.appendChild(el("button", { class: "tab-btn", "data-tab": "sheets", onclick: function () { activate("sheets"); } }, ["Vendor Sheets"]));

    GROUPS.forEach(function (g) {
      var groupVendors = VENDORS.filter(function (v) { return v.group === g.id; });
      nav.appendChild(el("div", { class: "tab-divider" }, []));
      nav.appendChild(el("span", { class: "tab-section-label" }, [g.label]));
      groupVendors.forEach(function (v) {
        var btn = el("button", { class: "tab-btn tab-vendor", "data-tab": v.id, onclick: function () { activate(v.id); } }, [
          el("span", { class: "tab-mark", style: "background:" + v.color }, [v.mark]),
          v.name,
        ]);
        nav.appendChild(btn);
      });
    });
  }

  function buildPanels() {
    var container = document.getElementById("panels");
    container.appendChild(el("section", { class: "panel panel-active", id: "panel-home" }, []));
    container.appendChild(el("section", { class: "panel", id: "panel-sheets" }, []));
    VENDORS.forEach(function (v) {
      container.appendChild(el("section", { class: "panel", id: "panel-" + v.id }, []));
      container.appendChild(el("section", { class: "panel", id: "sheet-" + v.id }, []));
    });
  }

  // event delegation for [data-goto]
  document.addEventListener("click", function (e) {
    var target = e.target.closest ? e.target.closest("[data-goto]") : null;
    if (target) {
      e.preventDefault();
      activate(target.getAttribute("data-goto"));
    }
  });

  function initHeaderMeta() {
    var d = new Date((window.LAST_REFRESHED || "2026-09-03") + "T00:00:00");
    var periodEl = document.getElementById("period-pill");
    var updatedEl = document.getElementById("updated-label");
    if (periodEl) periodEl.textContent = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    if (updatedEl) updatedEl.textContent = "Updated " + d.toLocaleString("en-US", { month: "short", day: "numeric" });
  }

  function initBackToTop() {
    var btn = document.getElementById("to-top");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.hidden = window.scrollY < 480;
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initNavFade() {
    var nav = document.querySelector(".tabsbar-inner");
    var fade = document.querySelector(".tabsbar-fade");
    if (!nav || !fade) return;
    function update() {
      var atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4;
      fade.classList.toggle("fade-hidden", atEnd);
    }
    nav.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    setTimeout(update, 0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initHeaderMeta();
    buildNav();
    buildPanels();
    renderHome();
    initBackToTop();
    initNavFade();
  });
})();
