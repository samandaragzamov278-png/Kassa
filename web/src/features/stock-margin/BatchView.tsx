// «Проданные из новой партии»: сколько продано и осталось по моделям и точкам, дозаказ, загрузка списка партии в коллекцию batches.
import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMutations } from "@/lib/useData";
import { pointColor } from "../analytics/base";
import type { BItem, Ctx } from "../analytics/cost";
import { batchSheets } from "../analytics/exports";
import { saveXlsx } from "../analytics/xl";
import { BarsC, DonutC, HBars, LineC } from "../analytics/charts";
import { Box, Dim, Empty, Seg, Tbl, Td, Th, Tile, Wd } from "../analytics/parts";
import { addD, dLong, dShort, fmt, newId, pctF, today } from "../analytics/util";
import { batchRest, batchSearch, batchView, curBatch, getBatchSel, itemLabel, parseSheet, setBatchSel } from "./logic";

const SHOW = 150, MORE = 300;
type Pending = { items: BItem[]; file: string; sheet: string; sheets: string[]; wb: { Sheets: Record<string, unknown> }; X: unknown };

export function BatchView({ c }: { c: Ctx }) {
  const mu = useMutations();
  const [, bump] = useState(0);
  const [pt, setPt] = useState("all"), [q, setQ] = useState(""), [view, setView] = useState("all"), [lim, setLim] = useState(SHOW);
  const [pend, setPend] = useState<Pending | null>(null), [name, setName] = useState(""), [date, setDate] = useState(today()), [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ t: string; bad?: boolean }>({ t: "" });
  const file = useRef<HTMLInputElement>(null);
  const b = curBatch(c), has = !!(b && (b.items || []).length);
  const v = useMemo(() => (b && has ? batchView(c, b, pt) : null), [c, b, has, pt]);
  const rest = useMemo(() => (v ? batchRest(v) : null), [v]);
  const sorted = useMemo(() => [...c.batches].sort((x, y) => (y.date || "").localeCompare(x.date || "")), [c]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const X = await import("xlsx"), wb = X.read(await f.arrayBuffer(), { type: "array" });
      let best: { items: BItem[]; err?: string; sheet: string } | null = null;
      wb.SheetNames.forEach((n) => { const r = parseSheet(X as never, wb.Sheets[n]); if (!best || r.items.length > best.items.length) best = Object.assign(r, { sheet: n }); });
      const bb = best as { items: BItem[]; err?: string; sheet: string } | null;
      if (!bb || !bb.items.length) { setMsg({ t: bb && bb.err ? bb.err : "В файле не нашлось позиций с количеством.", bad: true }); setPend(null); return; }
      setPend({ items: bb.items, file: f.name, sheet: bb.sheet, sheets: wb.SheetNames, wb: wb as never, X }); setMsg({ t: "" });
    } catch { setMsg({ t: "Не удалось прочитать файл. Сохраните его как .xlsx и попробуйте снова.", bad: true }); }
  };
  const pickSheet = (n: string) => {
    if (!pend) return; const r = parseSheet(pend.X as never, pend.wb.Sheets[n]);
    if (!r.items.length) { setMsg({ t: r.err || "На этом листе нет позиций.", bad: true }); return; }
    setPend({ ...pend, items: r.items, sheet: n }); setMsg({ t: "" });
  };
  const save = async () => {
    if (!pend) return;
    const doc = { name: name.trim() || pend.file.replace(/\.[^.]+$/, ""), date: date || today(), file: pend.file, createdAt: Date.now(), items: pend.items };
    if (JSON.stringify(doc).length > 240000) { setMsg({ t: "Список слишком большой для одной партии. Разделите файл на 2 части и загрузите по очереди.", bad: true }); return; }
    setBusy(true);
    try { const id = newId(); await mu.putDoc("batches", id, doc); setBatchSel(id); setPend(null); setName(""); setMsg({ t: `Партия сохранена: ${fmt(doc.items.length)} позиций.` }); toast.success("Партия сохранена"); }
    catch { setMsg({ t: "Не удалось сохранить партию. Попробуйте ещё раз.", bad: true }); } finally { setBusy(false); }
  };
  const xlsx = async () => {
    if (!b) return;
    try { await saveXlsx(batchSheets(c, b, pt), "partiya_" + (b.date || "") + ".xlsx"); toast.success("Файл скачан"); } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  const importPanel = (
    <Box title="Загрузить список новой партии" note="Excel или CSV со склада: модель или артикул, количество, цена продажи, цена покупки, группа, цвет. Столбцы найдутся по названиям, строки с количеством 0 пропускаются.">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Название партии<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Поставка 2, октябрь" className="w-[260px] max-sm:w-full" /></label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Дата прихода<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" /></label>
        <input ref={file} type="file" hidden accept=".xlsx,.xls,.xlsm,.csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="secondary" size="lg" onClick={() => file.current?.click()}><Upload />Выбрать Excel</Button>
      </div>
      {pend && (
        <div className="mt-4">
          {pend.sheets.length > 1 && <label className="mb-3 flex max-w-[260px] flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Лист
            <Select value={pend.sheet} onValueChange={pickSheet}><SelectTrigger aria-label="Лист"><SelectValue /></SelectTrigger><SelectContent>{pend.sheets.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></label>}
          <p className="mb-2 text-[13px] text-muted-foreground">Файл «{pend.file}», лист «{pend.sheet}»: <b className="text-foreground">{fmt(pend.items.length)} позиций, {fmt(pend.items.reduce((a, i) => a + i.q, 0))} шт.</b> Первые строки:</p>
          <Tbl><thead><tr><Th>Модель / наименование</Th><Th>Цвет</Th><Th>Группа</Th><Th r>Кол-во</Th><Th r>Цена продажи</Th><Th r>Цена покупки</Th></tr></thead>
            <tbody>{pend.items.slice(0, 6).map((i, k) => <tr key={k}><Td>{i.m || i.n || i.s}</Td><Td>{i.col || ""}</Td><Td>{i.g || i.c || ""}</Td><Td r>{fmt(i.q)}</Td><Td r>{i.p ? fmt(i.p) : "—"}</Td><Td r>{i.cp ? fmt(i.cp) : "—"}</Td></tr>)}</tbody></Tbl>
          <div className="mt-3 flex gap-2"><Button onClick={save} disabled={busy}>Сохранить партию</Button><Button variant="secondary" onClick={() => { setPend(null); setMsg({ t: "" }); }}>Отмена</Button></div>
        </div>
      )}
      {msg.t && <p role="status" className={cn("mt-3 text-[13px]", msg.bad ? "text-minus" : "text-plus")}>{msg.t}</p>}
    </Box>
  );

  if (!v || !b || !rest) return <><Empty>Список новой партии ещё не загружен. Загрузите Excel со складом ниже или отправьте файл Claude в чат.</Empty>{importPanel}</>;
  const pts = pt === "all" ? c.points : [pt];
  const list = batchSearch(v.items, q, view);
  const sel = getBatchSel() && sorted.some((x) => x.id === getBatchSel()) ? (getBatchSel() as string) : b.id;
  const byP: Record<string, number> = {}; v.items.forEach((i) => Object.entries(i.byPt).forEach(([k, n]) => (byP[k] = (byP[k] || 0) + n)));
  const gm: Record<string, { k: string; n: number; q: number; s: number; r: number }> = {};
  v.items.forEach((i) => { const k = i.g || i.c || "Без группы"; const o = gm[k] || (gm[k] = { k, n: 0, q: 0, s: 0, r: 0 }); o.n++; o.q += i.q; o.s += Math.min(i.sold, i.q); o.r += i.rev; });
  const gl = Object.values(gm).sort((x, y) => y.s / (y.q || 1) - x.s / (x.q || 1) || y.s - x.s);
  const dayLbls = (() => { const o: string[] = []; let d = v.start, g = 0; while (d <= v.today && g++ < 400) { o.push(d); d = addD(d, 1); } return o; })();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{v.info}</p>
        <Button variant="secondary" onClick={xlsx}><FileSpreadsheet />Выгрузить партию в Excel</Button>
      </div>
      <section className="glass flex flex-wrap items-end gap-4 rounded-[22px] p-4">
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Партия
          <Select value={sel} onValueChange={(id) => { setBatchSel(id); setLim(SHOW); bump((x) => x + 1); }}><SelectTrigger className="w-[280px] max-sm:w-[calc(100vw-5rem)]" aria-label="Партия"><SelectValue /></SelectTrigger>
            <SelectContent>{sorted.map((x) => <SelectItem key={x.id} value={x.id}>{x.name || "Партия"} · {dLong(x.date)}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Точка
          <Select value={pt} onValueChange={setPt}><SelectTrigger className="w-[160px]" aria-label="Точка"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все точки</SelectItem>{c.points.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Поиск модели<Input value={q} onChange={(e) => { setQ(e.target.value); setLim(SHOW); }} placeholder="Например: 5802 или Gucci" className="w-[240px] max-sm:w-[calc(100vw-5rem)]" /></label>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{v.cards.map((k, i) => <Tile key={k.label} c={k} i={i} hintsOn={null} />)}</div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Wd title="Продано и осталось" hintsOn={null}><DonutC items={[{ label: "Продано", value: v.SC, valTxt: fmt(v.SC) + " шт", color: "var(--primary)" }, { label: "Осталось", value: v.L, valTxt: fmt(v.L) + " шт", color: "var(--border)" }]} center={pctF(v.Q ? v.SC / v.Q : 0)} sub="продано" /></Wd>
        <Wd title="Продажи партии по точкам" hintsOn={null}><HBars items={Object.entries(byP).sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ label: k, value: n, valTxt: n + " шт", color: pointColor(c.points, k) }))} /></Wd>
        <Wd title="Группы: какая уходит быстрее" note="Процент проданного от пришедшего" hintsOn={null}><HBars items={gl.slice(0, 14).map((o) => ({ label: o.k, value: o.q ? o.s / o.q * 100 : 0, valTxt: pctF(o.q ? o.s / o.q : 0), color: "var(--chart-3)", sub: `${o.s} из ${o.q} шт` }))} /></Wd>
        <Wd title="Продажи партии по дням" note="Столбцы — штук за день" hintsOn={null} wide><BarsC labels={dayLbls.map(dShort)} vals={dayLbls.map((x) => v.byDay[x] || 0)} color="var(--chart-2)" fmtV={(x) => x + " шт"} lblV={String} /></Wd>
        <Wd title="Остаток и прогноз распродажи" note="Сплошная — фактический остаток, пунктир — прогноз при текущем темпе" hintsOn={null} wide>
          <LineC labels={rest.labels} series={[{ name: "Остаток", color: "var(--primary)", vals: rest.rest }].concat(rest.proj ? [{ name: "Прогноз", color: "var(--muted-foreground)", vals: rest.proj, dash: true } as never] : [])} /></Wd>
        <Wd title="Топ-10 моделей партии" note="По проданным штукам" hintsOn={null}><HBars rank items={[...v.items].filter((i) => i.sold).sort((x, y) => y.sold - x.sold).slice(0, 10).map((i) => ({ label: itemLabel(i), value: i.sold, valTxt: i.sold + " шт", sub: `из ${i.q}` }))} /></Wd>
      </div>
      <Box title="На дозаказ" note="Модели, которые закончились или почти закончились (осталось 20% и меньше) и при этом продавались">
        {v.ro.length ? <Tbl><thead><tr><Th>Модель</Th><Th>Группа</Th><Th r>Пришло</Th><Th r>Продано</Th><Th r>Осталось</Th><Th r>Последняя продажа</Th></tr></thead>
          <tbody>{v.ro.slice(0, 40).map((i, k) => <tr key={k}><Td>{itemLabel(i)}</Td><Td>{i.g || i.c || ""}</Td><Td r>{i.q}</Td><Td r b>{i.sold}</Td><Td r>{i.left === 0 ? <span className="text-minus">0</span> : i.left}</Td><Td r>{dShort(i.last)}</Td></tr>)}</tbody></Tbl>
          : <p className="text-[13px] text-muted-foreground">Пока ничего не заканчивается</p>}
      </Box>
      <Box title="Товары партии" note="Продажи считаются с даты прихода. Модель находится по номеру или названию в строке продажи."
        action={<Seg label="Показать" value={view} onChange={(x) => { setView(x); setLim(SHOW); }} items={[["all", "Все"], ["selling", "Продаются"], ["none", "Ни одной продажи"], ["out", "Закончились"]]} />}>
        <Tbl>
          <thead><tr><Th>Модель</Th><Th>Группа</Th><Th r>Цена</Th><Th r>Пришло</Th>{pts.map((p) => <Th key={p} r>{p}</Th>)}<Th r>Продано</Th><Th r>Осталось</Th><Th className="min-w-[110px]">Продано, %</Th><Th r>Последняя продажа</Th></tr></thead>
          <tbody>{list.slice(0, lim).map((i, k) => (
            <tr key={k}><Td>{itemLabel(i)}{i.s && i.s !== i.m ? <span className="ml-1.5 text-[12px] text-muted-foreground">{i.s}</span> : null}</Td><Td>{i.g || i.c || ""}</Td><Td r>{+(i.p || 0) ? fmt(i.p as number) : "—"}</Td><Td r>{fmt(i.q)}</Td>
              {pts.map((p) => <Td key={p} r>{i.byPt[p] ? fmt(i.byPt[p]) : <Dim />}</Td>)}<Td r b>{fmt(i.sold)}</Td><Td r>{i.left === 0 && i.q ? <span className="text-minus">0</span> : fmt(i.left)}</Td>
              <Td><div className="flex items-center gap-2"><div className="h-2 min-w-[70px] flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: Math.round(i.pct * 100) + "%" }} /></div><span className="num text-[12px] text-muted-foreground">{Math.round(i.pct * 100)}%</span></div></Td>
              <Td r>{i.last ? dShort(i.last) : <Dim />}</Td></tr>))}
            {!list.length && <tr><Td colSpan={8 + pts.length} className="py-4 text-center text-muted-foreground">Нет позиций под этот фильтр</Td></tr>}</tbody>
        </Tbl>
        {list.length > lim && <div className="mt-3 text-center"><Button variant="secondary" onClick={() => setLim((x) => x + MORE)}>Показать ещё</Button></div>}
      </Box>
      {importPanel}
    </>
  );
}
