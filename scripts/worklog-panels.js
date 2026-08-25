/* 把工作面板渲染成 Hexo 标签，主题只负责外壳。
   用法（写在 source 下任意 md 里）：
     {% worklog_dashboard %}  总览面板
     {% worklog_board %}      模块看板
     {% worklog_timeline %}   工作时间线
     {% worklog_projects %}   项目总览
*/
const fs = require('fs');
const path = require('path');

function loadBoard() {
  const file = path.join(hexo.source_dir, '_data', 'board.json');
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      days: Array.isArray(raw.days) ? raw.days : [],
      projects: Array.isArray(raw.projects) ? raw.projects : []
    };
  } catch (e) {
    hexo.log.warn('[worklog] 未读到 board.json，面板将为空：' + e.message);
    return { days: [], projects: [] };
  }
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/* 跨项目概览数字 */
function overview(data) {
  const total = { days: data.days.length, items: 0, commits: 0, releases: 0 };
  const weeks = new Set();
  const modules = new Set();
  data.days.forEach((d) => {
    total.items += (d.items || []).length;
    total.commits += (d.commits || []).length;
    total.releases += (d.releases || []).length;
    if (d.week) weeks.add(d.week);
    (d.modules || []).forEach((m) => modules.add(m));
  });
  const shippedDays = data.days.filter((d) => d.shipped).length;
  return {
    projectCount: data.projects.length,
    weekCount: weeks.size,
    moduleCount: modules.size,
    shippedDays,
    shipRate: pct(shippedDays, data.days.length),
    total,
    avgItems: data.days.length ? Math.round((total.items / data.days.length) * 10) / 10 : 0
  };
}

/* 项目维度汇总 */
function projectRows(data) {
  const weekOf = new Map();
  data.days.forEach((d) => {
    if (!weekOf.has(d.project)) weekOf.set(d.project, new Set());
    if (d.week) weekOf.get(d.project).add(d.week);
  });
  return data.projects.map((p) => ({
    name: p.name,
    days: p.days || 0,
    items: p.items || 0,
    commits: p.commits || 0,
    releases: p.releases || 0,
    first: p.first || '',
    last: p.last || '',
    weeks: weekOf.has(p.name) ? weekOf.get(p.name).size : 0,
    modules: p.modules || [],
    avgItems: p.days ? Math.round(((p.items || 0) / p.days) * 10) / 10 : 0
  }));
}

/* 按模块聚合成看板列 */
function boardCols(data, limit) {
  const cols = new Map();
  data.days.forEach((d) => {
    (d.items || []).forEach((it) => {
      const key = it.module || '未分类';
      if (!cols.has(key)) cols.set(key, { module: key, cards: [], shipped: 0, projects: new Set() });
      const col = cols.get(key);
      col.cards.push({
        text: it.text || '',
        status: it.status || '',
        shipped: !!it.shipped,
        date: d.date,
        project: d.project
      });
      if (it.shipped) col.shipped += 1;
      col.projects.add(d.project);
    });
  });
  return Array.from(cols.values())
    .map((c) => ({
      module: c.module,
      count: c.cards.length,
      shipped: c.shipped,
      projects: Array.from(c.projects),
      cards: c.cards.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    }))
    .sort((a, b) => b.count - a.count || a.module.localeCompare(b.module))
    .slice(0, limit || 40);
}

function weekRows(data) {
  const map = new Map();
  data.days.forEach((d) => {
    const k = d.week || '未归周';
    if (!map.has(k)) map.set(k, { week: k, days: 0, items: 0, commits: 0, releases: 0 });
    const w = map.get(k);
    w.days += 1;
    w.items += (d.items || []).length;
    w.commits += (d.commits || []).length;
    w.releases += (d.releases || []).length;
  });
  return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week));
}

function moduleRows(data, limit) {
  const counter = new Map();
  data.days.forEach((d) => {
    (d.items || []).forEach((it) => {
      const k = it.module || '未分类';
      counter.set(k, (counter.get(k) || 0) + 1);
    });
  });
  return Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit || 12);
}

