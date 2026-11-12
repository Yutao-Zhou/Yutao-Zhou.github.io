/* Shared, anonymous analytics for yutaozhou.com projects. */
(function () {
  "use strict";
  if (window.yzAnalytics) return;
  var boot = document.currentScript;
  var project = (boot && boot.dataset.project) || location.pathname.split("/").filter(Boolean)[0] || "portfolio";
  var queue = [];
  var allowedEvents = ["report_read", "report_engaged", "report_complete", "source_click", "outbound_click", "download"];
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
  function language() { return document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh" : "en"; }
  function track(name, properties) {
    if (disabled() || !allowedEvents.includes(name)) return;
    var data = { project: project, language: language() };
    ["report_date", "destination", "path"].forEach(function (key) {
      if (properties && typeof properties[key] === "string") data[key] = properties[key].slice(0, 300);
    });
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
  });

  if (project !== "finance") return;
  var reports = new Map();
  var activeKey = "";
  var stop = function () {};
  function syncReport() {
    var root = document.querySelector("[data-report-date]");
    var date = root && root.dataset.reportDate;
    var key = root && root.dataset.analyticsView === "brief" && /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : "";
    if (key === activeKey) return;
    stop(); activeKey = key;
    if (!key) return;
    var state = reports.get(key);
    if (!state) { state = { elapsed: 0, engaged: false, complete: false }; reports.set(key, state); track("report_read", { report_date: key }); }
    var last = performance.now();
    var visible = document.visibilityState !== "hidden";
    function tick() {
      var now = performance.now();
      if (visible) state.elapsed += Math.max(0, now - last);
      last = now;
      visible = document.visibilityState !== "hidden";
      if (!visible) return;
      if (state.elapsed >= 30000 && !state.engaged) { state.engaged = true; track("report_engaged", { report_date: key }); }
      var end = document.querySelector("[data-analytics-reading-end]");
      if (!state.complete && state.elapsed >= 3000 && window.scrollY > 80 && end && end.getBoundingClientRect().top <= window.innerHeight) {
        state.complete = true; track("report_complete", { report_date: key });
      }
    }
    var timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("scroll", tick, { passive: true });
    stop = function () { tick(); window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); window.removeEventListener("scroll", tick); };
  }
  function observe() {
    var observer = new MutationObserver(syncReport);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-report-date", "data-analytics-view"] });
    syncReport();
  }
  if (document.body) observe(); else document.addEventListener("DOMContentLoaded", observe, { once: true });
})();
