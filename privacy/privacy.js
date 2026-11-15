/* Kukuluku Voice - the privacy page's only script (2026-11-13, variant В+ «Номера»). The text reads without it.
   Nothing is stored in the browser and nothing is sent anywhere. */
(function () {
  "use strict";
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // The line on top: how far the text is read.
  var line = document.querySelector(".sig i");
  function progress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (line) line.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 1) + ")";
  }

  // The sections and every link to them (the contents beside the text and the phone's list).
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-sec]"));
  var links = Array.prototype.slice.call(document.querySelectorAll("a[data-go]"));
  var where = document.querySelector(".cap .where");
  var whereEmpty = where ? where.innerHTML : "";
  var current = null, pinned = null, ticking = false;

  function byId(id) { return document.getElementById(id); }
  // A list taller than the screen scrolls inside itself; its lit line stays in sight (the list only, never the page).
  var tocNav = document.querySelector(".toc nav");
  function keepInView(a) {
    if (!tocNav || !a || tocNav.scrollHeight <= tocNav.clientHeight) return;
    var box = tocNav.getBoundingClientRect(), r = a.getBoundingClientRect(), pad = 24;
    if (r.top < box.top + pad) tocNav.scrollTop -= box.top + pad - r.top;
    else if (r.bottom > box.bottom - pad) tocNav.scrollTop += r.bottom - (box.bottom - pad);
  }
  function light(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) {
      var on = a.getAttribute("data-go") === id;
      a.classList.toggle("now", on);
      if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
    sections.forEach(function (s) { s.classList.toggle("now", s.id === id); });
    keepInView(document.querySelector('.toc nav a[data-go="' + id + '"]'));
    if (!where) return;
    var section = byId(id), number = section && section.querySelector(".sn"), heading = section && section.querySelector("h2");
    if (!number || !heading) { where.innerHTML = whereEmpty; return; }
    where.textContent = "";
    var hidden = document.createElement("span");
    hidden.className = "sr";
    hidden.textContent = where.getAttribute("data-now");
    var n = document.createElement("b");
    n.className = "wn";
    n.textContent = number.textContent;
    where.appendChild(hidden);
    where.appendChild(n);
    where.appendChild(document.createTextNode(" " + heading.textContent));
  }

  // The reading line: 30% down the screen; on the last screen it slides to the bottom, so the short
  // sections at the end each get their turn and the very end lights the last one.
  function reading() {
    var h = window.innerHeight, left = document.documentElement.scrollHeight - h - window.scrollY, at = h * 0.3;
    if (left < h * 0.7) at += h * 0.7 - left;
    var id = sections.length ? sections[0].id : null;
    if (window.scrollY < 8) return id;  // at the very top, the beginning - however tall the screen
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= at) id = s.id; });
    return id;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      progress();
      if (!pinned) light(reading());
    });
  }

  // A section reached from its link: it stays lit until the person scrolls by themselves, its answer
  // opens, the heading takes the focus and a band between its rules fades once, so the eye finds it.
  function land(id, scroll) {
    var section = byId(id);
    if (!section) return;
    var details = section.querySelector("details.qa");
    if (details) details.open = true;
    pinned = id;
    light(id);
    if (scroll) section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    var heading = section.querySelector("h1, h2");
    if (heading) heading.focus({ preventScroll: true });
    if (section.classList.contains("first")) return;
    section.classList.remove("jump");
    void section.offsetWidth;
    section.classList.add("jump");
    window.clearTimeout(section.jumpTimer);
    section.jumpTimer = window.setTimeout(function () { section.classList.remove("jump"); }, 1700);
  }
  function unpin() { if (pinned) { pinned = null; light(reading()); } }

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("data-go");
      if (!byId(id)) return;
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, "", "#" + id);
      closeMenus();
      land(id, true);
    });
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("wheel", unpin, { passive: true });
  window.addEventListener("touchmove", unpin, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (/^(PageUp|PageDown|ArrowUp|ArrowDown|Home|End| )$/.test(e.key) && !(e.target.closest && e.target.closest("summary,input,textarea"))) unpin();
  });
  window.addEventListener("hashchange", function () { var id = location.hash.slice(1); if (byId(id)) land(id, false); });

  // Printed, every answer is open; after printing, as it was.
  var opened = [];
  window.addEventListener("beforeprint", function () {
    opened = [];
    each(document.querySelectorAll("details.qa"), function (d) { if (!d.open) { opened.push(d); d.open = true; } });
  });
  window.addEventListener("afterprint", function () { opened.forEach(function (d) { d.open = false; }); opened = []; });

  // The language list beside the text and the phone's two sheets close as menus do: a click outside, Esc,
  // a link chosen; on the phone one sheet open at a time (the browser does it by «name», this for older ones).
  function menus() { return document.querySelectorAll("details.lang[open], details.capd[open]"); }
  function closeMenus() { each(menus(), function (d) { d.open = false; }); }
  each(document.querySelectorAll("details.capd"), function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      each(document.querySelectorAll("details.capd[open]"), function (o) { if (o !== d) o.open = false; });
      // the list opens where you are: the lit line in sight
      var sheet = d.querySelector(".sheet"), lit = sheet && sheet.querySelector("a.now, a[aria-current]");
      if (lit) sheet.scrollTop = Math.max(0, lit.offsetTop - sheet.clientHeight / 2 + lit.offsetHeight / 2);
    });
  });
  document.addEventListener("click", function (e) {
    each(menus(), function (d) { if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    each(menus(), function (d) { d.open = false; d.querySelector("summary").focus(); });
  });

  // Arrived with «#section»: that section, lit and open.
  var arrived = location.hash.slice(1);
  if (arrived && byId(arrived)) land(arrived, false); else light(reading());
  progress();

  // The root page: «?lang=xx» goes there; otherwise a quiet offer in the person's own language.
  if (document.documentElement.getAttribute("data-root") !== "1") return;
  var codes = Array.prototype.map.call(document.querySelectorAll("[data-offer]"), function (a) { return a.getAttribute("data-l"); });
  var asked = ((location.search.match(/[?&]lang=([a-z]{2}(?:-[a-z]{2})?)/i) || [])[1] || "").toLowerCase();
  if (asked && codes.indexOf(asked) >= 0) { location.replace(asked + "/"); return; }
  // the whole language first («es-AR» -> the Argentine page), then its two letters («es-MX» -> Spanish)
  var wanted = (navigator.languages || [navigator.language || ""]).map(function (l) {
    var whole = String(l).toLowerCase(), two = whole.slice(0, 2);
    return codes.indexOf(whole) >= 0 ? whole : (codes.indexOf(two) >= 0 ? two : "");
  }).filter(Boolean)[0];
  var offer = document.getElementById("offer");
  if (!wanted || !offer) return;
  var link = document.querySelector('[data-l="' + wanted + '"][data-offer]');
  var go = offer.querySelector("a");
  go.href = wanted + "/";
  go.textContent = link.getAttribute("data-offer");
  go.setAttribute("lang", wanted);
  offer.hidden = false;
})();