function projectChips(projects, withStatus) {
  if (projects.length < 2 && !withStatus) return '';
  const out = ['<div class="wlp-toolbar" data-wlp-toolbar>'];
  if (projects.length > 1) {
    out.push('<div class="wlp-fgroup" role="group" aria-label="按项目筛选"><span class="wlp-flabel">项目</span>');
    out.push('<button class="wlp-chip is-on" type="button" data-filter-project="">全部</button>');
    projects.forEach((p) => {
      out.push('<button class="wlp-chip" type="button" data-filter-project="' + esc(p.name) + '">' + esc(p.name) + '</button>');
    });
    out.push('</div>');
  }
  if (withStatus) {
    out.push('<div class="wlp-fgroup" role="group" aria-label="按上线状态筛选"><span class="wlp-flabel">状态</span>');
    out.push('<button class="wlp-chip is-on" type="button" data-filter-ship="">全部</button>');
    out.push('<button class="wlp-chip" type="button" data-filter-ship="1">已上线</button>');
    out.push('<button class="wlp-chip" type="button" data-filter-ship="0">未上线</button>');
    out.push('</div>');
    out.push('<label class="wlp-search"><input type="search" placeholder="搜索内容或模块" data-wlp-search aria-label="搜索面板内容"></label>');
  }
  out.push('</div>');
  return out.join('');
}

hexo.extend.tag.register('worklog_board', function (args) {
  const data = loadBoard();
  const limit = Number(args[0]) || 40;
  const cols = boardCols(data, limit);
  const rows = projectRows(data);
  const ov = overview(data);
  if (!cols.length) return '<p class="wlp-empty">还没有条目数据，先运行 publish_hexo.py 生成 board.json。</p>';
  const out = ['<section class="wl">'];
  out.push('<p class="wlp-lead">按模块归拢每一条交付，共 <b>' + cols.length + '</b> 个模块、<b>' + ov.total.items + '</b> 条记录</p>');
  out.push(projectChips(rows, true));
  out.push('<div class="wlp-board" data-wlp-scope>');
  cols.forEach((col) => {
    out.push('<div class="wlp-col" data-wlp-col>');
    out.push('<div class="wlp-col-head"><span class="wlp-col-name" title="' + esc(col.module) + '">' + esc(col.module) + '</span><span class="wlp-col-count" data-wlp-count>' + col.count + '</span></div>');
    out.push('<div class="wlp-col-body">');
    col.cards.forEach((c) => {
      const text = (c.text + ' ' + col.module).toLowerCase();
      out.push('<article class="wlp-card" data-wlp-item data-project="' + esc(c.project) + '" data-ship="' + (c.shipped ? 1 : 0) + '" data-text="' + esc(text) + '">');
      out.push('<p class="wlp-card-text">' + esc(c.text) + '</p>');
      out.push('<div class="wlp-card-meta"><time datetime="' + esc(c.date) + '">' + esc(String(c.date).slice(5)) + '</time>');
      out.push('<span class="wlp-tag">' + esc(c.project) + '</span>');
      if (c.shipped) out.push('<span class="wlp-pill wlp-pill-ship">已发版</span>');
      else if (c.status) out.push('<span class="wlp-pill">' + esc(c.status) + '</span>');
      out.push('</div></article>');
    });
    out.push('</div></div>');
  });
  out.push('</div>');
  out.push('<p class="wlp-noresult" data-wlp-noresult hidden>没有符合条件的条目</p>');
  out.push('</section>');
  return out.join('');
});

