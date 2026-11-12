/* Shared, anonymous analytics for yutaozhou.com projects. */
(function () {
  "use strict";
  if (window.yzAnalytics) return;
  var boot = document.currentScript;
  var project = (boot && boot.dataset.project) || location.pathname.split("/").filter(Boolean)[0] || "portfolio";
  var queue = [];
  var allowedEvents = ["tool_tab_click", "tool_tab_view", "car_view", "car_engaged", "car_complete", "report_open", "report_read", "report_engaged", "report_complete", "source_click", "outbound_click", "download"];
  var tabs = ["calculator", "compare", "schedule", "guide", "recast", "refinance", "buy-rent"];
  function disabled() {
    try {
      return !["yutaozhou.com", "www.yutaozhou.com"].includes(location.hostname) ||
        localStorage.getItem("umami.disabled") === "1" || navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
    } catch (_) { return true; }
  }
  function safePath(value, referrer) {
    try {
      var url = new URL(value, location.origin);
      if (!/^https?:$/.test(url.protocol)) return "";
      return referrer ? url.origin + url.pathname : url.pathname;
    } catch (_) { return ""; }
  }
  function language() {
    var root = document.querySelector("[data-analytics-language]");
    return ((root && root.dataset.analyticsLanguage) || document.documentElement.lang).toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  function track(name, properties) {
    if (disabled() || !allowedEvents.includes(name)) return;
    var data = { project: project, language: language() };
    ["destination", "path"].forEach(function (key) {
      if (properties && typeof properties[key] === "string") data[key] = properties[key].slice(0, 300);
    });
    ["report_date", "previous_report_date"].forEach(function (key) {
      if (properties && typeof properties[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(properties[key])) data[key] = properties[key];
    });
    ["tab", "previous_tab"].forEach(function (key) {
      if (properties && tabs.includes(properties[key])) data[key] = properties[key];
    });
    if (properties && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(properties.car_slug || "") && properties.car_slug.length <= 80) {
      data.car_slug = properties.car_slug;
      if (typeof properties.car_name === "string") data.car_name = properties.car_name.slice(0, 100);
    }
    if (properties && ["initial", "navigation", "archive", "edition_change"].includes(properties.entry)) data.entry = properties.entry;
    if (window.umami && typeof window.umami.track === "function") {
      try { Promise.resolve(window.umami.track(name, data)).catch(function () {}); } catch (_) {}
    } else if (queue.length < 50) queue.push([name, data]);
  }
  window.yzAnalytics = { project: project, enabled: !disabled(), track: track };
  if (disabled() || location.pathname === "/analytics-settings.html") return;
  window.yzAnalyticsBeforeSend = function (type, payload) {
    if (disabled()) return false;
    var clean = Object.assign({}, payload);
    if (typeof clean.url === "string") clean.url = safePath(clean.url, false);
    if (typeof clean.referrer === "string") clean.referrer = safePath(clean.referrer, true);
    return clean;
  };
  var script = document.createElement("script");
  script.defer = true;
  script.src = "https://cloud.umami.is/script.js";
  script.dataset.websiteId = "f8cf3636-b17d-4011-92dc-6ae29d0d91a3";
  script.dataset.domains = "yutaozhou.com,www.yutaozhou.com";
  script.dataset.tag = project;
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";
  script.dataset.doNotTrack = "true";
  script.dataset.beforeSend = "yzAnalyticsBeforeSend";
  script.addEventListener("load", function () {
    var pending = queue.splice(0);
    pending.forEach(function (event) { track(event[0], event[1]); });
  });
  document.head.appendChild(script);

  document.addEventListener("click", function (event) {
    var tab = event.target.closest && event.target.closest("[data-analytics-tab]");
    if (project === "house-shopping" && tab && tabs.includes(tab.dataset.analyticsTab)) {
      var tool = document.querySelector("[data-analytics-tool]");
      track("tool_tab_click", { tab: tab.dataset.analyticsTab, previous_tab: tool && tool.dataset.analyticsTool });
    }
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    var url;
    try { url = new URL(link.href, location.origin); } catch (_) { return; }
    if (!/^https?:$/.test(url.protocol)) return;
    var root = document.querySelector("[data-report-date]");
    var properties = { destination: url.hostname, path: url.pathname };
    if (root && /^\d{4}-\d{2}-\d{2}$/.test(root.dataset.reportDate || "")) properties.report_date = root.dataset.reportDate;
    if (project === "finance" && link.classList.contains("source-link")) track("source_click", properties);
    else if (link.hasAttribute("download") || /\.(?:pdf|csv|zip)$/i.test(url.pathname)) track("download", properties);
    else if (url.origin !== location.origin) track("outbound_click", properties);
  }, true);

  function observe(sync, attributes) {
    function start() {
      var observer = new MutationObserver(sync);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: attributes });
      sync();
    }
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
  }
  // Accumulate visible reading time per article, even when the reader returns to it.
  function read(state, properties, prefix, endSelector) {
    var last = performance.now();
    var visible = document.visibilityState !== "hidden";
    var stopped = false;
    function tick(checkEnd) {
      if (stopped) return;
      var now = performance.now();
      if (visible) state.elapsed += Math.max(0, now - last);
      last = now;
      visible = document.visibilityState !== "hidden";
      if (!visible) return;
      if (state.elapsed >= 30000 && !state.engaged) { state.engaged = true; track(prefix + "_engaged", properties); }
      var end = checkEnd !== false && document.querySelector(endSelector);
      if (!state.complete && state.elapsed >= 3000 && window.scrollY > 80 && end && end.getBoundingClientRect().top <= window.innerHeight) {
        state.complete = true; track(prefix + "_complete", properties);
      }
    }
    var timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("scroll", tick, { passive: true });
    return function () { if (stopped) return; tick(false); stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("scroll", tick); };
  }
  if (project === "house-shopping") {
    var activeTab = "";
    observe(function () {
      var tool = document.querySelector("[data-analytics-tool]");
      var next = tool && tool.dataset.analyticsTool;
      if (!tabs.includes(next) || next === activeTab) return;
      track("tool_tab_view", { tab: next, previous_tab: activeTab, entry: activeTab ? "navigation" : "initial" });
      activeTab = next;
    }, ["data-analytics-tool"]);
    return;
  }
  if (project === "showroom-talks") {
    var cars = new Map();
    var activeCar = "";
    var stopCar = function () {};
    observe(function () {
      var article = document.querySelector("[data-analytics-car]");
      var slug = article && article.dataset.analyticsCar;
      var key = article && !article.hidden && article.dataset.analyticsView === "review" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "") ? slug : "";
      if (key === activeCar) return;
      stopCar(); activeCar = key;
      if (!key) return;
      var properties = { car_slug: key, car_name: article.dataset.analyticsCarName };
      track("car_view", properties);
      if (!cars.has(key)) cars.set(key, { elapsed: 0, engaged: false, complete: false });
      stopCar = read(cars.get(key), properties, "car", "[data-analytics-car-end]");
    }, ["data-analytics-car", "data-analytics-view", "hidden"]);
    return;
  }
  if (project !== "finance") return;
  var reports = new Map();
  var activeKey = "";
  var lastReport = "";
  var activeView = "";
  var stop = function () {};
  function syncReport() {
    var root = document.querySelector("[data-report-date]");
    var date = root && root.dataset.reportDate;
    var previousView = activeView;
    activeView = root && root.dataset.analyticsView;
    var key = root && root.dataset.analyticsView === "brief" && /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : "";
    if (key === activeKey) return;
    stop(); activeKey = key;
    if (!key) return;
    track("report_open", { report_date: key, previous_report_date: lastReport, entry: previousView === "archive" ? "archive" : lastReport ? "edition_change" : "initial" });
    lastReport = key;
    var state = reports.get(key);
    if (!state) { state = { elapsed: 0, engaged: false, complete: false }; reports.set(key, state); track("report_read", { report_date: key }); }
    stop = read(state, { report_date: key }, "report", "[data-analytics-reading-end]");
  }
  observe(syncReport, ["data-report-date", "data-analytics-view"]);
})();
