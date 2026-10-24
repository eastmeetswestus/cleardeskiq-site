// ClearDesk IQ free calculators: restaurant food cost (plate cost, food cost %, price to hit target),
// prime cost, and markup vs margin. Runs in the browser only. Nothing you type is stored or sent.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // Empty field -> null. Text the browser could not parse as a number (for example "1,5") -> NaN.
  var num = function (id) {
    var el = $(id);
    if (!el) return null;
    var v = String(el.value).trim();
    if (v === '') return null;
    // Digits and one point only. A decimal comma ("1,5") or a minus sign is reported as NaN, never read silently.
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(v)) return NaN;
    return Number(v);
  };
  var bad = function (x) { return x !== null && x !== x; }; // NaN check
  var raw = function (id) { var el = $(id); return el ? String(el.value) : ''; };
  var setT = function (id, t) { var el = $(id); if (el) el.textContent = t; };
  // Round half up to cents, away from zero for negatives.
  var money = function (n) {
    var a = Math.round(Math.abs(n) * 100 + 1e-7) / 100;
    var s = a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 && a > 0 ? '-$' : '$') + s;
  };
  var pct = function (x) {
    var a = Math.round(Math.abs(x) * 100 + 1e-7) / 100;
    return (x < 0 && a > 0 ? '-' : '') + a.toFixed(2) + '%';
  };
  var msgBox = function (id, list) {
    var el = $(id);
    if (!el) return;
    el.innerHTML = list.length ? '<ul class="msg-list">' + list.map(function (m) { return '<li>' + m.replace(/[<>&]/g, '') + '</li>'; }).join('') + '</ul>' : '';
  };

  // ------------------------------------------------------------ restaurant food cost
  var UNIT = {
    oz: ['w', 28.349523125], lb: ['w', 453.59237], g: ['w', 1], kg: ['w', 1000],
    'fl oz': ['v', 1], cup: ['v', 8], each: ['c', 1]
  };
  var ROWS = 8;
  function foodCost() {
    var msgs = [];
    var lines = [];
    var portions = num('fc-portions');
    var portionsOk = portions !== null && !bad(portions) && portions > 0;
    if (!portionsOk) msgs.push('Portions must be at least 1.');
    var sell = num('fc-price');
    var target = num('fc-target');
    var targetOk = target !== null && !bad(target) && target > 0 && target < 100;
    var extras = num('fc-extras');
    if (bad(extras) || extras < 0) { msgs.push('Flat costs per plate must be 0 or more. Check the number; use a point for decimals.'); extras = 0; }
    if (extras === null) extras = 0;
    var units = num('fc-units');
    if (bad(units) || (units !== null && units < 0)) { msgs.push('Units sold per week must be 0 or more.'); units = null; }

    for (var i = 1; i <= ROWS; i++) {
      var nameEl = raw('fc-i' + i + '-name').trim();
      var name = nameEl || ('Ingredient ' + i);
      var qty = num('fc-i' + i + '-qty');
      if (qty === null || qty === 0) continue; // empty row: ignored
      if (bad(qty) || qty < 0) { msgs.push(name + ': check the amount used. Use a point for decimals, such as 1.50. Row left out.'); continue; }
      var price = num('fc-i' + i + '-price');
      var pack = num('fc-i' + i + '-pack');
      var y = num('fc-i' + i + '-yield');
      var uu = raw('fc-i' + i + '-unit');
      var up = raw('fc-i' + i + '-punit');
      if (price === null || bad(price) || price < 0) { msgs.push(name + ': enter the price you paid (0 or more). Row left out.'); continue; }
      if (pack === null || bad(pack) || pack <= 0) { msgs.push(name + ': enter the amount you paid for (above 0). Row left out.'); continue; }
      if (UNIT[uu][0] !== UNIT[up][0]) { msgs.push(name + ': use the same kind of unit for the amount used and the pack (weight, volume or each). Row left out.'); continue; }
      if (y === null) y = 100;
      if (bad(y) || y <= 0 || y > 100) { msgs.push(name + ': yield must be above 0 and at most 100. Row left out.'); continue; }
      // Cost of the amount used = amount x price per pack unit / pack size, then divided by yield.
      var cost = qty * UNIT[uu][1] * price / (pack * UNIT[up][1]) / (y / 100);
      lines.push({ name: name, cost: cost });
    }

    var lineSum = lines.reduce(function (s, l) { return s + l.cost; }, 0);
    var plate = portionsOk ? lineSum / portions + extras : NaN;
    var sellEntered = sell !== null;
    var sellOk = sellEntered && !bad(sell) && sell > 0;
    if (sellEntered && bad(sell)) msgs.push('Selling price: check the number. Use a point for decimals, such as 14.50.');

    setT('fc-plate', portionsOk ? money(plate) : 'n/a');
    setT('fc-pct', portionsOk && sellOk ? pct(plate / sell * 100) : (sellEntered && sell === 0 ? 'Enter a price above $0' : 'n/a'));
    setT('fc-margin', portionsOk && sellEntered && !bad(sell) ? money(sell - plate) : 'n/a');

    var targetPrice = 'n/a';
    if (portionsOk && targetOk) {
      var raw_price = plate / (target / 100);
      var step = Number(raw('fc-round')) || 0;
      targetPrice = money(step > 0 ? Math.ceil(raw_price / step - 1e-9) * step : raw_price);
    } else if (!targetOk) {
      msgs.push('Target food cost must be above 0% and below 100%.');
    }
    setT('fc-target-price', targetPrice);

    var status = 'Enter a selling price', cls = 'flag thin';
    if (sellOk && portionsOk && targetOk) {
      var p = plate / sell * 100;
      if (p <= target) { status = 'At or under target'; cls = 'flag good'; }
      else if (p <= target + 2) { status = 'Near target (up to 2 points over)'; cls = 'flag thin'; }
      else { status = 'Above target'; cls = 'flag bad'; }
    } else if (sellEntered && sell === 0) {
      status = 'Enter a selling price above $0';
    }
    var st = $('fc-status');
    if (st) { st.textContent = status; st.className = cls; }

    if (units !== null && portionsOk) {
      setT('fc-week-cost', money(plate * units));
      setT('fc-week-sales', sellOk ? money(sell * units) : 'Enter a selling price');
    } else {
      setT('fc-week-cost', 'Enter units sold');
      setT('fc-week-sales', 'Enter units sold');
    }

    // Largest costs on one plate, including flat costs.
    var top = lines.map(function (l) { return { name: l.name, per: portionsOk ? l.cost / portions : 0 }; });
    if (extras > 0) top.push({ name: 'Flat costs (sauce, garnish, container)', per: extras });
    top.sort(function (a, b) { return b.per - a.per; });
    var list = $('fc-top');
    if (list) {
      list.innerHTML = top.length
        ? top.slice(0, 3).map(function (t) { return '<li><span>' + t.name.replace(/[<>&]/g, '') + '</span><strong>' + money(t.per) + '</strong></li>'; }).join('')
        : '<li><span>Add ingredients below</span></li>';
    }
    msgBox('fc-msgs', msgs);
  }

  // ------------------------------------------------------------ prime cost
  function primeCost() {
    var msgs = [];
    var s = num('pc-sales'), c = num('pc-cogs'), l = num('pc-labor');
    if (c === null) c = 0;
    if (l === null) l = 0;
    if (bad(s) || bad(c) || bad(l) || c < 0 || l < 0) msgs.push('Check the numbers. Costs must be 0 or more, and use a point for decimals.');
    var sOk = s !== null && !bad(s) && s > 0 && !bad(c) && !bad(l) && c >= 0 && l >= 0;
    if (s !== null && s <= 0) msgs.push('Enter sales above $0 to get prime cost %.');
    if (sOk) {
      var prime = c + l;
      var p = prime / s * 100;
      setT('pc-prime', money(prime));
      setT('pc-pct', pct(p));
      setT('pc-food-pct', pct(c / s * 100));
      setT('pc-labor-pct', pct(l / s * 100));
      var st = $('pc-status'), t;
      if (p < 55) { t = 'Below the typical range'; st.className = 'flag thin'; }
      else if (p <= 65) { t = 'Within the typical range'; st.className = 'flag good'; }
      else { t = 'Above the typical range'; st.className = 'flag bad'; }
      st.textContent = t;
    } else {
      setT('pc-prime', 'n/a'); setT('pc-pct', 'n/a'); setT('pc-food-pct', 'n/a'); setT('pc-labor-pct', 'n/a');
      setT('pc-status', 'Enter sales above $0');
      var st2 = $('pc-status'); if (st2) st2.className = 'flag thin';
    }
    msgBox('pc-msgs', msgs);
  }

  // ------------------------------------------------------------ markup vs margin
  function markupMargin() {
    var msgs = [];
    var cost = num('mm-cost'), sell = num('mm-sell'), tm = num('mm-target-margin'), tk = num('mm-target-markup');
    if (bad(cost) || bad(sell) || bad(tm) || bad(tk)) msgs.push('Check the numbers. Use a point for decimals, such as 42.50.');
    var costOk = cost !== null && !bad(cost) && cost >= 0;
    var sellOk = sell !== null && !bad(sell);
    if (cost !== null && !bad(cost) && cost < 0) msgs.push('Cost cannot be negative.');
    setT('mm-markup-out', costOk && cost > 0 && sellOk ? pct((sell - cost) / cost * 100) : (costOk && cost === 0 ? 'Enter a cost above $0' : 'n/a'));
    setT('mm-margin-out', sellOk && sell > 0 && costOk ? pct((sell - cost) / sell * 100) : (sellOk && sell === 0 ? 'Enter a price above $0' : 'n/a'));
    setT('mm-profit', costOk && sellOk ? money(sell - cost) : 'n/a');

    var priceM = 'n/a';
    if (costOk && tm !== null && !bad(tm)) {
      if (tm < 0 || tm >= 100) msgs.push('A target margin must be at least 0% and below 100%. A 100% margin needs an impossible price.');
      else priceM = money(cost / (1 - tm / 100));
    }
    setT('mm-price-margin', priceM);

    var priceK = 'n/a', marginK = 'n/a';
    if (costOk && tk !== null && !bad(tk)) {
      if (tk < 0) msgs.push('A target markup cannot be negative.');
      else { priceK = money(cost * (1 + tk / 100)); marginK = pct(tk / (100 + tk) * 100); }
    }
    setT('mm-price-markup', priceK);
    setT('mm-margin-at-markup', marginK);
    msgBox('mm-msgs', msgs);
  }

  // Forms: recalc on every change.
  var pairs = [
    ['fc-form', foodCost], ['pc-form', primeCost], ['mm-form', markupMargin]
  ];
  pairs.forEach(function (p) {
    var f = $(p[0]);
    if (f) { f.addEventListener('input', p[1]); p[1](); }
  });
})();
