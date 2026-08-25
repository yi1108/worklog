/* 看板与时间线的项目/状态/关键词筛选 */
(function () {
  var root = document.querySelector('[data-board]');
  var toolbar = document.querySelector('[data-board-toolbar]');
  if (!root || !toolbar) return;

  var emptyTip = document.querySelector('[data-board-empty]');
  var search = toolbar.querySelector('[data-board-search]');
  var state = { project: '', ship: '', q: '' };

  function setActive(group, btn) {
    group.querySelectorAll('.chip').forEach(function (b) { b.classList.remove('is-on'); });
    btn.classList.add('is-on');
  }

  function apply() {
    var cards = root.querySelectorAll('[data-card]');
    var shown = 0;
    cards.forEach(function (card) {
      var okProject = !state.project || card.getAttribute('data-project') === state.project;
      var okShip = !state.ship || card.getAttribute('data-ship') === state.ship;
      var text = card.getAttribute('data-text') || card.textContent.toLowerCase();
      var okQuery = !state.q || text.indexOf(state.q) !== -1;
      var show = okProject && okShip && okQuery;
      card.hidden = !show;
      if (show) shown += 1;
    });

    // 列头计数跟着筛选走，空列整列隐藏
    root.querySelectorAll('[data-col]').forEach(function (col) {
      var visible = col.querySelectorAll('[data-card]:not([hidden])').length;
      var counter = col.querySelector('[data-col-count]');
      if (counter) counter.textContent = visible;
      col.hidden = visible === 0;
    });

    if (emptyTip) emptyTip.hidden = shown !== 0;
  }

  toolbar.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    var group = btn.closest('.filter-group');
    if (btn.hasAttribute('data-filter-project')) {
      state.project = btn.getAttribute('data-filter-project');
      setActive(group, btn);
    } else if (btn.hasAttribute('data-filter-ship')) {
      state.ship = btn.getAttribute('data-filter-ship');
      setActive(group, btn);
    }
    apply();
  });

  if (search) {
    search.addEventListener('input', function () {
      state.q = search.value.trim().toLowerCase();
      apply();
    });
  }

  apply();
})();
