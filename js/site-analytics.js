/* Shared site notices and opt-in traffic measurement for yutaozhou.com. */
(function () {
  "use strict";
  if (window.yzAnalytics) return;
  var boot = document.currentScript;
  var project = (boot && boot.dataset.project) || location.pathname.split("/").filter(Boolean)[0] || "portfolio";
  var queue = [];
  var preferenceKey = "yz.analytics-consent.v1";
  var settingsPath = "/analytics-settings.html";
  var privacyPath = "/privacy.html";
  var consentEvent = "yz:analytics-consent";
  var production = location.protocol === "https:" && ["yutaozhou.com", "www.yutaozhou.com"].includes(location.hostname);
  var usage = null;
  var tracker = null;
  var allowedEvents = ["tool_tab_click", "tool_tab_view", "car_view", "car_engaged", "car_complete", "report_open", "report_read", "report_engaged", "report_complete", "source_click", "outbound_click", "download"];
  var tabs = ["calculator", "compare", "schedule", "guide", "recast", "refinance", "buy-rent"];
  function blocked() {
    return !production || navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  }
  function decision() {
    try {
      if (localStorage.getItem("umami.disabled") === "1") return "deny";
      var saved = localStorage.getItem(preferenceKey);
      return saved === "allow" || saved === "deny" ? saved : null;
    } catch (_) { return null; }
  }
  function disabled() {
    return blocked() || decision() !== "allow" || [settingsPath, privacyPath].includes(location.pathname);
  }
  function saveDecision(value) {
    if (value !== "deny" && (value !== "allow" || blocked())) return false;
    try {
      if (value === "deny") localStorage.setItem("umami.disabled", "1");
      localStorage.setItem(preferenceKey, value);
      if (value === "allow") localStorage.removeItem("umami.disabled");
    } catch (_) { return false; }
    syncConsent();
    return true;
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
  window.yzAnalytics = { project: project, get enabled() { return !disabled(); }, track: track };
  window.yzPrivacy = { decision: decision, blocked: blocked, saveDecision: saveDecision };
  window.yzAnalyticsBeforeSend = function (type, payload) {
    if (disabled()) return false;
    var clean = Object.assign({}, payload);
    if (typeof clean.url === "string") clean.url = safePath(clean.url, false);
    if (typeof clean.referrer === "string") clean.referrer = safePath(clean.referrer, true);
    return clean;
  };
  function loadTracker() {
    if (tracker || disabled()) return;
    var script = document.createElement("script");
    script.defer = true;
    script.referrerPolicy = "no-referrer";
    script.src = "https://cloud.umami.is/script.js";
    script.dataset.websiteId = "f8cf3636-b17d-4011-92dc-6ae29d0d91a3";
    script.dataset.domains = "yutaozhou.com,www.yutaozhou.com";
    script.dataset.tag = project;
    script.dataset.excludeSearch = "true";
    script.dataset.excludeHash = "true";
    script.dataset.doNotTrack = "true";
    script.dataset.beforeSend = "yzAnalyticsBeforeSend";
    script.addEventListener("load", function () {
      queue.splice(0).forEach(function (event) { track(event[0], event[1]); });
    });
    script.addEventListener("error", function () { queue.length = 0; script.remove(); tracker = null; });
    tracker = script;
    document.head.appendChild(script);
  }

  function syncConsent() {
    var allowed = !disabled();
    if (!allowed) {
      queue.length = 0;
      if (usage) usage.abort();
      usage = null;
    } else if (!usage) {
      usage = new AbortController();
      loadTracker();
      observeUsage(usage.signal);
    }
    window.dispatchEvent(new CustomEvent(consentEvent, { detail: { allowed: allowed } }));
  }

  function observeUsage(signal) {

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
  }, { capture: true, signal: signal });

  function observe(sync, attributes) {
    function start() {
      var observer = new MutationObserver(sync);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: attributes });
      signal.addEventListener("abort", function () { observer.disconnect(); }, { once: true });
      sync();
    }
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true, signal: signal });
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
    document.addEventListener("visibilitychange", tick, { signal: signal });
    window.addEventListener("scroll", tick, { passive: true, signal: signal });
    signal.addEventListener("abort", stop, { once: true });
    function stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("scroll", tick);
      signal.removeEventListener("abort", stop);
    }
    return function () { if (!stopped) tick(false); stop(); };
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
  }

  function mountNotices() {
    if (!production || [settingsPath, privacyPath].includes(location.pathname)) return;
    function node(tag, text, className) {
      var element = document.createElement(tag);
      if (text) element.textContent = text;
      if (className) element.className = className;
      return element;
    }
    function link(href) { var element = node("a"); element.href = href; return element; }
    var style = node("style", [
      "#yz-site-policy{box-sizing:border-box;display:block;max-width:80rem;margin:1.5rem auto 0;padding:1rem 1.25rem;border-top:1px solid currentColor;font:400 .875rem/1.55 system-ui,sans-serif;color:inherit;text-align:start}",
      "#yz-site-policy p,#yz-privacy-panel p{margin:.45rem 0;font:inherit;color:inherit}",
      "#yz-site-policy a,#yz-privacy-panel a{color:inherit;text-decoration:underline;text-underline-offset:.2em}",
      "#yz-site-policy .yz-links,#yz-privacy-panel .yz-choices{display:flex;gap:.65rem 1rem;flex-wrap:wrap;align-items:center}",
      "#yz-privacy-panel{position:fixed;z-index:2147483000;right:1rem;bottom:1rem;width:min(26rem,calc(100vw - 2rem));box-sizing:border-box;padding:1rem;border:1px solid #94a3b8;border-radius:.8rem;box-shadow:0 8px 30px #0f172a38;background:#fff;color:#172334;font:400 .9rem/1.45 system-ui,sans-serif;text-align:start;max-height:calc(100vh - 2rem);overflow:auto}",
      "#yz-privacy-panel[hidden]{display:none!important}#yz-privacy-panel h2{font:700 1.05rem/1.4 system-ui,sans-serif;margin:0;color:inherit}",
      "#yz-privacy-panel button{font:inherit;font-weight:600;color:inherit;background:transparent;border:1px solid currentColor;border-radius:.45rem;padding:.45rem .7rem;cursor:pointer}",
      "#yz-privacy-panel button:disabled{opacity:.55;cursor:default}#yz-privacy-panel :focus-visible,#yz-site-policy :focus-visible{outline:2px solid #4380dc;outline-offset:3px}",
      "[data-theme=dark] #yz-privacy-panel,.dark #yz-privacy-panel{background:#182333;color:#f3f7ff}"
    ].join("\n"));
    document.head.appendChild(style);
    var footer = document.getElementById("yz-site-policy") || node("footer");
    footer.id = "yz-site-policy";
    var copyright = node("p");
    var disclaimer = node("p");
    var privacy = link(privacyPath);
    var settings = link(settingsPath);
    var links = node("div", "", "yz-links");
    links.append(privacy, settings);
    footer.replaceChildren(copyright, disclaimer, links);
    if (!footer.isConnected) document.body.append(footer);

    var panel = node("aside");
    panel.id = "yz-privacy-panel";
    panel.setAttribute("aria-labelledby", "yz-privacy-heading");
    panel.hidden = true;
    var title = node("h2");
    title.id = "yz-privacy-heading";
    var introduction = node("p");
    var details = link(privacyPath);
    var choices = node("div", "", "yz-choices");
    var allow = node("button");
    var deny = node("button");
    var status = node("p");
    status.setAttribute("role", "status");
    status.hidden = true;
    allow.type = deny.type = "button";
    choices.append(allow, deny);
    panel.append(title, introduction, choices, details, status);
    document.body.append(panel);
    function format() {
      var chinese = language() === "zh";
      function say(en, zh) { return chinese ? zh : en; }
      copyright.textContent = say("© " + new Date().getFullYear() + " Yutao Zhou. Rights in third-party materials remain with their owners.", "© " + new Date().getFullYear() + " Yutao Zhou。第三方材料的权利归各自权利人所有。");
      var notices = {
        finance: ["AI-assisted market commentary for information and education only. It is not investment advice. Verify details with primary sources.", "AI 辅助市场评论仅供参考和学习，不构成投资建议。请通过一手资料核验信息。"],
        "earnings-lens": ["AI-assisted earnings research for information and education only. It is not investment advice. Verify details with primary sources.", "AI 辅助财报分析仅供参考和学习，不构成投资建议。请通过一手资料核验信息。"],
        "house-shopping": ["Illustrative estimates. Actual rates, taxes and costs may differ. This is not lending, tax or financial advice.", "计算结果仅供估算，实际利率、税费和成本可能不同，不构成贷款、税务或财务建议。"],
        "showroom-talks": ["Reviews describe personal experience. Check vehicle specifications, condition and current pricing independently.", "车评基于个人体验。请自行核实车辆配置、车况及当前价格。"],
        portfolio: ["This is a personal site. Views are my own, and project or résumé information may change.", "这是个人网站，观点仅代表本人。项目和履历信息可能更新。"],
        "cv-zh": ["This is a personal résumé. Information is provided for reference and may change.", "这是个人履历，内容仅供参考，可能随时更新。"],
      };
      disclaimer.textContent = say.apply(null, notices[project] || ["This project is provided for information or demonstration. Check the source and verify results before relying on them.", "本项目仅供参考或演示。使用结果前请查阅来源并自行核实。"]);
      privacy.textContent = details.textContent = say("Privacy & data use", "隐私与数据使用");
      privacy.href = details.href = privacyPath + (chinese ? "#zh" : "");
      settings.textContent = title.textContent = say("Analytics preferences", "访问统计设置");
      introduction.textContent = say("Allow optional Umami analytics across yutaozhou.com projects to measure page visits and features used. You can change this choice at any time.", "允许 Umami 统计 yutaozhou.com 各项目的访问和功能使用情况。你可以随时更改选择。");
      allow.textContent = say("Allow analytics", "允许统计");
      deny.textContent = say("Decline analytics", "拒绝统计");
      allow.disabled = blocked();
      status.textContent = blocked() ? say("Your browser's privacy signal keeps analytics off.", "浏览器的隐私信号已关闭访问统计。") : say("This browser could not save your choice.", "此浏览器无法保存你的选择。");
    }
    function show() {
      format();
      status.hidden = !blocked();
      panel.hidden = false;
    }
    function choose(value) {
      var hadFocus = panel.contains(document.activeElement);
      if (!saveDecision(value)) { status.hidden = false; return; }
      panel.hidden = true;
      if (hadFocus) settings.focus();
    }
    settings.addEventListener("click", function (event) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); show(); (blocked() ? deny : allow).focus();
    });
    allow.addEventListener("click", function () { choose("allow"); });
    deny.addEventListener("click", function () { choose("deny"); });
    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { panel.hidden = true; settings.focus(); }
    });
    new MutationObserver(format).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["lang", "data-analytics-language"] });
    window.addEventListener(consentEvent, function () { if (decision()) panel.hidden = true; });
    if (decision() === null && !blocked()) show(); else format();
  }

  window.addEventListener("storage", function (event) {
    if ([preferenceKey, "umami.disabled", null].includes(event.key)) syncConsent();
  });
  if (document.body) mountNotices(); else document.addEventListener("DOMContentLoaded", mountNotices, { once: true });
  syncConsent();
})();
