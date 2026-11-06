// Раздел «Линзы»: проданные очковые линзы по видам, индексам, покрытиям, брендам и точкам; маржа по видам и правка цен пары.
import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { pointColor } from "../analytics/base";
import { makeCtx } from "../analytics/cost";
import { lensKinds, lensCostView, lensView } from "./logic";
import { lensSheets, fname } from "../analytics/exports";
import { saveXlsx } from "../analytics/xl";
import { FilterBar, useFlt } from "../analytics/filter";
import { BarsC, DonutC, HBars } from "../analytics/charts";
import { Dim, Empty, Tbl, Td, Th, Tile, Wd } from "../analytics/parts";
import { fmt, fmtM, pctF } from "../analytics/util";

export function LensPage({ d }: { d: Data }) {
  const c = useMemo(() => makeCtx(d), [d]);
  const [F, setF] = useFlt();
  const v = useMemo(() => lensView(c, F), [c, F]);
  const kinds = useMemo(() => lensKinds(c, F), [c, F]);
  const cost = useMemo(() => lensCostView(c, v.rows), [c, v.rows]);
  const xlsx = async () => {
    const sh = lensSheets(c, F); if (!sh) { toast.error("Нет продаж линз за период."); return; }
    try { await saveXlsx(sh, fname(c, F, "linzy", "xlsx")); toast.success("Файл скачан"); } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · проданные очковые линзы и их виды</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight max-sm:text-[28px]">Очковые линзы</h1>
          <p className="text-[14px] text-muted-foreground">{v.period}</p>
        </div>
        <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>
      </header>
      <FilterBar c={c} F={F} set={setF} kinds={kinds} />

      {v.empty ? <Empty>За выбранный период продаж очковых линз нет. Сюда попадают только продажи категории «Очковые линзы». Контактные линзы, растворы и капли сюда не входят.</Empty> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{v.cards.map((k, i) => <Tile key={k.label} c={k} i={i} hintsOn={null} />)}</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Wd title="Наши линзы по видам" note="ET, Блок, 4в1, Star, Essilor, Seiko и другие — по количеству" hintsOn={null} wide><HBars items={v.kindBars} /></Wd>
            <Wd title="Виды линз" note="По количеству" hintsOn={null}><DonutC items={v.types} center={fmt(v.la.units)} sub="шт" /></Wd>
            <Wd title="Индекс (толщина)" note="1.50 — стандарт, 1.67 и 1.74 — тонкие для сильных диоптрий" hintsOn={null}><HBars items={v.idxBars} /></Wd>
            <Wd title="Покрытия" hintsOn={null}><HBars items={v.coatBars} /></Wd>
            <Wd title="Линзы по точкам" hintsOn={null}><HBars items={v.ptEntries.map(([k, o]) => ({ label: k, value: o.u, valTxt: o.u + " шт", color: pointColor(c.points, k), sub: fmtM(o.r) }))} /></Wd>
            <Wd title="Средняя цена по видам" hintsOn={null}><HBars items={v.avgType} /></Wd>
            {v.brandBars.length > 0 && <Wd title="Бренды" hintsOn={null}><HBars items={v.brandBars} /></Wd>}
            <Wd title="Линзы по дням" note="Сколько штук продано каждый день" hintsOn={null} wide><BarsC labels={v.byDay.days.map((x) => x.slice(8, 10) + "." + x.slice(5, 7))} vals={v.byDay.vals} color="var(--chart-3)" fmtV={(x) => x + " шт"} lblV={String} /></Wd>
          </div>
          <section className="glass min-w-0 rounded-[26px] p-5">
            <h2 className="text-[17px] font-semibold tracking-tight">Все виды проданных линз</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Вид × индекс × покрытие: сколько продано, на какую сумму и по какой средней цене</p>
            <Tbl className="mt-3">
              <thead><tr><Th>Вид</Th><Th>Индекс</Th><Th>Покрытие</Th>{c.points.map((p) => <Th key={p} r>{p}</Th>)}<Th r>Всего, шт</Th><Th r>Выручка</Th><Th r>Ср. цена</Th></tr></thead>
              <tbody>{v.table.map((o) => <tr key={o.t + o.i + o.c}><Td>{o.t}</Td><Td num>{o.i}</Td><Td>{o.c}</Td>{c.points.map((p) => <Td key={p} r>{o.pts[p] || <Dim />}</Td>)}<Td r b>{o.u}</Td><Td r>{fmt(o.r)}</Td><Td r>{fmt(o.u ? o.r / o.u : 0)}</Td></tr>)}</tbody>
              <tfoot><tr><Td colSpan={3} b>Итого</Td>{c.points.map((p) => <Td key={p} r b>{v.ptTotals[p] || ""}</Td>)}<Td r b>{v.la.units}</Td><Td r b>{fmt(v.la.rev)}</Td><Td r b>{fmt(v.la.unitPrice)}</Td></tr></tfoot>
            </Tbl>
          </section>
          {cost && <CostPanel c={c} cost={cost} />}
        </>
      )}
    </div>
  );
}

