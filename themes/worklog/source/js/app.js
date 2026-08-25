(function () {
  var KEY = 'worklog-theme';
  var root = document.documentElement;

  function apply(mode) {
    root.setAttribute('data-theme', mode);
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved) {
    apply(saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    apply('dark');
  }

  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  // 目录跟随阅读位置高亮
  var toc = document.getElementById('toc');
  if (!toc) return;
  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var targets = links.map(function (a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    return { link: a, el: document.getElementById(id) };
  }).filter(function (t) { return t.el; });

  function onScroll() {
    var pos = window.scrollY + 96;
    var current = targets[0];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.offsetTop <= pos) current = targets[i];
    }
    targets.forEach(function (t) {
      var li = t.link.parentNode;
      if (li) li.classList.toggle('active', t === current);
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();
})();
