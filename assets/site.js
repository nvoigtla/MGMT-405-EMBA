/* MGMT 405 course website -- theme and search.
   Loaded synchronously in <head> so the theme is stamped before first paint
   (a deferred script would show a flash of the wrong theme). */

(function () {
  "use strict";

  /* ==================================================================
     THEME: dark after sunset, light after sunrise, in the viewer's own
     time zone. The button cycles Auto -> Light -> Dark -> Auto.
     ================================================================== */

  var KEY = "m405-theme";          /* "auto" | "light" | "dark" */

  function stored() {
    try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; }
  }
  function store(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
  }

  /* --- where is the viewer? -------------------------------------------
     Sunrise/sunset needs a latitude and longitude. Asking for the
     geolocation permission on a course page would be intrusive, so the
     IANA time zone is mapped to the approximate centre of that zone;
     anything unlisted falls back to a longitude derived from the UTC
     offset (15 degrees per hour) at a mid-northern latitude. A few
     degrees of error moves sunrise by minutes, which is immaterial here. */
  var ZONES = {
    "America/Los_Angeles": [34.05, -118.24],
    "America/Vancouver":   [49.28, -123.12],
    "America/Denver":      [39.74, -104.99],
    "America/Phoenix":     [33.45, -112.07],
    "America/Chicago":     [41.88, -87.63],
    "America/Mexico_City": [19.43, -99.13],
    "America/New_York":    [40.71, -74.01],
    "America/Toronto":     [43.65, -79.38],
    "America/Sao_Paulo":   [-23.55, -46.63],
    "America/Bogota":      [4.71, -74.07],
    "America/Argentina/Buenos_Aires": [-34.60, -58.38],
    "Europe/London":       [51.51, -0.13],
    "Europe/Dublin":       [53.35, -6.26],
    "Europe/Lisbon":       [38.72, -9.14],
    "Europe/Madrid":       [40.42, -3.70],
    "Europe/Paris":        [48.86, 2.35],
    "Europe/Brussels":     [50.85, 4.35],
    "Europe/Amsterdam":    [52.37, 4.90],
    "Europe/Berlin":       [52.52, 13.40],
    "Europe/Zurich":       [47.38, 8.54],
    "Europe/Vienna":       [48.21, 16.37],
    "Europe/Rome":         [41.90, 12.50],
    "Europe/Stockholm":    [59.33, 18.07],
    "Europe/Oslo":         [59.91, 10.75],
    "Europe/Copenhagen":   [55.68, 12.57],
    "Europe/Warsaw":       [52.23, 21.01],
    "Europe/Prague":       [50.08, 14.44],
    "Europe/Athens":       [37.98, 23.73],
    "Europe/Istanbul":     [41.01, 28.98],
    "Europe/Moscow":       [55.76, 37.62],
    "Africa/Cairo":        [30.04, 31.24],
    "Africa/Lagos":        [6.52, 3.38],
    "Africa/Johannesburg": [-26.20, 28.05],
    "Asia/Jerusalem":      [31.77, 35.21],
    "Asia/Dubai":          [25.20, 55.27],
    "Asia/Karachi":        [24.86, 67.01],
    "Asia/Kolkata":        [19.08, 72.88],
    "Asia/Calcutta":       [19.08, 72.88],
    "Asia/Bangkok":        [13.76, 100.50],
    "Asia/Singapore":      [1.35, 103.82],
    "Asia/Jakarta":        [-6.21, 106.85],
    "Asia/Hong_Kong":      [22.32, 114.17],
    "Asia/Shanghai":       [31.23, 121.47],
    "Asia/Seoul":          [37.57, 126.98],
    "Asia/Tokyo":          [35.68, 139.69],
    "Australia/Perth":     [-31.95, 115.86],
    "Australia/Sydney":    [-33.87, 151.21],
    "Australia/Melbourne": [-37.81, 144.96],
    "Pacific/Auckland":    [-36.85, 174.76],
    "Pacific/Honolulu":    [21.31, -157.86]
  };

  function where() {
    var tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { }
    if (tz && ZONES[tz]) { return ZONES[tz]; }
    /* getTimezoneOffset() is minutes to ADD to local time to reach UTC,
       so it is positive west of Greenwich -- hence the leading minus. */
    var lon = -new Date().getTimezoneOffset() / 4;
    if (!isFinite(lon) || Math.abs(lon) > 180) { lon = -118.24; }
    return [34.05, lon];
  }

  /* --- sunrise / sunset (the standard SunCalc formulation) ------------- */
  var RAD = Math.PI / 180, J1970 = 2440588, J2000 = 2451545, DAY = 86400000;
  var OBLIQ = RAD * 23.4397;

  function toDays(d) { return d.valueOf() / DAY - 0.5 + J1970 - J2000; }
  function fromJulian(j) { return new Date((j + 0.5 - J1970) * DAY); }
  function meanAnomaly(d) { return RAD * (357.5291 + 0.98560028 * d); }
  function eclipticLon(M) {
    var C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) +
                   0.0003 * Math.sin(3 * M));
    return M + C + RAD * 102.9372 + Math.PI;
  }

  function sunTimes(date, lat, lon) {
    var lw = RAD * -lon, phi = RAD * lat, d = toDays(date);
    var n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    var ds = 0.0009 + lw / (2 * Math.PI) + n;
    var M = meanAnomaly(ds), L = eclipticLon(M);
    var dec = Math.asin(Math.sin(OBLIQ) * Math.sin(L));
    var transit = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    var h = RAD * -0.833;                        /* refraction + solar radius */
    var cosW = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) /
               (Math.cos(phi) * Math.cos(dec));
    if (cosW > 1 || cosW < -1) { return null; }  /* polar day or night */
    var w = Math.acos(cosW);
    var ds2 = 0.0009 + (w + lw) / (2 * Math.PI) + n;
    var M2 = meanAnomaly(ds2), L2 = eclipticLon(M2);
    var jset = J2000 + ds2 + 0.0053 * Math.sin(M2) - 0.0069 * Math.sin(2 * L2);
    return { sunrise: fromJulian(transit - (jset - transit)),
             sunset: fromJulian(jset) };
  }

  /** Is it night where the viewer is, right now? */
  function isNight(now) {
    now = now || new Date();
    var p = where();
    var t = sunTimes(now, p[0], p[1]);
    if (!t) {                                    /* polar, or maths failed */
      var hr = now.getHours();
      return hr < 7 || hr >= 19;
    }
    return now < t.sunrise || now > t.sunset;
  }

  function resolve(mode) {
    if (mode === "light" || mode === "dark") { return mode; }
    return isNight() ? "dark" : "light";
  }

  function apply(mode) {
    document.documentElement.setAttribute("data-theme", resolve(mode));
  }

  /* stamp before first paint */
  var mode = stored();
  apply(mode);

  /* while on auto, re-check every 10 minutes so the page turns itself
     over at sunset without a reload */
  setInterval(function () {
    if (stored() === "auto") { apply("auto"); syncBtn(); }
  }, 600000);

  var btn = null;
  /* The button names the theme you are LOOKING AT; hovering says what a
     click would switch to. Until it is clicked the theme follows sunrise
     and sunset, so the label simply reports whichever that resolved to. */
  function syncBtn() {
    if (!btn) { return; }
    var now = resolve(stored());
    btn.textContent = now === "dark" ? "Dark" : "Light";
    btn.setAttribute("title", now === "dark" ? "Switch to Light"
                                             : "Switch to Dark");
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

    var sel = -1, shown = [];

    function close() { out.hidden = true; sel = -1; shown = []; }

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
      shown = hits.slice(0, 12);
      if (!shown.length) {
        out.innerHTML = '<div class="none">No page matches “' +
          q.replace(/[<&>]/g, "") + "”.</div>";
      } else {
        out.innerHTML = shown.map(function (p, i) {
          return '<a href="' + p.href + '"' + (i === 0 ? ' class="sel"' : "") +
            '><span class="k">' + p.kind + '</span>' + p.title +
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
        box.focus();
      }
    });
  }

  /* ==================================================================
     Week / module list toggle in the left column
     ================================================================== */

  function initToggle() {
    var bw = document.getElementById("t-weeks");
    var bm = document.getElementById("t-mods");
    var lw = document.getElementById("nav-weeks");
    var lm = document.getElementById("nav-mods");
    if (!bw || !bm || !lw || !lm) { return; }

    function show(which) {
      var weeks = which === "weeks";
      lw.hidden = !weeks;
      lm.hidden = weeks;
      bw.setAttribute("aria-pressed", String(weeks));
      bm.setAttribute("aria-pressed", String(!weeks));
      try { localStorage.setItem("m405-nav", which); } catch (e) { }
    }

    bw.addEventListener("click", function () { show("weeks"); });
    bm.addEventListener("click", function () { show("mods"); });

    /* A week page opens on the week list and a module page on the module
       list; on General Logistics, whichever the viewer last used. */
    var page = document.body.getAttribute("data-navkind");
    if (page === "weeks" || page === "mods") {
      show(page);
    } else {
      var last = "weeks";
      try { last = localStorage.getItem("m405-nav") || "weeks"; } catch (e) { }
      show(last === "mods" ? "mods" : "weeks");
    }
  }

  /* ------------------------------ wire up ------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    btn = document.getElementById("theme");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = resolve(stored()) === "dark" ? "light" : "dark";
        store(next);
        apply(next);
        syncBtn();
      });
      syncBtn();
    }
    initSearch();
    initToggle();
  });
}());
