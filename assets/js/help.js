// Help center search. Works on the static list; loads the full-text index on first use.
(function () {
  var input = document.getElementById('help-q');
  if (!input) return;
  var status = document.getElementById('help-status');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.cat-chips button'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('.help-cat'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.help-list li'));
  var index = null, loading = false, activeCat = 'all';

  function words(q) {
    return q.toLowerCase().replace(/[^a-z0-9%$&.' -]+/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function textFor(li) {
    var id = li.getAttribute('data-id');
    return (index && index[id]) || li.textContent.toLowerCase();
  }
  function run() {
    var ws = words(input.value), shown = 0;
    items.forEach(function (li) {
      var okCat = activeCat === 'all' || li.getAttribute('data-cat') === activeCat;
      var t = ws.length ? textFor(li) : '';
      var okQ = ws.every(function (w) { return t.indexOf(w) !== -1; });
      li.hidden = !(okCat && okQ);
      if (!li.hidden) shown++;
    });
    cats.forEach(function (c) {
      c.hidden = !c.querySelector('li:not([hidden])');
    });
    if (!ws.length && activeCat === 'all') status.textContent = items.length + ' articles';
    else status.textContent = shown ? shown + (shown === 1 ? ' matching article' : ' matching articles') + (ws.length ? '. Every result matches all of your words.' : '') : 'No article matches all of those words. Try one word, such as invoice, backup or laptop.';
    var url = new URL(window.location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }
  function ensureIndex() {
    if (index || loading) return;
    loading = true;
    fetch(input.getAttribute('data-index')).then(function (r) { return r.json(); }).then(function (j) { index = j; run(); }).catch(function () { loading = false; });
  }
  input.addEventListener('input', function () { ensureIndex(); run(); });
  input.addEventListener('focus', ensureIndex);
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      activeCat = b.getAttribute('data-cat');
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      run();
    });
  });
  var q = new URL(window.location.href).searchParams.get('q');
  if (q) { input.value = q; ensureIndex(); run(); }
})();
