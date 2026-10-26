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
 * Плавность: каждая часть логотипа — отдельный слой, анимируются только transform и opacity,
 * поэтому анимацию ведёт видеокарта и она не замирает, пока страница грузит и рисует данные.
 * Исчезновение начинается после загрузки страницы, когда браузер освободился.
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
  var VW = 1602, VH = 762;

  // [x0, y0, x1, y1] — рамка части в координатах логотипа 1602×762, d — контур
  var ARROWS = [
    [243, 45, 374, 307, "M374 45 L243 176 L374 307 A262.7 262.7 0 0 1 374 45 Z"],
    [1227, 45, 1358, 307, "M1227 45 L1358 176 L1227 307 A262.7 262.7 0 0 0 1227 45 Z"]
  ];
  var RINGS = [[582.5, 191.5], [1019.5, 191.5]]; // центры; R средней линии 144.25, толщина 80.5
  var LETTERS = [
    [9, 578, 146, 755, "M76.6 755Q56.6 755 38.2 749.2Q19.8 743.5 9 734.3L20.1 709.6Q30.5 717.8 45.6 723.1Q60.8 728.5 76.7 728.5Q90.1 728.5 98.4 725.6Q106.7 722.7 110.6 717.6Q114.5 712.5 114.5 706.1Q114.5 698.2 109 693.5Q103.4 688.7 94.4 685.8Q85.4 682.9 74.6 680.5Q63.7 678.1 52.8 674.8Q41.9 671.4 32.9 666.1Q23.9 660.8 18.3 652Q12.8 643.2 12.8 629.4Q12.8 615.3 20.2 603.7Q27.6 592 42.9 585Q58.2 578 81.7 578Q97.2 578 112.3 581.9Q127.5 585.8 138.9 593.2L128.7 618.1Q117.3 611.1 105.1 607.8Q92.9 604.5 81.4 604.5Q68.4 604.5 60.1 607.7Q51.8 610.9 48 616.1Q44.2 621.4 44.2 627.9Q44.2 635.8 49.8 640.5Q55.4 645.2 64.3 648Q73.3 650.8 84.2 653.3Q95.1 655.8 106 659.1Q116.9 662.3 125.9 667.5Q134.9 672.7 140.4 681.5Q146 690.3 146 703.8Q146 717.6 138.4 729.3Q130.9 740.9 115.5 748Q100.1 755 76.6 755Z"],
    [153, 581, 339, 752, "M153 752 230.2 581H261.6L339 752H305.6L239.4 597.9H252.1L185.8 752ZM188.7 712.4 197.2 687.5H289.8L298.5 712.4Z"],
    [361, 581, 393, 752, "M361 752V581H393V752Z"],
    [439, 581, 564, 752, "M439 752V581H564V607.7H470.8V752ZM468.1 686.4V659.8H553.5V686.4Z"],
    [586, 671, 653, 697, "M586 697V671H653V697Z"],
    [679, 578, 863, 755, "M771.2 755Q751.3 755 734.4 748.4Q717.6 741.7 705.2 729.8Q692.8 717.8 685.9 701.7Q679 685.6 679 666.5Q679 647.4 685.9 631.3Q692.8 615.2 705.2 603.2Q717.6 591.2 734.4 584.6Q751.2 578 771.1 578Q791 578 807.8 584.6Q824.5 591.1 836.9 603.1Q849.2 615 856.1 631.1Q863 647.3 863 666.5Q863 685.7 856.1 701.9Q849.2 718 836.9 729.9Q824.5 741.9 807.8 748.4Q791 755 771.2 755ZM771.1 727.1Q784 727.1 794.9 722.6Q805.8 718.1 813.9 709.9Q822 701.8 826.5 690.7Q831.1 679.7 831.1 666.4Q831.1 653.2 826.6 642.2Q822.1 631.3 814 623.1Q805.9 614.9 795 610.4Q784 605.9 771.1 605.9Q758.2 605.9 747.2 610.4Q736.3 614.9 728.1 623.1Q720 631.3 715.4 642.3Q710.9 653.3 710.9 666.4Q710.9 679.6 715.4 690.6Q719.9 701.7 728.1 709.9Q736.2 718.2 747.2 722.6Q758.2 727.1 771.1 727.1Z"],
    [897, 581, 1041, 752, "M897 752V581H967.7Q990.5 581 1006.9 588.3Q1023.3 595.6 1032.2 609.3Q1041 622.9 1041 641.9Q1041 660.6 1032.2 674.3Q1023.3 687.9 1006.9 695.2Q990.5 702.5 967.7 702.5H914.7L928.9 687.9V752ZM928.9 691.2 914.7 675.7H966.3Q987.4 675.7 998.1 666.8Q1008.8 658 1008.8 641.9Q1008.8 625.6 998.1 616.7Q987.4 607.8 966.3 607.8H914.7L928.9 592.3Z"],
    [1046, 581, 1191, 752, "M1102.7 752V607.8H1046V581H1191V607.8H1134.3V752Z"],
    [1215, 581, 1247, 752, "M1215 752V581H1247V752Z"],
    [1281, 578, 1441, 755, "M1372.9 755Q1353.1 755 1336.3 748.5Q1319.5 742 1307.2 730Q1294.8 718.1 1287.9 701.9Q1281 685.8 1281 666.5Q1281 647.2 1287.9 631.1Q1294.8 614.9 1307.3 603Q1319.7 591 1336.5 584.5Q1353.3 578 1373.1 578Q1394.1 578 1411.6 585.2Q1429.1 592.5 1441 606.6L1420.5 626.3Q1411.1 616.1 1399.6 611Q1388 605.9 1374.6 605.9Q1361.2 605.9 1350 610.4Q1338.8 614.8 1330.5 622.9Q1322.2 631 1317.7 642.1Q1313.1 653.2 1313.1 666.5Q1313.1 679.8 1317.7 690.9Q1322.2 702 1330.5 710.1Q1338.8 718.2 1350 722.6Q1361.2 727.1 1374.6 727.1Q1388 727.1 1399.6 722Q1411.1 716.9 1420.5 706.5L1441 726.1Q1429.1 740.3 1411.6 747.6Q1394.1 755 1372.9 755Z"],
    [1457, 578, 1593, 755, "M1524.1 755Q1504.2 755 1486 749.2Q1467.8 743.5 1457 734.3L1468.1 709.6Q1478.3 717.8 1493.4 723.1Q1508.4 728.5 1524.2 728.5Q1537.5 728.5 1545.8 725.6Q1554 722.7 1557.9 717.6Q1561.8 712.5 1561.8 706.1Q1561.8 698.2 1556.2 693.5Q1550.7 688.7 1541.8 685.8Q1532.9 682.9 1522.1 680.5Q1511.3 678.1 1500.4 674.8Q1489.6 671.4 1480.7 666.1Q1471.8 660.8 1466.3 652Q1460.7 643.2 1460.7 629.4Q1460.7 615.3 1468.1 603.7Q1475.5 592 1490.7 585Q1505.9 578 1529.2 578Q1544.5 578 1559.6 581.9Q1574.7 585.8 1585.9 593.2L1575.9 618.1Q1564.5 611.1 1552.4 607.8Q1540.3 604.5 1528.9 604.5Q1516 604.5 1507.7 607.7Q1499.5 610.9 1495.7 616.1Q1492 621.4 1492 627.9Q1492 635.8 1497.5 640.5Q1503 645.2 1511.9 648Q1520.8 650.8 1531.7 653.3Q1542.5 655.8 1553.3 659.1Q1564.1 662.3 1573 667.5Q1581.9 672.7 1587.5 681.5Q1593 690.3 1593 703.8Q1593 717.6 1585.5 729.3Q1578 740.9 1562.7 748Q1547.5 755 1524.1 755Z"]
  ];

  var CSS =
    "#saif-splash{--ov:rgba(250,251,253,.82);--hi:rgba(255,255,255,.9);--edge:rgba(255,255,255,.7);--ink:rgba(33,33,33,.725);--blue:rgba(33,177,215,.835);" +
    "--glow1:rgba(40,185,225,.55);--glow2:rgba(40,185,225,.28);--iglow:transparent;" +
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;contain:strict;" +
    "-webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);will-change:opacity}" +
    "#saif-splash.saif-dark{--ov:rgba(8,10,14,.84);--hi:rgba(255,255,255,.18);--edge:rgba(255,255,255,.14);--ink:rgba(235,235,245,.82);--blue:rgba(64,200,240,.95);" +
    "--glow1:rgba(64,200,240,.75);--glow2:rgba(64,200,240,.4);--iglow:rgba(235,235,245,.28)}" +
    "#saif-splash .saif-bg{position:absolute;inset:0;background:var(--ov);box-shadow:inset 0 1px 0 var(--hi),inset 0 0 0 1px var(--edge);transition:background-color .5s}" +
    "#saif-splash .saif-bg::after{content:'';position:absolute;inset:0;opacity:.5;background:linear-gradient(160deg,var(--hi) 0%,transparent 28%,transparent 72%,rgba(255,255,255,.06) 100%)}" +
    "#saif-splash .saif-logo{position:relative;width:min(80vw,1100px);aspect-ratio:1602/762;will-change:transform}" +
    "#saif-splash .saif-p{position:absolute;overflow:visible;will-change:transform,opacity}" +
    "#saif-splash .saif-ink path{fill:var(--ink);transition:fill .5s}" +
    "#saif-splash .saif-ink{filter:drop-shadow(0 0 6px var(--iglow))}" +
    "#saif-splash .saif-ring circle{fill:none;stroke:var(--blue);transition:stroke .5s}" +
    "#saif-splash .saif-ring{filter:drop-shadow(0 0 8px var(--glow1)) drop-shadow(0 0 22px var(--glow2))}";

  // Одна часть логотипа — отдельный <svg>, размещённый в процентах от рамки логотипа
  function part(cls, x0, y0, x1, y1, inner) {
    var w = x1 - x0, h = y1 - y0;
    return '<svg class="saif-p ' + cls + '" viewBox="' + x0 + " " + y0 + " " + w + " " + h + '" preserveAspectRatio="none" style="left:' +
      (x0 / VW * 100) + "%;top:" + (y0 / VH * 100) + "%;width:" + (w / VW * 100) + "%;height:" + (h / VH * 100) + '%" aria-hidden="true">' + inner + "</svg>";
  }

  function logoMarkup() {
    var s = "";
    ARROWS.forEach(function (a, i) { s += part("saif-ink saif-a" + i, a[0], a[1], a[2], a[3], '<path d="' + a[4] + '"/>'); });
    RINGS.forEach(function (c, i) {
      s += part("saif-ring saif-r" + i, c[0] - 184.5, c[1] - 184.5, c[0] + 184.5, c[1] + 184.5,
        '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="144.25" stroke-width="80.5"/>');
    });
    LETTERS.forEach(function (l, i) { s += part("saif-ink saif-l saif-l" + i, l[0], l[1], l[2], l[3], '<path d="' + l[4] + '"/>'); });
    return s;
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
    root.innerHTML = '<div class="saif-bg"></div><div class="saif-logo">' + logoMarkup() + "</div>";
    (document.body || document.documentElement).appendChild(root);

    var q = function (c) { return root.querySelector("." + c); };
    var letters = Array.prototype.slice.call(root.querySelectorAll(".saif-l"));
    var anims = [], timers = [], done = false;

    function applyTheme() { root.classList.toggle("saif-dark", isDark()); }
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
      var a = el.animate(kf, { duration: o.d, delay: o.t || 0, fill: o.f || "both", easing: o.e || SP });
      anims.push(a);
      return a;
    }

    // 1. Появление: линзы «фокусируются», стрелки выезжают, буквы всплывают
    A(q("saif-r0"), [{ transform: "scale(1.35) rotate(-20deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 750 });
    A(q("saif-r1"), [{ transform: "scale(1.35) rotate(20deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 750, t: 90 });
    A(q("saif-a0"), [{ transform: "translateX(90%) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 600, t: 280 });
    A(q("saif-a1"), [{ transform: "translateX(-90%) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { d: 600, t: 280 });
    letters.forEach(function (l, i) {
      A(l, [{ opacity: 0, transform: "translateY(35%) scale(.9)" }, { opacity: 1, transform: "none" }], { d: 520, t: 460 + i * 40 });
    });
    // 2. Свечение — мягкий «вдох» всего логотипа
    A(q("saif-logo"), [{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }], { d: 600, t: 1050, f: "none", e: "ease-in-out" });

    // 3–6. Исчезновение — после «свечения», после загрузки страницы и когда браузер свободен
    var started = performance.now(), exiting = false;
    function exit() {
      if (done || exiting) return;
      exiting = true;
      var t0 = Math.max(0, 1650 - (performance.now() - started));
      letters.map(function (l, i) { return [l, Math.abs(i - 5)]; })
        .sort(function (a, b) { return b[1] - a[1]; })
        .forEach(function (p, r) {
          A(p[0], [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-25%) scale(.92)" }], { d: 340, t: t0 + r * 38, f: "forwards", e: IN });
        });
      A(q("saif-a0"), [{ transform: "none", opacity: 1 }, { transform: "translateX(-110%) scale(.7)", opacity: 0 }], { d: 380, t: t0 + 500, f: "forwards", e: IN });
      A(q("saif-a1"), [{ transform: "none", opacity: 1 }, { transform: "translateX(110%) scale(.7)", opacity: 0 }], { d: 380, t: t0 + 500, f: "forwards", e: IN });
      var last;
      ["saif-r0", "saif-r1"].forEach(function (c) {
        last = A(q(c), [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.08)", opacity: 1, offset: 0.25 }, { transform: "scale(0)", opacity: 0 }],
          { d: 480, t: t0 + 800, f: "forwards", e: "cubic-bezier(.5,0,.75,0)" });
      });
      // Стекло растворяется только когда линзы действительно закрылись — без рассинхрона
      last.finished.then(function () {
        if (done) return;
        root.style.pointerEvents = "none";
        A(root, [{ opacity: 1 }, { opacity: 0 }], { d: 600, e: "cubic-bezier(.25,.1,.25,1)" }).finished.then(destroy, destroy);
      }, function () {});
    }
    function whenIdle(fn) {
      if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1500 });
      else setTimeout(fn, 200);
    }
    function onLoad() { whenIdle(exit); }
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    // Страница грузится слишком долго — всё равно убираем заставку через 8 с.
    timers.push(setTimeout(exit, 8000));
    timers.push(setTimeout(destroy, 12000));
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
