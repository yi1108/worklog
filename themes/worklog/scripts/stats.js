/* 构建期聚合周报指标，供面板与图表使用 */
hexo.extend.helper.register('worklog_stats', function () {
  const posts = this.site.posts.toArray();
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const weeklies = posts
    .filter((p) => p.kind === 'weekly')
    .map((p) => ({
      week: p.week || '',
      title: p.title,
      path: p.path,
      start: p.period_start || '',
      end: p.period_end || '',
      days: num(p.stat_days),
      items: num(p.stat_items),
      commits: num(p.stat_commits),
      releases: num(p.stat_releases)
    }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));

  const logs = posts.filter((p) => p.kind === 'worklog').length;

  const total = weeklies.reduce(
    (acc, w) => ({
      days: acc.days + w.days,
      items: acc.items + w.items,
      commits: acc.commits + w.commits,
      releases: acc.releases + w.releases
    }),
    { days: 0, items: 0, commits: 0, releases: 0 }
  );

  const latest = weeklies.length ? weeklies[weeklies.length - 1] : null;
  const avgItems = total.days ? (total.items / total.days) : 0;

  return {
    weeklies,
    latest,
    logs,
    total,
    weekCount: weeklies.length,
    avgItemsPerDay: Math.round(avgItems * 10) / 10
  };
});

/* 把模块名从周报正文里抽出来做热度统计 */
hexo.extend.helper.register('worklog_modules', function (limit) {
  const posts = this.site.posts.toArray().filter((p) => p.kind === 'weekly');
  const counter = new Map();
  const rowRe = /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/gm;

  posts.forEach((p) => {
    const src = p.raw || '';
    const section = src.split('## 模块分布')[1];
    if (!section) return;
    const table = section.split('##')[0];
    let m;
    while ((m = rowRe.exec(table)) !== null) {
      const name = m[1].trim();
      if (!name || name === '模块' || /^-+$/.test(name)) continue;
      counter.set(name, (counter.get(name) || 0) + Number(m[2] || 0));
    }
  });

  return Array.from(counter.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit || 12);
});