hexo.extend.tag.register('worklog_timeline', function (args) {
  const data = loadBoard();
  const limit = Number(args[0]) || 0;
  const rows = projectRows(data);
  const sorted = data.days.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const days = limit ? sorted.slice(0, limit) : sorted;
  if (!days.length) return '<p class="wlp-empty">暂无时间线数据</p>';
  const out = ['<section class="wl">'];
  out.push('<p class="wlp-lead">逐日展开交付、提交与发版，共 <b>' + days.length + '</b> 个记录日</p>');
  out.push(projectChips(rows, false));
  out.push('<ol class="wlp-tl" data-wlp-scope>');
  days.forEach((d) => {
    const items = d.items || [];
    const commits = d.commits || [];
    const releases = d.releases || [];
    out.push('<li class="wlp-tl-day" data-wlp-item data-project="' + esc(d.project) + '" data-ship="' + (d.shipped ? 1 : 0) + '">');
    out.push('<div class="wlp-tl-dot' + (d.shipped ? ' is-ship' : '') + '" aria-hidden="true"></div>');
    out.push('<div class="wlp-tl-body">');
    out.push('<div class="wlp-tl-head"><time class="wlp-tl-date" datetime="' + esc(d.date) + '">' + esc(d.date) + '</time>');
    out.push('<span class="wlp-tl-wd">' + esc(d.weekday || '') + '</span>');
    out.push('<span class="wlp-tag">' + esc(d.project) + '</span>');
    out.push('<span class="wlp-tl-week">' + esc(d.week || '') + '</span>');
    out.push('<span class="wlp-tl-num"><b>' + items.length + '</b>交付 <b>' + commits.length + '</b>提交 <b>' + releases.length + '</b>发版</span>');
    out.push('</div>');
    if (items.length) {
      out.push('<ul class="wlp-tl-items">');
      items.forEach((it) => {
        out.push('<li><span class="wlp-mod-chip">' + esc(it.module) + '</span><span class="wlp-tl-text">' + esc(it.text) + '</span>' + (it.shipped ? '<span class="wlp-pill wlp-pill-ship">已发版</span>' : '') + '</li>');
      });
      out.push('</ul>');
    }
    if (releases.length) {
      out.push('<details class="wlp-fold"><summary>发版记录 ' + releases.length + ' 条</summary><ul class="wlp-plain">');
      releases.forEach((r) => out.push('<li>' + esc(r) + '</li>'));
      out.push('</ul></details>');
    }
    if (commits.length) {
      out.push('<details class="wlp-fold"><summary>Git 提交 ' + commits.length + ' 条</summary><ul class="wlp-plain">');
      commits.forEach((c) => out.push('<li>' + esc(String(c).replace(/`/g, '')) + '</li>'));
      out.push('</ul></details>');
    }
    out.push('</div></li>');
  });
  out.push('</ol>');
  out.push('<p class="wlp-noresult" data-wlp-noresult hidden>没有符合条件的记录</p>');
  out.push('</section>');
  return out.join('');
});

hexo.extend.tag.register('worklog_projects', function () {
  const data = loadBoard();
  const rows = projectRows(data);
  const ov = overview(data);
  const out = ['<section class="wl">'];
  out.push('<div class="wlp-metrics">');
  [
    ['项目数', ov.projectCount, '个', 'a'],
    ['累计交付', ov.total.items, '项', 'b'],
    ['主线提交', ov.total.commits, '次', 'c'],
    ['生产发版', ov.total.releases, '次', 'd'],
    ['发版日占比', ov.shipRate, '%', 'e']
  ].forEach((m) => {
    out.push('<div class="wlp-metric wlp-t' + m[3] + '"><span class="wlp-metric-k">' + m[0] + '</span><span class="wlp-metric-v">' + m[1] + '<em>' + m[2] + '</em></span></div>');
  });
  out.push('</div>');
  if (!rows.length) { out.push('<p class="wlp-empty">暂无项目数据</p></section>'); return out.join(''); }
  let maxItems = 1;
  rows.forEach((p) => { maxItems = Math.max(maxItems, p.items); });
  out.push('<div class="wlp-projgrid">');
  rows.forEach((p) => {
    out.push('<article class="wlp-projcard">');
    out.push('<div class="wlp-projcard-head"><h3>' + esc(p.name) + '</h3><span class="wlp-projrange">' + esc(p.first) + ' ~ ' + esc(p.last) + '</span></div>');
    out.push('<div class="wlp-projstats">');
    [[p.days, '记录日'], [p.weeks, '周'], [p.items, '交付'], [p.commits, '提交'], [p.releases, '发版'], [p.avgItems, '日均']]
      .forEach((s) => out.push('<span><b>' + s[0] + '</b>' + s[1] + '</span>'));
    out.push('</div>');
    out.push('<div class="wlp-bar-row"><span class="wlp-bar"><i style="width:' + pct(p.items, maxItems) + '%"></i></span><span class="wlp-bar-k">交付占比</span></div>');
    if (p.modules.length) {
      const top = p.modules[0].count || 1;
      out.push('<ul class="wlp-modlist">');
      p.modules.slice(0, 6).forEach((m) => {
        out.push('<li><span class="wlp-mod-n" title="' + esc(m.name) + '">' + esc(m.name) + '</span><span class="wlp-bar"><i style="width:' + pct(m.count, top) + '%"></i></span><span class="wlp-mod-c">' + m.count + '</span></li>');
      });
      out.push('</ul>');
    }
    out.push('</article>');
  });
  out.push('</div></section>');
  return out.join('');
});

hexo.extend.tag.register('worklog_dashboard', function () {
  const data = loadBoard();
  const ov = overview(data);
  const rows = projectRows(data);
  const weeks = weekRows(data);
  const mods = moduleRows(data, 10);
  const out = ['<section class="wl">'];
  out.push('<div class="wlp-metrics">');
  [
    ['在跟项目', ov.projectCount, '个', 'f'],
    ['记录周数', ov.weekCount, '周', 'a'],
    ['累计交付', ov.total.items, '项', 'b'],
    ['主线提交', ov.total.commits, '次', 'c'],
    ['生产发版', ov.total.releases, '次', 'd'],
    ['日均交付', ov.avgItems, '项/日', 'e']
  ].forEach((m) => {
    out.push('<div class="wlp-metric wlp-t' + m[3] + '"><span class="wlp-metric-k">' + m[0] + '</span><span class="wlp-metric-v">' + m[1] + '<em>' + m[2] + '</em></span></div>');
  });
  out.push('</div>');
  if (weeks.length) {
    let peak = 1;
    weeks.forEach((w) => { peak = Math.max(peak, w.items, w.commits, w.releases); });
    out.push('<div class="wlp-panel"><div class="wlp-panel-head"><h3>交付趋势</h3><span class="wlp-legend"><i class="wlp-d1"></i>交付<i class="wlp-d2"></i>提交<i class="wlp-d3"></i>发版</span></div>');
    out.push('<div class="wlp-chart" role="img" aria-label="按周交付、提交与发版趋势">');
    weeks.forEach((w) => {
      out.push('<div class="wlp-chart-col"><div class="wlp-bars">');
      out.push('<span class="wlp-b wlp-b1" style="height:' + pct(w.items, peak) + '%" title="交付 ' + w.items + ' 项"></span>');
      out.push('<span class="wlp-b wlp-b2" style="height:' + pct(w.commits, peak) + '%" title="提交 ' + w.commits + ' 次"></span>');
      out.push('<span class="wlp-b wlp-b3" style="height:' + pct(w.releases, peak) + '%" title="发版 ' + w.releases + ' 次"></span>');
      out.push('</div><span class="wlp-chart-x">' + esc(String(w.week).replace(/^\d{4}-/, '')) + '</span></div>');
    });
    out.push('</div></div>');
  }
  out.push('<div class="wlp-grid2">');
  out.push('<div class="wlp-panel"><div class="wlp-panel-head"><h3>周度明细</h3></div><ul class="wlp-weeklist">');
  weeks.slice().reverse().forEach((w) => {
    out.push('<li><span class="wlp-week-id">' + esc(w.week) + '</span><span class="wlp-week-num"><b>' + w.days + '</b>天 <b>' + w.items + '</b>交付 <b>' + w.commits + '</b>提交 <b>' + w.releases + '</b>发版</span></li>');
  });
  if (!weeks.length) out.push('<li class="wlp-empty">暂无周数据</li>');
  out.push('</ul></div>');
  out.push('<div class="wlp-panel"><div class="wlp-panel-head"><h3>模块热度</h3></div><ul class="wlp-modlist">');
  const topMod = mods.length ? mods[0].count : 1;
  mods.forEach((m) => {
    out.push('<li><span class="wlp-mod-n" title="' + esc(m.name) + '">' + esc(m.name) + '</span><span class="wlp-bar"><i style="width:' + pct(m.count, topMod) + '%"></i></span><span class="wlp-mod-c">' + m.count + '</span></li>');
  });
  if (!mods.length) out.push('<li class="wlp-empty">暂无模块数据</li>');
  out.push('</ul></div></div>');
  if (rows.length) {
    let maxItems = 1;
    rows.forEach((p) => { maxItems = Math.max(maxItems, p.items); });
    out.push('<div class="wlp-panel"><div class="wlp-panel-head"><h3>项目对比</h3></div><div class="wlp-projrows">');
    rows.forEach((p) => {
      out.push('<div class="wlp-projrow"><span class="wlp-projrow-n">' + esc(p.name) + '</span><span class="wlp-bar"><i style="width:' + pct(p.items, maxItems) + '%"></i></span><span class="wlp-projrow-s"><b>' + p.items + '</b>交付 · <b>' + p.releases + '</b>发版 · <b>' + p.days + '</b>天</span></div>');
    });
    out.push('</div></div>');
  }
  out.push('</section>');
  return out.join('');
});
