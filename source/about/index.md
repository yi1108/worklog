---
title: 关于
date: 2026-08-20 09:00:00
comments: false
---

## 工作记录

基于 **Obsidian + Hexo + Redefine 主题** 的工作记录站点，用于沉淀周报、交付跟踪与项目面板。

### 技术栈

- **笔记端**：Obsidian（`01-日志` / `02-周报` / `03-项目` / `04-面板`）
- **数据流水线**：Python 脚本读取 xlsx 周报 → 生成 Markdown 与 `board.json`
- **站点生成**：Hexo + Redefine v2.9 主题，面板以站点级自定义标签注入
- **部署**：Vercel 自动部署，自定义域名 [worklog.yizone.top](https://worklog.yizone.top)

### 面板说明

| 页面 | 路径 | 用途 |
| --- | --- | --- |
| 工作面板 | `/dashboard/` | 指标总览 + 交付趋势 + 周度/模块/项目对比 |
| 模块看板 | `/board/` | 按模块归拢交付，支持项目/状态筛选与搜索 |
| 时间线 | `/timeline/` | 逐日时间线，含发版与 Git 提交折叠 |
| 项目总览 | `/projects/` | 多项目指标卡 + 模块分布 |

### 仓库

- GitHub: [yi1108/worklog](https://github.com/yi1108/worklog)
