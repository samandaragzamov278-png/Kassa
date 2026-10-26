/*
 * SAIF-OPTICS — заставка при каждой загрузке страницы (стиль iOS 26, Liquid Glass).
 *
 * Подключение: первой строкой в <head>, без defer/async, чтобы заставка закрыла страницу до первой отрисовки:
 *   тег script с src="splash/saif-splash.js" (или содержимое файла внутри тега script — так в Кассе).
 *   Закрывающий тег script в этом файле писать нельзя: файл встраивается в страницу целиком.
 *
 * Тема: тёмная, если у <html> есть класс "dark" или атрибут data-theme="dark";
 * светлая при классе "light" / data-theme="light"; иначе — сохранённый в Кассе выбор
 * (localStorage "kassaTheme"), а без него — как в системе (prefers-color-scheme).
 * Переключение темы на сайте или в системе подхватывается сразу, даже во время анимации.
 *
 * Логотип — точный вектор (см. assets/saif-optics-logo.svg).
 * Повторный показ из кода: window.SaifSplash.show()
 */
(function () {
  "use strict";
  if (window.SaifSplash) return;

  var ID = "saif-splash";
  var SP = "cubic-bezier(.32,.72,0,1)";
  var IN = "cubic-bezier(.4,0,1,1)";
  var LETTERS = [
    "M76.6 755Q56.6 755 38.2 749.2Q19.8 743.5 9 734.3L20.1 709.6Q30.5 717.8 45.6 723.1Q60.8 728.5 76.7 728.5Q90.1 728.5 98.4 725.6Q106.7 722.7 110.6 717.6Q114.5 712.5 114.5 706.1Q114.5 698.2 109 693.5Q103.4 688.7 94.4 685.8Q85.4 682.9 74.6 680.5Q63.7 678.1 52.8 674.8Q41.9 671.4 32.9 666.1Q23.9 660.8 18.3 652Q12.8 643.2 12.8 629.4Q12.8 615.3 20.2 603.7Q27.6 592 42.9 585Q58.2 578 81.7 578Q97.2 578 112.3 581.9Q127.5 585.8 138.9 593.2L128.7 618.1Q117.3 611.1 105.1 607.8Q92.9 604.5 81.4 604.5Q68.4 604.5 60.1 607.7Q51.8 610.9 48 616.1Q44.2 621.4 44.2 627.9Q44.2 635.8 49.8 640.5Q55.4 645.2 64.3 648Q73.3 650.8 84.2 653.3Q95.1 655.8 106 659.1Q116.9 662.3 125.9 667.5Q134.9 672.7 140.4 681.5Q146 690.3 146 703.8Q146 717.6 138.4 729.3Q130.9 740.9 115.5 748Q100.1 755 76.6 755Z",
    "M153 752 230.2 581H261.6L339 752H305.6L239.4 597.9H252.1L185.8 752ZM188.7 712.4 197.2 687.5H289.8L298.5 712.4Z",
    "M361 752V581H393V752Z",
    "M439 752V581H564V607.7H470.8V752ZM468.1 686.4V659.8H553.5V686.4Z",
    "M586 697V671H653V697Z",
    "M771.2 755Q751.3 755 734.4 748.4Q717.6 741.7 705.2 729.8Q692.8 717.8 685.9 701.7Q679 685.6 679 666.5Q679 647.4 685.9 631.3Q692.8 615.2 705.2 603.2Q717.6 591.2 734.4 584.6Q751.2 578 771.1 578Q791 578 807.8 584.6Q824.5 591.1 836.9 603.1Q849.2 615 856.1 631.1Q863 647.3 863 666.5Q863 685.7 856.1 701.9Q849.2 718 836.9 729.9Q824.5 741.9 807.8 748.4Q791 755 771.2 755ZM771.1 727.1Q784 727.1 794.9 722.6Q805.8 718.1 813.9 709.9Q822 701.8 826.5 690.7Q831.1 679.7 831.1 666.4Q831.1 653.2 826.6 642.2Q822.1 631.3 814 623.1Q805.9 614.9 795 610.4Q784 605.9 771.1 605.9Q758.2 605.9 747.2 610.4Q736.3 614.9 728.1 623.1Q720 631.3 715.4 642.3Q710.9 653.3 710.9 666.4Q710.9 679.6 715.4 690.6Q719.9 701.7 728.1 709.9Q736.2 718.2 747.2 722.6Q758.2 727.1 771.1 727.1Z",
    "M897 752V581H967.7Q990.5 581 1006.9 588.3Q1023.3 595.6 1032.2 609.3Q1041 622.9 1041 641.9Q1041 660.6 1032.2 674.3Q1023.3 687.9 1006.9 695.2Q990.5 702.5 967.7 702.5H914.7L928.9 687.9V752ZM928.9 691.2 914.7 675.7H966.3Q987.4 675.7 998.1 666.8Q1008.8 658 1008.8 641.9Q1008.8 625.6 998.1 616.7Q987.4 607.8 966.3 607.8H914.7L928.9 592.3Z",
    "M1102.7 752V607.8H1046V581H1191V607.8H1134.3V752Z",
    "M1215 752V581H1247V752Z",
    "M1372.9 755Q1353.1 755 1336.3 748.5Q1319.5 742 1307.2 730Q1294.8 718.1 1287.9 701.9Q1281 685.8 1281 666.5Q1281 647.2 1287.9 631.1Q1294.8 614.9 1307.3 603Q1319.7 591 1336.5 584.5Q1353.3 578 1373.1 578Q1394.1 578 1411.6 585.2Q1429.1 592.5 1441 606.6L1420.5 626.3Q1411.1 616.1 1399.6 611Q1388 605.9 1374.6 605.9Q1361.2 605.9 1350 610.4Q1338.8 614.8 1330.5 622.9Q1322.2 631 1317.7 642.1Q1313.1 653.2 1313.1 666.5Q1313.1 679.8 1317.7 690.9Q1322.2 702 1330.5 710.1Q1338.8 718.2 1350 722.6Q1361.2 727.1 1374.6 727.1Q1388 727.1 1399.6 722Q1411.1 716.9 1420.5 706.5L1441 726.1Q1429.1 740.3 1411.6 747.6Q1394.1 755 1372.9 755Z",
    "M1524.1 755Q1504.2 755 1486 749.2Q1467.8 743.5 1457 734.3L1468.1 709.6Q1478.3 717.8 1493.4 723.1Q1508.4 728.5 1524.2 728.5Q1537.5 728.5 1545.8 725.6Q1554 722.7 1557.9 717.6Q1561.8 712.5 1561.8 706.1Q1561.8 698.2 1556.2 693.5Q1550.7 688.7 1541.8 685.8Q1532.9 682.9 1522.1 680.5Q1511.3 678.1 1500.4 674.8Q1489.6 671.4 1480.7 666.1Q1471.8 660.8 1466.3 652Q1460.7 643.2 1460.7 629.4Q1460.7 615.3 1468.1 603.7Q1475.5 592 1490.7 585Q1505.9 578 1529.2 578Q1544.5 578 1559.6 581.9Q1574.7 585.8 1585.9 593.2L1575.9 618.1Q1564.5 611.1 1552.4 607.8Q1540.3 604.5 1528.9 604.5Q1516 604.5 1507.7 607.7Q1499.5 610.9 1495.7 616.1Q1492 621.4 1492 627.9Q1492 635.8 1497.5 640.5Q1503 645.2 1511.9 648Q1520.8 650.8 1531.7 653.3Q1542.5 655.8 1553.3 659.1Q1564.1 662.3 1573 667.5Q1581.9 672.7 1587.5 681.5Q1593 690.3 1593 703.8Q1593 717.6 1585.5 729.3Q1578 740.9 1562.7 748Q1547.5 755 1524.1 755Z"
  ];

  var CSS =
    "#saif-splash{--ov:rgba(250,251,253,.80);--hi:rgba(255,255,255,.9);--edge:rgba(255,255,255,.7);--ink:rgba(33,33,33,.725);--blue:rgba(33,177,215,.835);" +
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;" +
    "-webkit-backdrop-filter:blur(36px) saturate(190%);backdrop-filter:blur(36px) saturate(190%)}" +
    "#saif-splash.saif-dark{--ov:rgba(8,10,14,.80);--hi:rgba(255,255,255,.18);--edge:rgba(255,255,255,.14);--ink:rgba(235,235,245,.82);--blue:rgba(64,200,240,.95)}" +
    "#saif-splash .saif-bg{position:absolute;inset:0;background:var(--ov);box-shadow:inset 0 1px 0 var(--hi),inset 0 0 0 1px var(--edge);transition:background-color .5s}" +
    "#saif-splash .saif-bg::after{content:'';position:absolute;inset:0;opacity:.5;background:linear-gradient(160deg,var(--hi) 0%,transparent 28%,transparent 72%,rgba(255,255,255,.06) 100%)}" +
    "#saif-splash svg{position:relative;width:min(80vw,1100px);height:auto;overflow:visible}" +
    "#saif-splash .saif-tf{transform-box:fill-box;transform-origin:center}" +
    "#saif-splash .saif-ink{fill:var(--ink);transition:fill .5s}" +
    "#saif-splash .saif-ring{stroke:var(--blue);transition:stroke .5s}";

  function svgMarkup() {
    var letters = LETTERS.map(function (d) { return '<path class="saif-tf" d="' + d + '"/>'; }).join("");
    return (
      '<svg viewBox="0 0 1602 762" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      "<defs>" +
      '<filter id="saif-glowR" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b"/>' +
      '<feComponentTransfer in="b" result="b2"><feFuncA class="saif-gaR" type="linear" slope=".9"/></feComponentTransfer>' +
      '<feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="saif-glowI" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/>' +
      '<feComponentTransfer in="b" result="b2"><feFuncA class="saif-gaI" type="linear" slope="0"/></feComponentTransfer>' +
      '<feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      "</defs>" +
      '<g class="saif-logo saif-tf">' +
      '<g filter="url(#saif-glowI)" class="saif-ink">' +
      '<path class="saif-al saif-tf" d="M374 45 L243 176 L374 307 A262.7 262.7 0 0 1 374 45 Z"/>' +
      '<path class="saif-ar saif-tf" d="M1227 45 L1358 176 L1227 307 A262.7 262.7 0 0 0 1227 45 Z"/>' +
      "</g>" +
      '<g filter="url(#saif-glowR)" class="saif-ring" fill="none" stroke-width="80.5" stroke-dasharray="907">' +
      '<path class="saif-r1 saif-tf" d="M582.5 47.25a144.25 144.25 0 1 1 0 288.5a144.25 144.25 0 1 1 0-288.5"/>' +
      '<path class="saif-r2 saif-tf" d="M1019.5 47.25a144.25 144.25 0 1 1 0 288.5a144.25 144.25 0 1 1 0-288.5"/>' +
      "</g>" +
      '<g filter="url(#saif-glowI)" class="saif-ink saif-tx">' + letters + "</g>" +
      "</g></svg>"
    );
  }

  function isDark() {
    var h = document.documentElement;
    var t = (h.getAttribute("data-theme") || "").toLowerCase();
    if (h.classList.contains("dark") || t === "dark") return true;
    if (h.classList.contains("light") || t === "light") return false;
    // Касса ставит data-theme только в конце страницы — до этого берём сохранённый выбор.
    var saved = null;
    try { saved = localStorage.getItem("kassaTheme"); } catch (e) {}
    if (saved === "dark" || saved === "light") return saved === "dark";
    return !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  }

  var current = null;

  function show() {
    if (current) current.destroy();
    if (!document.getElementById(ID + "-css")) {
      var st = document.createElement("style");
      st.id = ID + "-css";
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    var root = document.createElement("div");
    root.id = ID;
    root.setAttribute("role", "presentation");
    root.innerHTML = '<div class="saif-bg"></div>' + svgMarkup();
    (document.body || document.documentElement).appendChild(root);

    var q = function (c) { return root.querySelector("." + c); };
    var letters = Array.prototype.slice.call(q("saif-tx").children);
    var anims = [], timers = [], done = false;

    function applyTheme() {
      var dark = isDark();
      root.classList.toggle("saif-dark", dark);
      q("saif-gaR").setAttribute("slope", dark ? "1.5" : ".9");
      q("saif-gaI").setAttribute("slope", dark ? ".5" : "0");
    }
    applyTheme();
    var mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    var mq = window.matchMedia && matchMedia("(prefers-color-scheme: dark)");
    if (mq && mq.addEventListener) mq.addEventListener("change", applyTheme);

    function destroy() {
      if (done) return;
      done = true;
      anims.forEach(function (a) { a.cancel(); });
      timers.forEach(clearTimeout);
      mo.disconnect();
      if (mq && mq.removeEventListener) mq.removeEventListener("change", applyTheme);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (current && current.root === root) current = null;
    }
    current = { root: root, destroy: destroy };

    // Без поддержки анимаций или при «уменьшить движение» — короткое растворение.
    var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root.animate || reduced) {
      root.style.transition = "opacity .4s";
      timers.push(setTimeout(function () { root.style.opacity = "0"; }, 600));
      timers.push(setTimeout(destroy, 1050));
      return;
    }

    function A(el, kf, o) {
      anims.push(el.animate(kf, { duration: o.d, delay: o.t || 0, fill: o.f || "both", easing: o.e || SP }));
    }

    // 1. Появление
    A(q("saif-r1"), [{ strokeDashoffset: 907 }, { strokeDashoffset: 0 }], { d: 700 });
    A(q("saif-r2"), [{ strokeDashoffset: -907 }, { strokeDashoffset: 0 }], { d: 700, t: 90 });
    A(q("saif-al"), [{ transform: "translateX(120px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 600, t: 280 });
    A(q("saif-ar"), [{ transform: "translateX(-120px) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 600, t: 280 });
    letters.forEach(function (l, i) {
      A(l, [{ opacity: 0, transform: "translateY(60px) scale(.9)" }, { opacity: 1, transform: "none" }], { d: 520, t: 460 + i * 40 });
    });
    // 2. Свечение
    A(q("saif-logo"), [{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }], { d: 600, t: 1050, f: "none", e: "ease-in-out" });

    // 3–6. Исчезновение — не раньше конца «свечения» и не раньше полной загрузки страницы
    var started = performance.now(), exiting = false;
    function exit() {
      if (done || exiting) return;
      exiting = true;
      var now = performance.now() - started;
      var t0 = Math.max(0, 1650 - now);
      letters.map(function (l, i) { return [l, Math.abs(i - 5)]; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .forEach(function (p, r) {
          A(p[0], [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-40px) scale(.92)" }], { d: 340, t: t0 + r * 38, f: "forwards", e: IN });
        });
      A(q("saif-al"), [{ transform: "none", opacity: 1 }, { transform: "translateX(-150px) scale(.7)", opacity: 0 }], { d: 380, t: t0 + 500, f: "forwards", e: IN });
      A(q("saif-ar"), [{ transform: "none", opacity: 1 }, { transform: "translateX(150px) scale(.7)", opacity: 0 }], { d: 380, t: t0 + 500, f: "forwards", e: IN });
      ["saif-r1", "saif-r2"].forEach(function (c) {
        A(q(c), [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.08)", opacity: 1, offset: 0.25 }, { transform: "scale(0)", opacity: 0 }],
          { d: 480, t: t0 + 800, f: "forwards", e: "cubic-bezier(.5,0,.75,0)" });
      });
      A(q("saif-bg"), [{ opacity: 1 }, { opacity: 0.45, offset: 0.4 }, { opacity: 0 }], { d: 700, t: t0 + 1150, f: "forwards", e: "cubic-bezier(.25,.1,.25,1)" });
      A(root, [
        { backdropFilter: "blur(36px) saturate(190%)", webkitBackdropFilter: "blur(36px) saturate(190%)" },
        { backdropFilter: "blur(24px) saturate(170%)", webkitBackdropFilter: "blur(24px) saturate(170%)", offset: 0.4 },
        { backdropFilter: "blur(0px) saturate(100%)", webkitBackdropFilter: "blur(0px) saturate(100%)" }
      ], { d: 700, t: t0 + 1150, f: "forwards", e: "cubic-bezier(.25,.1,.25,1)" });
      timers.push(setTimeout(function () { root.style.pointerEvents = "none"; }, t0 + 1300));
      timers.push(setTimeout(destroy, t0 + 1900));
    }
    if (document.readyState === "complete") exit();
    else window.addEventListener("load", exit, { once: true });
    // Страница грузится слишком долго — всё равно убираем заставку через 8 с.
    timers.push(setTimeout(exit, 8000));
  }

  window.SaifSplash = { show: show };

  // Если скрипт подключён в <head> до <body>, ждём появления body, но рисуем сразу.
  if (document.body) show();
  else {
    var wait = new MutationObserver(function () {
      if (document.body) { wait.disconnect(); show(); }
    });
    wait.observe(document.documentElement, { childList: true });
  }
})();
