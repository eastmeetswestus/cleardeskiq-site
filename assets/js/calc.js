// Job profit calculator and one-payment vs monthly-fee comparisons. Runs in the browser only; nothing is stored or sent.
(function () {
  var money = function (n) {
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (n < 0 ? '-$' : '$') + s;
  };
  var num = function (id) { var el = document.getElementById(id); var v = parseFloat(el && el.value); return isFinite(v) ? v : 0; };
  var set = function (id, t) { var el = document.getElementById(id); if (el) el.textContent = t; };
  var money2 = function (n) { return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  // Job profit calculator
  if (document.getElementById('jp-form')) {
    var calc = function () {
      var price = num('jp-price');
      var labor = num('jp-hours') * num('jp-rate');
      var direct = num('jp-materials') + labor + num('jp-subs') + num('jp-other');
      var overhead = direct * num('jp-overhead') / 100;
      var total = direct + overhead;
      var profit = price - total;
      var margin = price > 0 ? profit / price : 0;
      var target = num('jp-target') / 100;
      var rise = num('jp-rise') / 100;
      var needed = target < 1 ? total / (1 - target) : 0;
      var riseProfit = price - total * (1 + rise);
      set('jp-labor', money(labor));
      set('jp-direct', money(direct));
      set('jp-oh', money(overhead));
      set('jp-total', money(total));
      set('jp-profit', money(profit));
      set('jp-margin', price > 0 ? (margin * 100).toFixed(1) + '%' : 'n/a');
      set('jp-needed', target < 1 ? money(needed) : 'n/a');
      set('jp-rise-out', money(riseProfit) + (price > 0 ? ' (' + (riseProfit / price * 100).toFixed(1) + '% margin)' : ''));
      set('jp-rise-label', 'Profit if costs rise ' + num('jp-rise') + '%');
      var flag = document.getElementById('jp-flag');
      if (flag) {
        var cls = 'bad', txt = 'Underpriced';
        if (price > 0 && margin >= target) { cls = 'good'; txt = 'Healthy'; }
        else if (price > 0 && margin >= 0.10) { cls = 'thin'; txt = 'Thin'; }
        flag.className = 'flag ' + cls; flag.textContent = txt;
      }
    };
    document.getElementById('jp-form').addEventListener('input', calc);
    calc();
  }

  // One payment vs a monthly fee: full table version on /pricing.html (cmp-form), and compact versions under the heroes (qc-*).
  var cmpFull = function () {
    var m = num('cmp-month'), y = num('cmp-years');
    var total = m * 12 * y;
    set('cmp-total', money(total));
    var d = total - (parseFloat(document.getElementById('cmp-form').getAttribute('data-price')) || 79.99);
    set('cmp-diff', money2(d));
    set('cmp-years-out', y + (y === 1 ? ' year' : ' years'));
  };
  if (document.getElementById('cmp-form')) {
    document.getElementById('cmp-form').addEventListener('input', cmpFull);
    cmpFull();
  }
  var quick = function (id) {
    var form = document.getElementById(id);
    var run = function () {
      var m = num(id + '-month'), y = num(id + '-years');
      var total = m * 12 * y;
      var price = parseFloat(form.getAttribute('data-price')) || 79.99;
      var yrs = y + (y === 1 ? ' year' : ' years');
      set(id + '-msg', 'Over ' + yrs + ', a ' + money(m) + ' a month plan costs ' + money(total) + '. ClearDesk IQ costs $' + price.toFixed(2) + ' once.');
    };
    form.addEventListener('input', run);
    run();
  };
  if (document.getElementById('qc-home-month')) quick('qc-home');
  if (document.getElementById('qc-contractors-month')) quick('qc-contractors');
})();
