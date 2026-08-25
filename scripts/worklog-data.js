/* 读取 publish_hexo.py 导出的 source/_data/board.json，供看板/时间线/项目页使用。
   放在站点级 scripts/ 而不是主题内，换主题时面板数据层不受影响。 */
const fs = require('fs');
const path = require('path');

let cache = null;

function load(hexoInst) {
  if (cache) return cache;
  const file = path.join(hexoInst.source_dir, '_data', 'board.json');
  let raw = { days: [], projects: [] };
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    hexoInst.log.warn('[worklog] 未读到 board.json，看板将显示为空：' + e.message);
  }
  const days = Array.isArray(raw.days) ? raw.days : [];
  const projects = Array.isArray(raw.projects) ? raw.projects : [];
  cache = { days, projects };
  return cache;
}

/* 项目维度汇总，附带最近活跃周与模块 top3 */
hexo.extend.helper.register('worklog_projects', function () {
  const { days, projects } = load(hexo);
  const weekOf = new Map();
  days.forEach((d) => {
    if (!weekOf.has(d.project)) weekOf.set(d.project, new Set());
    if (d.week) weekOf.get(d.project).add(d.week);
  });
  return projects.map((p) => ({
    name: p.name,
    days: p.days || 0,
    items: p.items || 0,
    commits: p.commits || 0,
    releases: p.releases || 0,
    first: p.first || '',
    last: p.last || '',
    weeks: weekOf.has(p.name) ? weekOf.get(p.name).size : 0,
    modules: p.modules || [],
    topModules: (p.modules || []).slice(0, 3),
    avgItems: p.days ? Math.round((p.items / p.days) * 10) / 10 : 0
  }));
});

/* 按模块聚合成看板列：每列是一个模块，列内是具体条目 */
hexo.extend.helper.register('worklog_board', function (limit) {
  const { days } = load(hexo);
  const cols = new Map();
  days.forEach((d) => {
    (d.items || []).forEach((it) => {
      const key = it.module || '未分类';
      if (!cols.has(key)) cols.set(key, { module: key, cards: [], shipped: 0, projects: new Set() });
      const col = cols.get(key);
      col.cards.push({
        text: it.text || '',
        status: it.status || '',
        shipped: !!it.shipped,
        commit: it.commit || '',
        date: d.date,
        week: d.week,
        weekday: d.weekday,
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
    .slice(0, limit || 24);
});

/* 逐日时间线，倒序，含提交与发版原文 */
hexo.extend.helper.register('worklog_timeline', function (limit) {
  const { days } = load(hexo);
  const sorted = days.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const sliced = limit ? sorted.slice(0, limit) : sorted;
  return sliced.map((d) => ({
    date: d.date,
    weekday: d.weekday || '',
    week: d.week || '',
    project: d.project || '',
    shipped: !!d.shipped,
    modules: d.modules || [],
    items: d.items || [],
    commits: d.commits || [],
    releases: d.releases || []
  }));
});

/* 全局概览数字，跨项目 */
hexo.extend.helper.register('worklog_overview', function () {
  const { days, projects } = load(hexo);
  const total = { days: days.length, items: 0, commits: 0, releases: 0 };
  const weeks = new Set();
  const modules = new Set();
  days.forEach((d) => {
    total.items += (d.items || []).length;
    total.commits += (d.commits || []).length;
    total.releases += (d.releases || []).length;
    if (d.week) weeks.add(d.week);
    (d.modules || []).forEach((m) => modules.add(m));
  });
  const shippedDays = days.filter((d) => d.shipped).length;
  return {
    projectCount: projects.length,
    weekCount: weeks.size,
    moduleCount: modules.size,
    shippedDays,
    shipRate: days.length ? Math.round((shippedDays / days.length) * 100) : 0,
    total,
    avgItems: days.length ? Math.round((total.items / days.length) * 10) / 10 : 0
  };
});
