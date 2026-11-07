/* ClearDesk IQ free calculators (2026-11-07). Runs in the browser. Nothing you type is stored or sent.
   Same rules as the job profit calculator: overhead is a percent of direct costs,
   margin = profit / price, price for a target margin = total cost / (1 - target).
   Pages: job-profitability-calculator.html (ids jpf-*) and the homepage job check (ids hjp-*). */
(function () {
  'use strict';
  var TARGET_MAX = 95; // at or above this a target price is not defined

  function status(price, marginPct, targetPct) {
    if (!(price > 0)) return 'Enter a price';
    if (marginPct < 10) return 'Underpriced';      // under 10% or a loss
    if (marginPct >= targetPct) return 'Healthy';   // at or above target
    return 'Thin';                                  // at least 10%, under target
  }
  function priceForTarget(cost, targetPct) {
    if (!(targetPct < TARGET_MAX)) return NaN;
    return cost / (1 - targetPct / 100);
  }

  // i: { price, materials, subs, other, hours, rate, overheadPct, targetPct }
  function jobProfitability(i) {
    var labor = i.hours * i.rate;
    var direct = i.materials + i.subs + i.other + labor;
    var overhead = direct * i.overheadPct / 100;
    var total = direct + overhead;
    var profit = i.price - total;
    var marginPct = i.price > 0 ? profit / i.price * 100 : NaN;
    return {
      labor: labor, direct: direct, overhead: overhead, total: total, profit: profit,
      marginPct: marginPct, needed: priceForTarget(total, i.targetPct),
      status: status(i.price, marginPct, i.targetPct)
    };
  }

  // i: { price, cost, targetPct }
  function jobMargin(i) {
    var profit = i.price - i.cost;
    var marginPct = i.price > 0 ? profit / i.price * 100 : NaN;
    var markupPct = i.cost > 0 ? profit / i.cost * 100 : NaN;
    var needed = priceForTarget(i.cost, i.targetPct);
    var increase = isFinite(needed) ? Math.max(0, needed - i.price) : NaN;
    return {
      profit: profit, marginPct: marginPct, markupPct: markupPct, needed: needed,
      increase: increase, status: status(i.price, marginPct, i.targetPct)
    };
  }

  var api = { jobProfitability: jobProfitability, jobMargin: jobMargin, status: status, priceForTarget: priceForTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // ---- page wiring (browser only)
  if (typeof document === 'undefined') return;
  var reduceMotion = typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function num(id) {
    var el = document.getElementById(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isFinite(v) && v >= 0 ? v : 0;
  }
  function money(n) {
    if (!isFinite(n)) return 'n/a';
    var r = Math.round(Math.abs(n)).toLocaleString('en-US');
    return (n < 0 && Math.round(n) !== 0 ? '-$' : '$') + r;
  }
  function pct(n) { if (!isFinite(n)) return 'n/a'; var a = Math.round(Math.abs(n) * 10 + 1e-9) / 10; return (n < 0 && a > 0 ? '-' : '') + a.toFixed(1) + '%'; }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function flag(id, st) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = st;
    el.className = 'flag ' + ({ 'Healthy': 'good', 'Thin': 'thin', 'Underpriced': 'bad' }[st] || '');
  }
  // Result colour by status: green at or above target, amber for Thin, red for Underpriced; none when no price.
  function tone(id, st) {
    var el = document.getElementById(id); if (!el) return;
    el.className = 'result-big' + ({ 'Healthy': ' is-good', 'Thin': ' is-warn', 'Underpriced': ' is-bad' }[st] || '');
  }
  var shown = {};
  // 400 ms count to the new profit; instant when reduced motion is on or no animation frames exist.
  function showProfit(id, value) {
    var el = document.getElementById(id); if (!el) return;
    var from = shown.hasOwnProperty(id) ? shown[id] : value;
    shown[id] = value;
    if (reduceMotion || typeof requestAnimationFrame !== 'function' || from === value) { el.textContent = money(value); return; }
    var start = null;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / 400);
      el.textContent = money(from + (value - from) * k);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // p = id prefix: 'jpf' (full calculator) or 'hjp' (homepage check). Missing fields count as 0.
  function runProfit(p, animate) {
    var targetPct = num(p + '-target');
    var r = jobProfitability({
      price: num(p + '-price'), materials: num(p + '-materials'), subs: num(p + '-subs'), other: num(p + '-other'),
      hours: num(p + '-hours'), rate: num(p + '-rate'), overheadPct: num(p + '-overhead'), targetPct: targetPct
    });
    if (animate) showProfit(p + '-profit', r.profit); else set(p + '-profit', money(r.profit));
    tone(p + '-profit', r.status);
    set(p + '-margin', pct(r.marginPct));
    flag(p + '-flag', r.status);
    set(p + '-labor', money(r.labor));
    set(p + '-direct', money(r.direct));
    set(p + '-oh', money(r.overhead));
    set(p + '-total', money(r.total));
    set(p + '-needed', targetPct < TARGET_MAX ? money(Math.ceil(r.needed - 1e-9)) : 'Set a target under 95%');
    if (p === 'jpf') set('jpf-cta', jobCta(r));
  }

  function jobCta(r) {
    if (!isFinite(r.marginPct)) return 'Enter a price to see what the job keeps.';
    return r.profit >= 0
      ? 'This job kept ' + money(r.profit) + ' (' + pct(r.marginPct) + ' margin). ClearDesk IQ tracks profit and margin for every job you run in the app.'
      : 'At these costs this job loses ' + money(-r.profit) + '. ClearDesk IQ tracks profit and margin for every job you run in the app.';
  }

  function bind(formId, fn) {
    var f = document.getElementById(formId); if (!f) return;
    f.addEventListener('input', fn); fn();
  }
  bind('jpf-form', function () { runProfit('jpf', false); });
  bind('hjp-form', function () { runProfit('hjp', true); });
})();
