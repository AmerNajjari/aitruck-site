/* AI Truck website. One file, no libraries. */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- go-live settings (see GO-LIVE.md) */
  var CONFIG = {
    whatsapp: "",   // business WhatsApp, country code and number, no plus: "9665XXXXXXXX"
    endpoint: "",   // where requests are stored: a Google Apps Script web app URL, or a Formspree form URL
    gtm: "",        // Google Tag Manager container, "GTM-XXXXXXX" (add GA4, TikTok and others inside it)
    meta: "",       // Meta (Facebook, Instagram) pixel ID
    snap: ""        // Snapchat pixel ID
  };

  var S = JSON.parse(document.getElementById("i18n").textContent);
  var AR = S.lang === "ar";
  var PRICES = { brand: 1250, web: 2500, social: 3250 };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function fmt(x) { return Number(x).toLocaleString("en-US"); }
  function pad(x) { return (x < 10 ? "0" : "") + x; }
  function sget(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  /* ---------------------------------------------------------------- campaign source, kept for the lead */
  var qs = new URLSearchParams(location.search);
  var src = sget("at-src") || {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid", "ScCid"].forEach(function (k) {
    if (qs.get(k)) src[k] = qs.get(k);
  });
  if (!src.landing) { src.landing = location.pathname + location.search; src.referrer = document.referrer || ""; }
  sset("at-src", src);
  $$(".lang").forEach(function (a) { if (location.search) a.href = a.getAttribute("href") + location.search; });

  /* ---------------------------------------------------------------- tags and pixels, only when set */
  function addScript(url) { var s = document.createElement("script"); s.async = true; s.src = url; document.head.appendChild(s); }
  window.dataLayer = window.dataLayer || [];
  if (CONFIG.gtm) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    addScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CONFIG.gtm));
  }
  if (CONFIG.meta) {
    var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
    if (!window._fbq) window._fbq = f; f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
    addScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.meta); window.fbq("track", "PageView");
  }
  if (CONFIG.snap) {
    var a = window.snaptr = function () { a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments); };
    a.queue = [];
    addScript("https://sc-static.net/scevent.min.js");
    window.snaptr("init", CONFIG.snap, {}); window.snaptr("track", "PAGE_VIEW");
  }
  function track(ev, data) {
    data = data || {};
    try {
      window.dataLayer.push(Object.assign({ event: "aitruck_" + ev }, data));
      if (window.fbq) {
        if (ev === "lead") window.fbq("track", "Lead", { value: data.value || 0, currency: "SAR" });
        else if (ev === "book_open") window.fbq("track", "InitiateCheckout");
      }
      if (window.snaptr) {
        if (ev === "lead") window.snaptr("track", "SIGN_UP", { price: data.value || 0, currency: "SAR" });
        else if (ev === "book_open") window.snaptr("track", "START_CHECKOUT");
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- bar and hero */
  var bar = $(".bar"), filmBox = $(".film"), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      bar.classList.toggle("solid", scrollY > 40);
      // the film opens up to full size as you scroll into it
      if (filmBox && !reduce) filmBox.style.setProperty("--fs", (0.94 + 0.06 * Math.min(1, scrollY / (innerHeight * 0.45))).toFixed(4));
      dayUpdate();
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  /* ---------------------------------------------------------------- reveals */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    $$(".reveal, .rv").forEach(function (el) { io.observe(el); });
    $$(".proof li, .ways .h2, .prices .sec-h, .fix, .special, .know-in > div, .qa, .book-h").forEach(function (el, k) {
      el.classList.add("rv"); el.style.transitionDelay = (el.classList.contains("fix") || el.tagName === "LI" ? (k % 4) * 90 : 0) + "ms"; io.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------------------------------------------------------------- the day: scroll drives the clock and the light */
  var day = $(".day"), clock = $(".clock"), stageEls = $$(".stages li"), railEls = $$(".rail li"), visEls = $$(".vis"), sky = $(".sky"), rail = $(".rail"), lastStage = -1;
  var DAWN = [28, 40, 64], NOON = [38, 33, 34], DUSK = [118, 50, 24];
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function rgb(c) { return "rgb(" + c.join(",") + ")"; }
  function dayUpdate() {
    if (!day) return;
    var r = day.getBoundingClientRect(), total = day.offsetHeight - innerHeight;
    if (total <= 0) return;
    var p = Math.min(1, Math.max(0, -r.top / total));
    // each stage owns a quarter of the scroll; the clock runs from its time to the next one (9, 10, 13, 16:30, 17)
    var T = [9, 10, 13, 16.5, 17], q = Math.min(3, Math.floor(p * 4)), lt = Math.min(1, p * 4 - q);
    var mins = (T[q] + (T[q + 1] - T[q]) * lt) * 60, h = Math.floor(mins / 60), m = Math.floor((mins % 60) / 5) * 5;
    clock.textContent = pad(h) + ":" + pad(m);
    var i = Math.min(3, Math.floor(p * 4));
    if (i !== lastStage) {
      lastStage = i;
      stageEls.forEach(function (el, k) { el.classList.toggle("on", k === i); });
      railEls.forEach(function (el, k) { el.classList.toggle("on", k <= i); });
      visEls.forEach(function (el, k) { el.classList.toggle("on", k === i); if (k === i) counters(el); });
    }
    var c1 = p < 0.5 ? mix(DAWN, NOON, p * 2) : mix(NOON, DUSK, (p - 0.5) * 2);
    sky.style.setProperty("--c1", rgb(c1));
    sky.style.setProperty("--c2", rgb(mix([35, 31, 32], [22, 19, 20], p)));
    sky.style.setProperty("--sx", (6 + p * 86) + "%");
    sky.style.setProperty("--sy", (24 - Math.sin(p * Math.PI) * 16) + "%");
    sky.style.setProperty("--glow", (0.18 + p * 0.4).toFixed(2));
    if (rail) rail.style.setProperty("--p", Math.min(1, p * 4 / 3 - 0.0).toFixed(3));
  }

  /* ---------------------------------------------------------------- before and after */
  $$(".ba").forEach(function (box) {
    var rng = $(".rng", box);
    function set(v) { box.style.setProperty("--pos", v); }
    rng.addEventListener("input", function () { set(rng.value); });
    if (!reduce && "IntersectionObserver" in window) {
      var o = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; o.disconnect();
        var t0 = null, path = [50, 30, 72, 50];
        function step(ts) {
          if (t0 === null) t0 = ts;
          var t = Math.min(1, (ts - t0) / 1800), seg = Math.min(2, Math.floor(t * 3)), lt = t * 3 - seg, e = 1 - Math.pow(1 - lt, 3);
          var v = path[seg] + (path[seg + 1] - path[seg]) * e; set(v); rng.value = v;
          if (t < 1) requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 500);
      }, { threshold: 0.6 });
      o.observe(box);
    }
  });

  /* ---------------------------------------------------------------- counters inside the flat scenes ("40 options") */
  function counters(root) {
    $$("[data-count]", root).forEach(function (el) {
      var to = +el.dataset.count, at = +(el.dataset.at || 0) * 1000, dur = +(el.dataset.dur || 1) * 1000;
      if (reduce) { el.textContent = to; return; }
      el.textContent = "0"; var t0 = performance.now() + at;
      (function run(now) {
        var k = Math.max(0, Math.min(1, (now - t0) / dur)); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && root.classList.contains("on")) requestAnimationFrame(run); else el.textContent = to;
      })(performance.now());
    });
  }

  /* ---------------------------------------------------------------- the film: plays muted when seen, sound on a tap */
  var film = $(".fv"), snd = $(".snd"), fbar = $(".fbar"), mus = $(".mus");
  function soundOn(on) {
    if (!film) return;
    film.muted = !on; snd.setAttribute("aria-pressed", String(on));
    $("span", snd).textContent = on ? snd.dataset.on : snd.dataset.off;
    if (on) { musicOn(false); film.play().catch(function () {}); }
  }
  if (film) {
    if (film.canPlayType && film.canPlayType("video/mp4")) {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !reduce) film.play().catch(function () {});
            else if (!e.isIntersecting) { film.pause(); if (!film.muted) soundOn(false); }
          });
        }, { threshold: 0.35 }).observe(film);
      }
    }
    film.addEventListener("timeupdate", function () { if (film.duration) fbar.style.setProperty("--fp", (film.currentTime / film.duration).toFixed(4)); });
    snd.addEventListener("click", function () { soundOn(film.muted); track("film_sound", { on: !film.muted }); });
    $$("[data-film]").forEach(function (b) {
      b.addEventListener("click", function () {
        filmBox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        film.currentTime = 0; soundOn(true); track("film_play");
      });
    });
  }

  /* ---------------------------------------------------------------- site music: a gapless loop through Web Audio.
     Off until the visitor turns it on: browsers block sound before a tap, and a site that shouts is a site people close. */
  var actx = null, mbuf = null, msrc = null, mgain = null, mload = false;
  function mStop() {
    if (!msrc) return;
    var g = mgain, s = msrc, now = actx.currentTime;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.4);
    s.stop(now + 0.45); msrc = null;
  }
  function mStart() {
    mStop();
    mgain = actx.createGain(); mgain.gain.setValueAtTime(0, actx.currentTime); mgain.gain.linearRampToValueAtTime(0.35, actx.currentTime + 1.2);
    msrc = actx.createBufferSource(); msrc.buffer = mbuf; msrc.loop = true; msrc.loopStart = 0; msrc.loopEnd = Math.min(mbuf.duration, 20);
    msrc.connect(mgain); mgain.connect(actx.destination); msrc.start();
  }
  function musicOn(on) {
    if (!mus) return;
    mus.setAttribute("aria-pressed", String(on));
    var lab = on ? S.music_off : S.music_on; mus.setAttribute("aria-label", lab); mus.title = lab;
    if (!on) { mStop(); return; }
    if (film && !film.muted) { film.muted = true; snd.setAttribute("aria-pressed", "false"); $("span", snd).textContent = snd.dataset.off; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    actx = actx || new AC(); if (actx.resume) actx.resume();
    if (mbuf) { mStart(); return; }
    if (mload) return; mload = true;
    fetch(mus.dataset.src).then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, bad) { actx.decodeAudioData(b, ok, bad); }); })
      .then(function (buf) { mbuf = buf; mload = false; if (mus.getAttribute("aria-pressed") === "true") mStart(); })
      .catch(function () { mload = false; mus.setAttribute("aria-pressed", "false"); });
  }
  if (mus) mus.addEventListener("click", function () { var on = mus.getAttribute("aria-pressed") !== "true"; musicOn(on); track("music", { on: on }); });



  /* ---------------------------------------------------------------- privacy notice */
  var priv = $(".priv");
  $$("[data-privacy]").forEach(function (b) { b.addEventListener("click", function () { if (priv.showModal) priv.showModal(); }); });
  $$("[data-close]").forEach(function (b) { b.addEventListener("click", function () { b.closest("dialog").close(); }); });
  $$("dialog").forEach(function (d) { d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); });

  /* ---------------------------------------------------------------- booking */
  var bk = $("#bk"), form = $(".bk-f", bk), slot = $("#slot"), dlg = $(".bkd"), dslot = $(".dslot"), done = $(".done", bk);
  var errEl = $(".err", bk), runEl = $(".run b", bk), step = 0;
  function toLatin(s) { return String(s || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }); }
  function phoneNorm(v) {
    var d = toLatin(v).replace(/[^\d+]/g, "");
    d = d.replace(/^\+/, "").replace(/^00/, "");
    if (/^9665\d{8}$/.test(d)) return "+" + d;
    if (/^05\d{8}$/.test(d)) return "+966" + d.slice(1);
    if (/^5\d{8}$/.test(d)) return "+966" + d;
    return "";
  }

  // the next ten working days (Sunday to Thursday), from tomorrow
  var daysBox = $(".days", bk);
  var dfW = new Intl.DateTimeFormat(AR ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { weekday: "short" });
  var dfM = new Intl.DateTimeFormat(AR ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { month: "short" });
  var dfL = new Intl.DateTimeFormat(AR ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  var dd = new Date(); dd.setHours(12, 0, 0, 0);
  var dayLabels = {};
  for (var made = 0; made < 10;) {
    dd.setDate(dd.getDate() + 1);
    if (dd.getDay() === 5 || dd.getDay() === 6) continue;
    var iso = dd.getFullYear() + "-" + pad(dd.getMonth() + 1) + "-" + pad(dd.getDate());
    dayLabels[iso] = dfL.format(dd);
    var lab = document.createElement("label");
    lab.innerHTML = '<input type="radio" name="day" value="' + iso + '"><span><small>' + dfW.format(dd) + '</small><b>' + dd.getDate() + '</b><small>' + dfM.format(dd) + "</small></span>";
    daysBox.appendChild(lab); made++;
  }

  function chosen() { return $$('input[name="fix"]:checked', form).map(function (i) { return i.value; }); }
  function isMeet() { return chosen().indexOf("meeting") > -1; }
  function total() { return chosen().reduce(function (s, k) { return s + (PRICES[k] || 0); }, 0); }
  function val(n) { var el = form.elements[n]; if (!el) return ""; if (el.length !== undefined && !el.tagName) { var c = [].slice.call(el).filter(function (x) { return x.checked; })[0]; return c ? c.value : ""; } return (el.value || "").trim(); }

  function refresh() {
    bk.classList.toggle("meet", isMeet());
    $$(".opt", form).forEach(function (o) { o.classList.toggle("off", isMeet() && o.dataset.k !== "meeting"); });
    runEl.textContent = fmt(total());
    $(".dist", form).style.display = val("place") === "online" ? "none" : "";
    saveDraft();
  }
  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "fix") {
      if (t.value === "meeting" && t.checked) $$('input[name="fix"]', form).forEach(function (i) { if (i.value !== "meeting") i.checked = false; });
      if (t.value !== "meeting" && t.checked) form.querySelector('input[value="meeting"]').checked = false;
    }
    if (t.getAttribute("aria-invalid")) t.removeAttribute("aria-invalid");
    errEl.textContent = "";
    refresh();
  });
  form.addEventListener("input", saveDraft);

  function saveDraft() {
    var d = {};
    [].slice.call(form.elements).forEach(function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { if (el.name === "fix") { d.fix = d.fix || []; if (el.checked) d.fix.push(el.value); } else d[el.name] = el.checked; }
      else if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
      else d[el.name] = el.value;
    });
    sset("at-draft", d);
  }
  function loadDraft() {
    var d = sget("at-draft"); if (!d) return;
    [].slice.call(form.elements).forEach(function (el) {
      if (!el.name || d[el.name] === undefined && el.name !== "fix") return;
      if (el.type === "checkbox") el.checked = el.name === "fix" ? (d.fix || []).indexOf(el.value) > -1 : !!d[el.name];
      else if (el.type === "radio") el.checked = d[el.name] === el.value;
      else el.value = d[el.name];
    });
  }

  function fail(msg, field) {
    errEl.textContent = msg;
    if (field) { var el = form.elements[field]; if (el && el.focus) { el.setAttribute("aria-invalid", "true"); el.focus(); } }
    return false;
  }
  function check(s) {
    errEl.textContent = "";
    if (s === 0 && !chosen().length) return fail(S.err_fix);
    if (s === 1) {
      if (val("place") !== "online" && !val("district")) return fail(S.err_dist, "district");
      if (!val("day")) return fail(S.err_day);
      if (isMeet() && !val("time")) return fail(S.err_time);
    }
    if (s === 2) {
      if (!val("name")) return fail(S.err_name, "name");
      if (!val("company")) return fail(S.err_company, "company");
      if (!phoneNorm(val("phone"))) return fail(S.err_phone, "phone");
      if (val("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) return fail(S.err_email, "email");
      if (!form.elements.consent.checked) return fail(S.err_consent, "consent");
    }
    return true;
  }

  function placeText() { return val("place") === "online" ? S.online : (val("district") ? val("district") + (AR ? "، " : ", ") : "") + S.riyadh; }
  function lines() {
    var out = [];
    chosen().forEach(function (k) { out.push([S["fix_" + k], PRICES[k] ? fmt(PRICES[k]) + " " + S.sar : S.priced_later]); });
    var when = (dayLabels[val("day")] || val("day")) + " · " + (isMeet() ? val("time") : S.start9);
    out.push([placeText(), when]);
    out.push([S.your_door, val("name") + " · " + val("company")]);
    return out;
  }
  function renderSummary() {
    var ol = $(".sum", bk); ol.innerHTML = "";
    lines().forEach(function (l, k, arr) {
      var li = document.createElement("li"); if (k === arr.length - 1) li.className = "door";
      var a = document.createElement("span"); a.textContent = l[0];
      var b = document.createElement("b"); b.textContent = l[1];
      li.appendChild(a); li.appendChild(b); ol.appendChild(li);
    });
    $(".tot b", bk).textContent = isMeet() ? S.priced_later : fmt(total()) + " " + S.sar;
    $(".tot", bk).style.display = isMeet() ? "none" : "";
  }

  function go(n, quiet) {
    step = n; bk.dataset.s = n;
    $$(".step", form).forEach(function (f) { f.classList.toggle("on", +f.dataset.s === n); });
    $(".route-p", bk).style.setProperty("--sp", n);
    $$(".route-p .st", bk).forEach(function (s) { s.classList.toggle("on", +s.dataset.s <= n); });
    if (n === 3) renderSummary();
    if (quiet) return;
    var lg = $('.step[data-s="' + n + '"] legend', form); if (lg) lg.focus({ preventScroll: true });
    track("book_step", { step: n + 1 });
  }
  $(".next", bk).addEventListener("click", function () { if (check(step)) go(step + 1); });
  $(".back", bk).addEventListener("click", function () { errEl.textContent = ""; go(Math.max(0, step - 1)); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && step < 3) { e.preventDefault(); if (check(step)) go(step + 1); }
  });

  function lead() {
    return {
      id: Date.now().toString(36), created: new Date().toISOString(), lang: S.lang,
      fixes: chosen(), meeting: isMeet(), total_sar: total(),
      place: val("place"), district: val("district"), day: val("day"), time: isMeet() ? val("time") : "09:00",
      name: val("name"), company: val("company"), phone: phoneNorm(val("phone")), email: val("email"), link: val("link"), notes: val("notes"),
      source: src, page: location.href
    };
  }
  function waText() {
    var t = S.wa_intro + "\n";
    lines().slice(0, -1).forEach(function (l) { t += "• " + l[0] + ": " + l[1] + "\n"; });
    if (!isMeet()) t += S.wa_total + ": " + fmt(total()) + " " + S.sar + "\n";
    t += S.wa_name + ": " + val("name") + "\n" + S.wa_company + ": " + val("company") + "\n" + S.wa_phone + ": " + phoneNorm(val("phone"));
    if (val("notes")) t += "\n" + S.wa_notes + ": " + val("notes");
    return t;
  }
  function send(data) {
    if (!CONFIG.endpoint) return Promise.resolve("preview");
    var fs = /formspree\.io/.test(CONFIG.endpoint);
    return fetch(CONFIG.endpoint, fs
      ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }
      : { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }
    ).then(function (r) { if (fs && !r.ok) throw new Error("send failed"); return "sent"; });
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (step !== 3) { if (check(step)) go(step + 1); return; }
    if (!check(2)) { go(2); check(2); return; }
    var data = lead();
    bk.classList.add("sending");
    send(data).then(function (how) {
      bk.classList.remove("sending");
      track("lead", { value: data.total_sar, fixes: data.fixes.join(","), meeting: data.meeting });
      var wa = $(".wa", bk);
      if (CONFIG.whatsapp) { wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waText()); wa.hidden = false; } else wa.hidden = true;
      $(".dev", bk).hidden = how !== "preview";
      form.hidden = true; $(".route-p", bk).style.setProperty("--sp", 3);
      $$(".route-p .st", bk).forEach(function (s) { s.classList.add("on"); });
      done.hidden = false; done.focus();
      sdel("at-draft");
    }).catch(function () {
      bk.classList.remove("sending");
      errEl.textContent = S.err_send;
      if (CONFIG.whatsapp) { var wa = $(".wa", bk); wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(waText()); }
    });
  });
  $(".again", bk).addEventListener("click", function () {
    form.reset(); form.hidden = false; done.hidden = true; refresh(); go(0);
  });

  // open the booking as a sheet (no jump), and put it back in its place on close
  function openBook(fix) {
    if (fix && fix !== "all") {
      var box = form.querySelector('input[name="fix"][value="' + fix + '"]');
      if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event("change", { bubbles: true })); }
    }
    if (!dlg.showModal) { slot.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    dslot.appendChild(bk); dlg.showModal();
    if (fix && step === 0 && chosen().length) go(1); else go(step);
    track("book_open", { fix: fix || "" });
  }
  dlg.addEventListener("close", function () { slot.appendChild(bk); });
  $$("[data-book]").forEach(function (b) { b.addEventListener("click", function () { openBook(b.dataset.fix); }); });

  loadDraft();
  var pre = qs.get("fix");
  if (pre && (PRICES[pre] || pre === "meeting")) {
    var c = $('.fix[data-fix="' + pre + '"]'); if (c) c.classList.add("pre");
    var box = form.querySelector('input[name="fix"][value="' + pre + '"]'); if (box) box.checked = true;
  }
  refresh(); go(0, true);
  if (qs.get("book") === "1") setTimeout(function () { openBook(pre); }, 600);
  onScroll();
})();