function CostPanel({ c, cost }: { c: ReturnType<typeof makeCtx>; cost: NonNullable<ReturnType<typeof lensCostView>> }) {
  const mu = useMutations();
  const [edit, setEdit] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const val = (i: number, pair: number | null | undefined) => (i in edit ? edit[i] : pair && pair > 0 ? fmt(pair) : "");
  const save = async () => {
    const nr = cost.rules.map((r, i) => { const t = (i in edit ? edit[i] : "").replace(/\D/g, ""); return Object.assign({}, r, { pair: i in edit ? (t ? +t : null) : r.pair == null ? null : r.pair }); });
    setBusy(true);
    try { await mu.putDoc("settings", "lensCost", Object.assign({}, c.lensCfg, { rules: nr, updatedAt: Date.now() })); setEdit({}); toast.success("Цены пары сохранены"); }
    catch { toast.error("Не удалось сохранить"); } finally { setBusy(false); }
  };
  return (
    <section className="glass min-w-0 rounded-[26px] p-5">
      <h2 className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-tight">Маржа по видам линз <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[11px] font-semibold text-warn">предварительно</span></h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Расчёт ещё идёт: себестоимость линз сверяется с документами поставщиков. Цена пары с НДС. Сергели — по журналу точки (расход «за линзы» дня делится на проданные пары). «≈ по цене» — вид в продаже не указан, определён по цене продажи пары.</p>
      <div className="my-4 grid gap-4 sm:grid-cols-2">
        <Tile c={{ id: 0, label: "Прибыль с линз", v: fmt(cost.gp) + " сум", d: `выручка ${fmtM(cost.revC)} − себестоимость ${fmtM(cost.cogs)}` }} hintsOn={null} />
        <Tile c={{ id: 0, label: "Маржа на линзах", v: cost.margin, d: `посчитано по ${cost.cover} выручки с линз` }} hintsOn={null} />
      </div>
      <Tbl>
        <thead><tr><Th>Вид</Th><Th r>Пар</Th><Th r>Выручка</Th><Th r>Себестоимость</Th><Th r>Прибыль</Th><Th r>Маржа</Th></tr></thead>
        <tbody>{cost.list.map((o) => <tr key={o.k}><Td>{o.k}</Td><Td r>{fmt(o.u)}</Td><Td r>{fmt(o.r)}</Td><Td r>{o.has ? fmt(o.c) : <Dim>нет цены</Dim>}</Td><Td r>{o.has ? fmt(o.kr - o.c) : "—"}</Td><Td r>{o.has && o.kr ? pctF((o.kr - o.c) / o.kr) : "—"}</Td></tr>)}</tbody>
      </Tbl>
      <details className="mt-4">
        <summary className="cursor-pointer text-[14px]"><b>Цены пары по видам</b> <span className="text-muted-foreground">· можно поправить</span></summary>
        <Tbl className="mt-2">
          <thead><tr><Th>Вид</Th><Th r>Цена пары, сум</Th><Th>Откуда цена</Th></tr></thead>
          <tbody>{cost.rules.map((r, i) => (
            <tr key={r.k + i}><Td>{r.k}</Td>
              <Td r><Input inputMode="numeric" value={val(i, r.pair)} placeholder="нет цены" aria-label={"Цена пары: " + r.k} className="num ml-auto h-8 w-36 text-right" onChange={(e) => { const t = e.target.value.replace(/\D/g, ""); setEdit((x) => ({ ...x, [i]: t ? fmt(+t) : "" })); }} /></Td>
              <Td className="text-[12px] text-muted-foreground">{r.src || ""}</Td></tr>))}</tbody>
        </Tbl>
        <div className="mt-3"><Button onClick={save} disabled={busy}>Сохранить цены</Button></div>
      </details>
    </section>
  );
}
