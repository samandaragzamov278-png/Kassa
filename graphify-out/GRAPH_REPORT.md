# Graph Report - kassa  (2026-10-29)

## Corpus Check
- 25 files · ~74,435 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .css 4, (none) 2)

## Summary
- 373 nodes · 829 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02df6e73`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- renderAnalytics
- mobile.js
- bz.js
- build.sh script
- base.html.js
- fm.js
- billz-collect/index.ts
- billz-sync/index.ts
- enhanceSelect
- renderReport
- render
- init
- show
- rs.js
- lsSet
- attach
- prepare
- setTab
- showPreview
- renderReportManual
- mk
- dev/README.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `renderAnalytics()` - 29 edges
2. `render()` - 20 edges
3. `render()` - 16 edges
4. `init()` - 16 edges
5. `renderSales()` - 16 edges
6. `renderAll()` - 16 edges
7. `pl()` - 15 edges
8. `run()` - 14 edges
9. `renderRecon()` - 13 edges
10. `C` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Где что лежит (таблица `public.docs`: col, id, data jsonb)` --references--> `sync()`  [INFERRED]
  CLAUDE.md → dev/graph-src/base.html.js
- `openPop()` --indirect_call--> `pop()`  [INFERRED]
  dev/graph-src/base.html.js → dev/mobile/mobile.js
- `render()` --indirect_call--> `pop()`  [INFERRED]
  dev/graph-src/base.html.js → dev/mobile/mobile.js

## Import Cycles
- None detected.

## Communities (24 total, 5 thin omitted)

### Community 0 - "renderAnalytics"
Cohesion: 0.13
Nodes (33): batchStats(), curBatch(), dayCashRows(), drawStack(), fillBatchSelects(), flash(), C, lineGaps() (+25 more)

### Community 1 - "mobile.js"
Cohesion: 0.13
Nodes (39): agg(), anWidgets(), bzLoad(), bzStateLine(), bzStockCard(), calHTML(), closeSheet(), donut() (+31 more)

### Community 2 - "bz.js"
Cohesion: 0.14
Nodes (32): bindItems(), bindSeg(), collectState(), dayTable(), flatItems(), get(), itemsPanel(), kassaRows() (+24 more)

### Community 4 - "base.html.js"
Cohesion: 0.10
Nodes (19): apply(), batchMatcher(), build(), chk(), close(), confirmBtn(), fillMonths(), go() (+11 more)

### Community 5 - "fm.js"
Cohesion: 0.16
Nodes (22): card(), cfg(), days(), dayStat(), det(), editor(), fiscalDays(), gross() (+14 more)

### Community 6 - "billz-collect/index.ts"
Cohesion: 0.18
Nodes (16): addD(), bz(), catOf(), collectChecks(), collectStock(), collectTransfers(), CORS, isoD() (+8 more)

### Community 7 - "billz-sync/index.ts"
Cohesion: 0.19
Nodes (17): bz(), clean(), CORS, fmt(), getAll(), isoD(), login(), payKind() (+9 more)

### Community 8 - "enhanceSelect"
Cohesion: 0.14
Nodes (16): Где что лежит (таблица `public.docs`: col, id, data jsonb), Карта кода (Graphify), Касса Оптики — инструкции для Claude, Код, Правила работы, closePop(), count(), deco() (+8 more)

### Community 9 - "renderReport"
Cohesion: 0.16
Nodes (15): applyLocal(), del(), put(), renderReport(), rpAdd(), rpBuildDays(), rpCalc(), rpExport() (+7 more)

### Community 10 - "render"
Cohesion: 0.15
Nodes (15): applyTpl(), article(), askDelete(), bcDays(), cashState(), compute(), kMonths(), render() (+7 more)

### Community 11 - "init"
Cohesion: 0.24
Nodes (12): applyPreset(), fillPhPoint(), fillSelects(), init(), lsGet(), phMsg(), putSale(), renderPhotos() (+4 more)

### Community 12 - "show"
Cohesion: 0.33
Nodes (10): isDark(), logoMarkup(), part(), show(), A(), applyTheme(), destroy(), exit() (+2 more)

### Community 13 - "rs.js"
Cohesion: 0.50
Nodes (7): byMonth(), calc(), chart(), days(), months(), render(), xlsx()

### Community 14 - "lsSet"
Cohesion: 0.25
Nodes (8): delSale(), lsSet(), plStore(), renderPicker(), rpFlash(), rpMsg(), rpSave(), saveSel()

### Community 16 - "attach"
Cohesion: 0.60
Nodes (5): attach(), close(), pick(), place(), render()

### Community 17 - "prepare"
Cohesion: 0.33
Nodes (5): compress(), kindOf(), loadScript(), prepare(), uploadFiles()

### Community 18 - "setTab"
Cohesion: 0.33
Nodes (6): fillCatSel(), lensData(), lensInfo(), lensKind(), setStView(), setTab()

### Community 19 - "showPreview"
Cohesion: 0.40
Nodes (5): bMsg(), mapHeader(), parseSheet(), saveBatch(), showPreview()

### Community 20 - "renderReportManual"
Cohesion: 0.40
Nodes (5): renderReportManual(), rpField(), rpGNmap(), rpPrevDoc(), rpTQ()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pop()` connect `mobile.js` to `attach`, `enhanceSelect`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Should `renderAnalytics` be split into smaller, more focused modules?**
  _Cohesion score 0.12525252525252525 - nodes in this community are weakly interconnected._
- **Why does `openPop()` connect `enhanceSelect` to `mobile.js`, `base.html.js`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `mobile.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12692307692307692 - nodes in this community are weakly interconnected._
- **Why does `run()` connect `billz-sync/index.ts` to `base.html.js`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Should `bz.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `build.sh script` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._