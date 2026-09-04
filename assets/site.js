/* MGMT 405 course website -- search, the week/module view mode, and the
   "due within three days" flag.

   The site is light-mode only (2026-09-03), so there is no theme code here;
   the palette is stamped on <html> by the generator. */

(function () {
  "use strict";

  /* ==================================================================
     VIEW MODE -- "weeks" or "mods".

     One piece of state drives three controls: the "View by" button in the
     top bar, the By Week / By Module toggle in the left menu, and which
     entries the hamburger jump menu offers. The default is weeks; a module
     page opens in module view, because that is what the reader is looking
     at; otherwise the last choice in this browser is remembered.
     ================================================================== */

  var KEY = "m405-nav";
  var mode = "weeks";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
  }

  function initialMode() {
    var page = document.body.getAttribute("data-navkind");
    if (page === "weeks" || page === "mods") { return page; }
    var last = stored();
    return last === "mods" ? "mods" : "weeks";
  }

  /* ---- the three things that follow the mode ---- */

  var jumpOptions = null;          /* snapshot of every <option>, see below */

  function paintJump() {
    var sel = document.getElementById("jump");
    if (!sel || !jumpOptions) { return; }
    var html = "";
    jumpOptions.forEach(function (o) {
      /* "general" and "extra" show in both modes; "extra" is emitted
         last, so All Videos / All Podcasts close the list */
      if (o.group !== "general" && o.group !== "extra" &&
          o.group !== mode) { return; }
      html += '<option value="' + o.value + '"' +
        (o.selected ? " selected" : "") + ">" + o.text + "</option>";
    });
    sel.innerHTML = html;
  }

  function paintToggle() {
    var bw = document.getElementById("t-weeks");
    var bm = document.getElementById("t-mods");
    var lw = document.getElementById("nav-weeks");
    var lm = document.getElementById("nav-mods");
    if (bw) { bw.setAttribute("aria-pressed", String(mode === "weeks")); }
    if (bm) { bm.setAttribute("aria-pressed", String(mode === "mods")); }
    if (lw) { lw.hidden = mode !== "weeks"; }
    if (lm) { lm.hidden = mode !== "mods"; }
  }

  function paintViewBtn() {
    var btn = document.getElementById("viewmode");
    var label = document.getElementById("viewmode-label");
    var tip = document.getElementById("viewmode-tip");
    if (label) { label.textContent = mode === "mods" ? "Module" : "Week"; }
    if (tip) {
      tip.textContent = mode === "mods"
        ? "Switch to view by Week"
        : "Switch to view by Module";
    }
    if (btn) {
      btn.setAttribute("aria-label", mode === "mods"
        ? "Viewing by module. Switch to viewing by week."
        : "Viewing by week. Switch to viewing by module.");
    }
  }

  function setMode(next, remember) {
    mode = next === "mods" ? "mods" : "weeks";
    if (remember) { store(mode); }
    paintJump();
    paintToggle();
    paintViewBtn();
  }

  /* ==================================================================
     The hamburger jump menu
     ================================================================== */

  function initJump() {
    var sel = document.getElementById("jump");
    if (!sel) { return; }

    /* Snapshot the server-rendered options once, then rebuild the list
       from the snapshot whenever the mode changes. Toggling `hidden` on an
       <option> is not honoured everywhere, so the list is re-emitted. */
    jumpOptions = Array.prototype.map.call(sel.options, function (o) {
      return { value: o.value, text: o.textContent,
               group: o.getAttribute("data-g") || "general",
               selected: o.defaultSelected };
    });

    sel.addEventListener("change", function () {
      if (sel.value) { window.location.href = sel.value; }
    });
  }

  /* ==================================================================
     Deadlines: flag anything due within the next three days
     ================================================================== */

  function initDue() {
    var rows = document.querySelectorAll(".dl li[data-date]");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    Array.prototype.forEach.call(rows, function (li) {
      var iso = li.getAttribute("data-date");
      if (!iso) { return; }              /* undated, e.g. the practice final */
      var p = iso.split("-");
      var due = new Date(+p[0], +p[1] - 1, +p[2]);
      var days = Math.round((due - today) / 86400000);
      if (days >= 0 && days <= 3) { li.classList.add("soon"); }
    });
  }

  /* ==================================================================
     Deadlines: show only one week's rows

     On a phone the deadlines column sits below the content, and the week
     header links down to it. Clicking that link narrows the list to that
     week alone (2026-09-03, Nico); the "Show all deadlines" button puts
     the rest back.
     ================================================================== */

  function initDueFilter() {
    var card = document.getElementById("deadlines");
    var all = document.getElementById("dl-all");
    var link = document.querySelector(".dl-jump a");
    if (!card) { return; }
    var rows = card.querySelectorAll(".dl li");

    function only(week) {
      Array.prototype.forEach.call(rows, function (li) {
        li.hidden = week !== null && li.getAttribute("data-week") !== week;
      });
      if (all) { all.classList.toggle("on", week !== null); }
    }

    if (link) {
      /* no preventDefault: the browser still jumps to the anchor, which is
         this week's own row and therefore still visible after filtering */
      link.addEventListener("click", function () {
        only(link.getAttribute("data-week"));
      });
    }
    if (all) {
      all.addEventListener("click", function () { only(null); });
    }
  }

  /* ==================================================================
     Email links, assembled at load

     The HTML carries no address and no "@" -- each link holds the local
     part and the domain base64-encoded in data attributes, so an address
     harvester scanning the page finds nothing to take (2026-09-04, Nico).
     ================================================================== */

  function initMail() {
    var links = document.querySelectorAll("a.mail[data-u][data-d]");
    Array.prototype.forEach.call(links, function (a) {
      try {
        var user = atob(a.getAttribute("data-u"));
        var dom = atob(a.getAttribute("data-d"));
        a.setAttribute("href", "mailto:" + user + "@" + dom);
        a.setAttribute("title", user + "@" + dom);
      } catch (e) { /* leave it as inert text */ }
    });
  }

  /* ==================================================================
     The help popover in the top bar
     ================================================================== */

  function initHelp() {
    var btn = document.getElementById("helpbtn");
    var pop = document.getElementById("helppop");
    if (!btn || !pop) { return; }

    function set(open) {
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      set(pop.hidden);
    });
    document.addEventListener("click", function (e) {
      if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) {
        set(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { set(false); }
    });
  }

  /* ==================================================================
     SEARCH over every week and module page
     ================================================================== */

  function norm(s) {
    return (s || "").toLowerCase().replace(/[–—]/g, "-");
  }

  function initSearch() {
    var box = document.getElementById("q");
    var out = document.getElementById("results");
    var index = window.SEARCH_INDEX || [];
    if (!box || !out) { return; }

    var sel = -1;

    function close() { out.hidden = true; sel = -1; }

    /* A bare number has to match as a whole number: the token "6" must not
       match "26", "16 min" or "Ch. 6.1", or "module 6" hits every page. */
    function tester(tok) {
      if (/^[0-9]+$/.test(tok)) {
        var re = new RegExp("(^|[^0-9])" + tok + "([^0-9.]|$)");
        return function (hay) { return re.test(hay); };
      }
      return function (hay) { return hay.indexOf(tok) !== -1; };
    }

    function render(q) {
      var toks = norm(q).trim().split(/\s+/).filter(Boolean);
      if (!toks.length) { close(); return; }
      var tests = toks.map(tester);
      var hits = index.filter(function (p) {
        return tests.every(function (t) { return t(p.hay); });
      });
      /* a page whose own name matches comes before one that merely
         mentions the words somewhere in its content */
      var phrase = norm(q).trim();
      hits.forEach(function (p) {
        p._rank = p.head.indexOf(phrase) !== -1 ? -1
                : (tests.every(function (t) { return t(p.head); }) ? 0 : 1);
      });
      hits.sort(function (a, b) { return a._rank - b._rank; });
      var shown = hits.slice(0, 12);

      if (!shown.length) {
        out.innerHTML = '<div class="none">No page matches “' +
          q.replace(/[<&>]/g, "") + "”.</div>";
      } else {
        out.innerHTML = shown.map(function (p, i) {
          return '<a href="' + p.href + '"' + (i === 0 ? ' class="sel"' : "") +
            '><span class="k">' + p.kind + "</span>" + p.title +
            (p.sub ? '<span class="s">' + p.sub + "</span>" : "") + "</a>";
        }).join("");
        sel = 0;
      }
      out.hidden = false;
    }

    function move(step) {
      var links = out.querySelectorAll("a");
      if (!links.length) { return; }
      if (sel >= 0 && links[sel]) { links[sel].classList.remove("sel"); }
      sel = (sel + step + links.length) % links.length;
      links[sel].classList.add("sel");
      links[sel].scrollIntoView({ block: "nearest" });
    }

    var t = null;
    box.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { render(box.value); }, 100);
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        var links = out.querySelectorAll("a");
        if (!out.hidden && links.length && links[sel < 0 ? 0 : sel]) {
          e.preventDefault();
          window.location.href = links[sel < 0 ? 0 : sel].getAttribute("href");
        }
      } else if (e.key === "Escape") { close(); box.blur(); }
    });
    document.addEventListener("click", function (e) {
      if (!out.hidden && !out.contains(e.target) && e.target !== box) { close(); }
    });

    /* "/" focuses the search box, the way a documentation site does */
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && e.target.tagName !== "INPUT" &&
          !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        /* the search box lives in the sidebar, which may be minimized */
        if (sidebarBtn()) { openSidebar(true); }
        box.focus();
      }
    });
  }

  /* ==================================================================
     The sidebar panel (narrow desktop windows)
     ==================================================================
     Between 861 and 1240px the CSS parks the whole right column -- search
     box and deadlines card -- behind a bottom-right button rather than
     letting it eat half the content column's height. The button is
     display:none outside that band, so its computed display tells us
     whether we are in panel mode without duplicating the breakpoint
     here.
     (2026-09-04, Nico.) */

  function sidebarBtn() {
    var b = document.getElementById("sidebtn");
    /* Test the computed display, NOT offsetParent: the button is
       position:fixed, and offsetParent is null for a fixed element by
       spec -- which made this read "not in panel mode" at every width. */
    if (!b || getComputedStyle(b).display === "none") { return null; }
    return b;
  }

  function openSidebar(open) {
    var b = document.getElementById("sidebtn");
    if (!b) { return; }
    document.body.classList.toggle("sidebar-open", open);
    b.setAttribute("aria-expanded", String(open));
  }

  function initSidebar() {
    var btn = document.getElementById("sidebtn");
    if (!btn) { return; }

    btn.addEventListener("click", function () {
      openSidebar(!document.body.classList.contains("sidebar-open"));
    });

    /* Escape closes it, and so does a click anywhere outside the panel --
       it overlays the content, so it should not sit there once the reader
       has gone back to reading. */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { openSidebar(false); }
    });
    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("sidebar-open")) { return; }
      if (e.target === btn || btn.contains(e.target)) { return; }
      var right = document.querySelector(".right");
      if (right && right.contains(e.target)) { return; }
      openSidebar(false);
    });

    /* Widening the window past the breakpoint hides the button, and the
       sidebar goes back into its own column -- drop the class so it is not
       still "open" when the window narrows again. */
    window.addEventListener("resize", function () {
      if (!sidebarBtn()) { openSidebar(false); }
    });
  }

  /* ------------------------------ wire up ------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initMail();
    initJump();
    initDue();
    initDueFilter();
    initHelp();
    initSearch();
    initSidebar();

    var btn = document.getElementById("viewmode");
    if (btn) {
      btn.addEventListener("click", function () {
        /* The View by button also returns to the main page, so the new view
           is applied somewhere it is actually visible (2026-09-03, Nico). */
        store(mode === "weeks" ? "mods" : "weeks");
        window.location.href = "index.html?stay=1";
      });
    }
    var bw = document.getElementById("t-weeks");
    var bm = document.getElementById("t-mods");
    if (bw) { bw.addEventListener("click", function () { setMode("weeks", true); }); }
    if (bm) { bm.addEventListener("click", function () { setMode("mods", true); }); }

    setMode(initialMode(), false);
  });
}());
