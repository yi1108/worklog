/* 面板筛选：项目 / 上线状态 / 关键词。支持 swup 的单页跳转后重绑。 */
(function () {
  function init() {
    var scope = document.querySelector('[data-wlp-scope]');
    var toolbar = document.querySelector('[data-wlp-toolbar]');
    if (!scope || !toolbar || toolbar.dataset.wlBound === '1') return;
    toolbar.dataset.wlBound = '1';

    var noresult = document.querySelector('[data-wlp-noresult]');
    var search = toolbar.querySelector('[data-wlp-search]');
    var state = { project: '', ship: '', q: '' };

    function apply() {
      var shown = 0;
      Array.prototype.forEach.call(scope.querySelectorAll('[data-wlp-item]'), function (item) {
        var okP = !state.project || item.getAttribute('data-project') === state.project;
        var okS = !state.ship || item.getAttribute('data-ship') === state.ship;
        var text = item.getAttribute('data-text') || item.textContent.toLowerCase();
        var okQ = !state.q || text.indexOf(state.q) !== -1;
        var show = okP && okS && okQ;
        item.hidden = !show;
        if (show) shown += 1;
      });
      Array.prototype.forEach.call(scope.querySelectorAll('[data-wlp-col]'), function (col) {
        var visible = col.querySelectorAll('[data-wlp-item]:not([hidden])').length;
        var counter = col.querySelector('[data-wlp-count]');
        if (counter) counter.textContent = visible;
        col.hidden = visible === 0;
      });
      if (noresult) noresult.hidden = shown !== 0;
    }

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.wlp-chip') : null;
      if (!btn) return;
      var group = btn.closest('.wlp-fgroup');
      if (btn.hasAttribute('data-filter-project')) state.project = btn.getAttribute('data-filter-project');
      else if (btn.hasAttribute('data-filter-ship')) state.ship = btn.getAttribute('data-filter-ship');
      else return;
      if (group) {
        Array.prototype.forEach.call(group.querySelectorAll('.wlp-chip'), function (b) { b.classList.remove('is-on'); });
      }
      btn.classList.add('is-on');
      apply();
    });

    if (search) {
      search.addEventListener('input', function () {
        state.q = search.value.trim().toLowerCase();
        apply();
      });
    }

    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('swup:contentReplaced', init);
  document.addEventListener('swup:page:view', init);
})();
