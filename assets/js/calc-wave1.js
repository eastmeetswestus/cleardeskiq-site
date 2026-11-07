/* ClearDesk IQ free calculators, wave 1 (2026-11-07). Runs in the browser; no libraries, no tracking.
   Nothing you type is stored or sent.
   Pages: estimate-vs-actual-job-profit-calculator.html (eva-), change-order-price-calculator.html (co-),
   food-truck-break-even-calculator.html (ftb-), contractor-hourly-rate-calculator.html (hr-),
   menu-price-calculator.html (mp-).
   Pure functions are exported for node tests (build/test-calc-wave1.js).
   Conventions: a missing, negative or non-numeric input counts as 0 unless a page needs it (then the page says so).
   Margin = profit / price. Markup = profit / cost. Target price = cost / (1 - margin). */
(function () {
  'use strict';

  // Missing, negative or NaN -> 0.
  function nz(x) { return typeof x === 'number' && isFinite(x) && x > 0 ? x : 0; }
  // Round up to whole cents (guards float noise, e.g. 11.3333 -> 11.34).
  function upCent(x) { return Math.ceil(x * 100 - 1e-9) / 100; }
  function upStep(x, step) { return Math.ceil(x / step - 1e-9) * step; }
  // Fixed decimals, rounded half away from zero on both sides; -0.04 at 1 decimal reads 0.0, not -0.0.
  function fmtFixed(n, d) {
    if (typeof n !== 'number' || !isFinite(n)) return 'n/a';
    var k = Math.pow(10, d);
    var a = Math.round(Math.abs(n) * k + 1e-9) / k;
    return (n < 0 && a > 0 ? '-' : '') + a.toFixed(d);
  }

  // ------------------------------------------------------------------ 1. Estimate vs actual (margin fade)
  // i: quotePrice, estMaterials, estLabor, estSubs, estOther, finalPrice, actMaterials, actLabor, actSubs, actOther
  // fade = estimated margin points minus actual margin points (positive = the job kept less than you bid).
  // Exact split of the fade: cost points (each cost line, actual minus estimate, over the final price) plus price points.
  function estVsActual(i) {
    var quote = nz(i.quotePrice), fin = nz(i.finalPrice);
    var estLines = [nz(i.estMaterials), nz(i.estLabor), nz(i.estSubs), nz(i.estOther)];
    var actLines = [nz(i.actMaterials), nz(i.actLabor), nz(i.actSubs), nz(i.actOther)];
    var estCost = estLines[0] + estLines[1] + estLines[2] + estLines[3];
    var actCost = actLines[0] + actLines[1] + actLines[2] + actLines[3];
    var estProfit = quote - estCost;
    var actProfit = fin - actCost;
    var estMargin = quote > 0 ? estProfit / quote * 100 : NaN;
    var actMargin = fin > 0 ? actProfit / fin * 100 : NaN;
    var fade = isFinite(estMargin) && isFinite(actMargin) ? estMargin - actMargin : NaN;
    var names = ['Materials', 'Labor', 'Subcontractors', 'Other job costs'];
    var lines = names.map(function (name, k) {
      var diff = actLines[k] - estLines[k];
      return { name: name, est: estLines[k], act: actLines[k], diff: diff, points: fin > 0 ? diff / fin * 100 : NaN };
    });
    var costPoints = fin > 0 ? (actCost - estCost) / fin * 100 : NaN;
    var pricePoints = isFinite(fade) ? fade - costPoints : NaN;
    var status;
    if (!(quote > 0) || !(fin > 0)) status = 'Enter a bid price and a final price above $0';
    else status = fade > 0 ? 'Faded' : 'Held';
    return {
      estCost: estCost, actCost: actCost, estProfit: estProfit, actProfit: actProfit,
      estMarginPct: estMargin, actMarginPct: actMargin, fadePoints: fade,
      profitLost: estProfit - actProfit, lines: lines, costPoints: costPoints, pricePoints: pricePoints,
      status: status
    };
  }

  // ------------------------------------------------------------------ 2. Change-order price
  // i: direct (materials + labor you pay for the change), overheadPct (of direct cost), marginPct (target margin on the change price)
  // price = (direct + overhead) / (1 - margin). Charging direct cost only leaves overhead and profit unpaid.
  function changeOrder(i) {
    var direct = nz(i.direct), oh = nz(i.overheadPct), mg = nz(i.marginPct);
    var overhead = direct * oh / 100;
    var cost = direct + overhead;
    var price = NaN;
    var status;
    if (mg >= 100) status = 'The margin must be below 100%. A 100% margin needs an impossible price.';
    else if (direct === 0 && cost === 0) status = 'Enter the direct cost of the change above $0';
    else { price = Math.ceil(cost / (1 - mg / 100) * 100 - 1e-9) / 100; status = 'ok'; }
    var profit = isFinite(price) ? price - cost : NaN;
    return {
      overhead: overhead, cost: cost, price: price, profit: profit,
      marginOnPricePct: isFinite(price) && price > 0 ? profit / price * 100 : NaN,
      notRecoveredDirectOnly: isFinite(price) ? price - direct : NaN,
      status: status
    };
  }

  // ------------------------------------------------------------------ 3. Food truck break-even
  // i: fixed (per month), sale (average sale per order), variable (food and packaging per order),
  //    feePct (card and delivery fees, % of sales), days (open days per month), hours (open hours per day),
  //    perHour (orders you expect per hour while open)
  function breakEven(i) {
    var fixed = nz(i.fixed), sale = nz(i.sale), variable = nz(i.variable), fee = nz(i.feePct);
    var days = nz(i.days), hours = nz(i.hours), perHour = nz(i.perHour);
    var contribution = sale - variable - sale * fee / 100;
    var out = { contribution: contribution, monthlyOrders: NaN, dailyOrders: NaN, hoursNeeded: NaN,
      monthlySales: NaN, status: '' };
    if (!(sale > 0)) { out.status = 'Enter an average sale above $0'; return out; }
    if (contribution <= 0) { out.status = 'No break-even at this price: each order loses money or breaks even'; return out; }
    var monthlyExact = fixed / contribution;
    out.monthlyOrders = Math.max(0, Math.ceil(monthlyExact - 1e-9));
    out.monthlySales = out.monthlyOrders * sale;
    if (days > 0) out.dailyOrders = Math.max(0, Math.ceil(monthlyExact / days - 1e-9));
    if (isFinite(out.dailyOrders) && perHour > 0) out.hoursNeeded = out.dailyOrders / perHour;
    if (!(days > 0)) out.status = 'Enter the open days per month above 0';
    else if (!(perHour > 0)) out.status = 'Enter the orders per hour above 0 to see the hours needed';
    else if (hours > 0 && out.hoursNeeded > hours) out.status = 'More hours than you are open: raise the price, cut fixed costs or sell more per hour';
    else out.status = 'Within your open hours';
    return out;
  }

  // ------------------------------------------------------------------ 4. Contractor hourly rate
  // i: ownerPay (what you want to keep as pay per year, before tax), overhead (business costs per year not billed to jobs),
  //    taxPct (self-employment tax, editable, simplified: owner pay is grossed up by this share),
  //    hoursPerWeek, weeksOff, billablePct (share of available hours you can bill)
  function hourlyRate(i) {
    var owner = nz(i.ownerPay), ovh = nz(i.overhead), tax = nz(i.taxPct);
    var hpw = nz(i.hoursPerWeek), off = nz(i.weeksOff), bill = nz(i.billablePct);
    var out = { grossOwnerPay: NaN, annualCost: NaN, availableHours: NaN, billableHours: NaN,
      rate: NaN, rateAt2080: NaN, gap: NaN, status: '' };
    if (tax >= 100) { out.status = 'Self-employment tax must be below 100%'; return out; }
    if (bill > 100) { out.status = 'Billable share must be 100% or less'; return out; }
    if (off >= 52) { out.status = 'Weeks off must be below 52'; return out; }
    out.grossOwnerPay = owner / (1 - tax / 100);
    out.annualCost = out.grossOwnerPay + ovh;
    out.availableHours = hpw * Math.max(0, 52 - off);
    out.billableHours = out.availableHours * bill / 100;
    out.rateAt2080 = out.annualCost / 2080;
    if (!(out.billableHours > 0)) { out.status = 'Enter hours per week and a billable share above 0%'; return out; }
    out.rate = out.annualCost / out.billableHours;
    out.gap = out.rate - out.rateAt2080;
    out.status = 'ok';
    return out;
  }

  // ------------------------------------------------------------------ 5. Menu price from target food cost
  // i: plate (plate cost in $), targetPct (target food cost %), roundStep (0, 0.25 or 0.5), currentPrice (optional)
  function menuPrice(i) {
    var plate = nz(i.plate), tgt = i.targetPct, step = nz(i.roundStep), cur = nz(i.currentPrice);
    var out = { price: NaN, foodPctAtPrice: NaN, profitPerPlate: NaN, currentFoodPct: NaN, onTarget: null,
      raise: NaN, status: '' };
    if (typeof tgt !== 'number' || !isFinite(tgt) || tgt <= 0 || tgt >= 100) {
      out.status = 'Target food cost must be above 0% and below 100%'; return out;
    }
    if (!(plate > 0)) { out.status = 'Enter a plate cost above $0'; return out; }
    var raw = plate / (tgt / 100);
    out.price = step > 0 ? upStep(raw, step) : upCent(raw);
    out.foodPctAtPrice = plate / out.price * 100;
    out.profitPerPlate = out.price - plate;
    if (cur > 0) {
      out.currentFoodPct = plate / cur * 100;
      out.onTarget = out.currentFoodPct <= tgt + 1e-9;
      out.raise = out.price - cur;
    }
    out.status = 'ok';
    return out;
  }

  var api = {
    fmt: { fixed: fmtFixed },
    estVsActual: estVsActual, changeOrder: changeOrder, breakEven: breakEven,
    hourlyRate: hourlyRate, menuPrice: menuPrice, nz: nz, upCent: upCent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // ------------------------------------------------------------------ page wiring (browser only)
  if (typeof document === 'undefined') return;

  function val(id) { // raw number from a field; empty or unparseable -> NaN
    var el = document.getElementById(id);
    if (!el) return NaN;
    var s = String(el.value).trim();
    return s === '' ? NaN : Number(s);
  }
  function money(n) {
    if (!isFinite(n)) return 'n/a';
    var r = Math.round(Math.abs(n) * 100) / 100;
    var s = r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 && r > 0 ? '-$' : '$') + s;
  }
  function money0(n) {
    if (!isFinite(n)) return 'n/a';
    return (n < 0 && Math.round(n) !== 0 ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('en-US');
  }
  function pct(n) { return isFinite(n) ? fmtFixed(n, 1) + '%' : 'n/a'; }
  function pct2(n) { return isFinite(n) ? fmtFixed(n, 2) + '%' : 'n/a'; }
  function pts(n) { return isFinite(n) ? fmtFixed(n, 1) + ' points' : 'n/a'; }
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function flag(id, text, tone) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = text; el.className = 'flag ' + (tone || 'thin');
  }
  function msg(id, text) {
    var el = document.getElementById(id); if (!el) return;
    el.innerHTML = text ? '<ul class="msg-list"><li>' + text.replace(/[<>&]/g, '') + '</li></ul>' : '';
  }

  // Estimate vs actual
  function runEva() {
    var r = estVsActual({
      quotePrice: val('eva-quote'), estMaterials: val('eva-est-mat'), estLabor: val('eva-est-lab'),
      estSubs: val('eva-est-sub'), estOther: val('eva-est-oth'), finalPrice: val('eva-final'),
      actMaterials: val('eva-act-mat'), actLabor: val('eva-act-lab'), actSubs: val('eva-act-sub'), actOther: val('eva-act-oth')
    });
    var ok = isFinite(r.fadePoints);
    set('eva-big', ok ? pts(r.fadePoints) : 'n/a');
    flag('eva-flag', r.status === 'Faded' ? 'Faded' : (r.status === 'Held' ? 'Held' : 'Enter prices'),
      r.status === 'Faded' ? 'bad' : (r.status === 'Held' ? 'good' : 'thin'));
    set('eva-est-m', pct(r.estMarginPct));
    set('eva-act-m', pct(r.actMarginPct));
    set('eva-profit-lost', money0(r.profitLost));
    set('eva-est-profit', money0(r.estProfit));
    set('eva-act-profit', money0(r.actProfit));
    set('eva-cost-pts', pts(r.costPoints));
    set('eva-price-pts', pts(r.pricePoints));
    r.lines.forEach(function (l, k) {
      set('eva-line-' + k, (l.diff >= 0 ? '+' : '') + money0(l.diff) + ' (' + pts(l.points) + ')');
    });
    var cta = !ok ? 'Enter a bid price and a final price above $0 to see the fade.'
      : r.fadePoints > 0
        ? 'This job kept ' + pts(r.fadePoints).replace(' points', '') + ' points less than you bid (' + money0(r.profitLost) + ' less profit). ClearDesk IQ compares estimate and actual job costs by cost category.'
        : 'This job kept its bid margin or better. ClearDesk IQ compares estimate and actual job costs by cost category on every job.';
    set('eva-cta', cta);
    msg('eva-msgs', ok ? '' : r.status);
  }

  // Change order
  function runCo() {
    var r = changeOrder({ direct: val('co-direct'), overheadPct: val('co-oh'), marginPct: val('co-margin') });
    var ok = isFinite(r.price);
    set('co-big', ok ? money(r.price) : 'n/a');
    flag('co-flag', ok ? 'Price for the change' : 'Check the inputs', ok ? 'good' : 'thin');
    set('co-oh-amt', money(r.overhead));
    set('co-cost', money(r.cost));
    set('co-profit', ok ? money(r.profit) : 'n/a');
    set('co-margin-out', pct2(r.marginOnPricePct));
    set('co-lost', ok ? money(r.notRecoveredDirectOnly) : 'n/a');
    var cta = ok && r.notRecoveredDirectOnly > 0
      ? 'Charging direct cost only leaves ' + money0(r.notRecoveredDirectOnly) + ' of overhead and profit on this change. Records each change order as Draft, Submitted, Approved or Rejected. Only approved changes adjust the contract value and budget.'
      : 'Records each change order as Draft, Submitted, Approved or Rejected. Only approved changes adjust the contract value and budget.';
    set('co-cta', cta);
    msg('co-msgs', ok ? '' : r.status);
  }

  // Food truck break-even
  function runFtb() {
    var r = breakEven({
      fixed: val('ftb-fixed'), sale: val('ftb-sale'), variable: val('ftb-var'), feePct: val('ftb-fee'),
      days: val('ftb-days'), hours: val('ftb-hours'), perHour: val('ftb-perhour')
    });
    var ok = isFinite(r.dailyOrders);
    set('ftb-big', ok ? r.dailyOrders + ' orders a day' : 'n/a');
    flag('ftb-flag', ok ? (r.status === 'Within your open hours' ? 'Within open hours' : 'Check hours') : 'Check the inputs',
      ok && r.status === 'Within your open hours' ? 'good' : 'thin');
    set('ftb-month', isFinite(r.monthlyOrders) ? r.monthlyOrders.toLocaleString('en-US') + ' orders' : 'n/a');
    set('ftb-sales', isFinite(r.monthlySales) ? money0(r.monthlySales) : 'n/a');
    set('ftb-contrib', money(r.contribution));
    set('ftb-hours-out', isFinite(r.hoursNeeded) ? r.hoursNeeded.toFixed(1) + ' hours' : 'n/a');
    var cta = ok
      ? 'Break-even is ' + r.dailyOrders + ' orders a day at these costs. ClearDesk IQ Restaurant Edition tracks food cost %, prime cost % and profit per plate for each sales period.'
      : 'ClearDesk IQ Restaurant Edition tracks food cost %, prime cost % and profit per plate for each sales period.';
    set('ftb-cta', cta);
    msg('ftb-msgs', ok ? (r.status === 'Within your open hours' ? '' : r.status) : r.status);
  }

  // Contractor hourly rate
  function runHr() {
    var r = hourlyRate({
      ownerPay: val('hr-owner'), overhead: val('hr-overhead'), taxPct: val('hr-tax'),
      hoursPerWeek: val('hr-hpw'), weeksOff: val('hr-off'), billablePct: val('hr-bill')
    });
    var ok = isFinite(r.rate);
    set('hr-big', ok ? money(r.rate) + ' an hour' : 'n/a');
    flag('hr-flag', ok ? 'Your rate' : 'Check the inputs', ok ? 'good' : 'thin');
    set('hr-annual', isFinite(r.annualCost) ? money0(r.annualCost) : 'n/a');
    set('hr-hours', isFinite(r.billableHours) ? Math.round(r.billableHours).toLocaleString('en-US') + ' hours' : 'n/a');
    set('hr-2080', isFinite(r.rateAt2080) ? money(r.rateAt2080) + ' an hour' : 'n/a');
    set('hr-gap', ok ? money(r.gap) + ' an hour' : 'n/a');
    var cta = ok
      ? 'This rate covers ' + money0(r.annualCost) + ' a year of owner pay, tax and overhead over ' + Math.round(r.billableHours).toLocaleString('en-US') + ' billable hours. ClearDesk IQ has a company overhead section for costs that do not belong to one job, and records approved employee time against each job.'
      : 'ClearDesk IQ has a company overhead section for costs that do not belong to one job, and records approved employee time against each job.';
    set('hr-cta', cta);
    msg('hr-msgs', ok ? '' : r.status);
  }

  // Menu price
  function runMp() {
    var step = val('mp-round');
    var r = menuPrice({ plate: val('mp-plate'), targetPct: val('mp-target'), roundStep: step, currentPrice: val('mp-current') });
    var ok = isFinite(r.price);
    set('mp-big', ok ? money(r.price) : 'n/a');
    flag('mp-flag', ok ? (r.onTarget === null ? 'Set a current price to compare' : (r.onTarget ? 'Current price on target' : 'Current price above target'))
      : 'Check the inputs', ok && r.onTarget !== false ? 'good' : 'thin');
    set('mp-pct', ok ? pct2(r.foodPctAtPrice) : 'n/a');
    set('mp-profit', ok ? money(r.profitPerPlate) : 'n/a');
    set('mp-cur-pct', isFinite(r.currentFoodPct) ? pct2(r.currentFoodPct) : 'Enter current price');
    set('mp-raise', isFinite(r.raise) ? (r.raise > 0 ? '+' : '') + money(r.raise) : 'Enter current price');
    var cta = ok
      ? 'At ' + money(r.price) + ' this dish keeps ' + money(r.profitPerPlate) + ' a plate. ClearDesk IQ Restaurant Edition ranks dishes by profit per plate and flags any dish over its food cost target.'
      : 'ClearDesk IQ Restaurant Edition ranks dishes by profit per plate and flags any dish over its food cost target.';
    set('mp-cta', cta);
    msg('mp-msgs', ok ? '' : r.status);
  }

  var HR_PRESETS = {
    handyman: { 'hr-owner': 60000, 'hr-overhead': 18000, 'hr-tax': 15.3, 'hr-hpw': 40, 'hr-off': 3, 'hr-bill': 65 },
    electrician: { 'hr-owner': 90000, 'hr-overhead': 30000, 'hr-tax': 15.3, 'hr-hpw': 40, 'hr-off': 4, 'hr-bill': 60 }
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-hr-preset]'), function (btn) {
    btn.addEventListener('click', function () {
      var p = HR_PRESETS[btn.getAttribute('data-hr-preset')];
      if (!p) return;
      Object.keys(p).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = String(p[id]); });
      runHr();
    });
  });

  function bind(formId, fn) {
    var f = document.getElementById(formId); if (!f) return;
    f.addEventListener('input', fn); f.addEventListener('change', fn); fn();
  }
  bind('eva-form', runEva);
  bind('co-form', runCo);
  bind('ftb-form', runFtb);
  bind('hr-form', runHr);
  bind('mp-form', runMp);
})();
