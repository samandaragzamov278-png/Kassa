// Раздел «Аналитика»: одна страница со всеми показателями (59 плиток и графиков) за выбранный период, включение и выключение показателей.
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { pointColor } from "./base";
import { makeCtx } from "./cost";
import { buildAnalytics, type Widget } from "./logic";
import { ALL_IDS, METRICS, MHINT } from "./texts";
import { analyticsSheets, fname } from "./exports";
import { saveXlsx } from "./xl";
import { FilterBar, useFlt } from "./filter";
import { BarsC, DonutC, GroupBarsC, HBars, LineC, None, ParetoC, WaterfallC } from "./charts";
import { Dim, Empty, MBar, Sub, Sw, Tbl, Td, Th, Tile, Wd } from "./parts";
import { dShort, fmt, fmtM, pctF, pl } from "./util";

const OFFKEY = "an.hints";
const readHints = () => { try { return localStorage.getItem(OFFKEY) !== "0"; } catch { return true; } };
const WDN = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function AnalyticsPage({ d }: { d: Data }) {
  const c = useMemo(() => makeCtx(d), [d]);
  const mu = useMutations();
  const [F, setF] = useFlt();
  const [pgCat, setPgCat] = useState("Оправы");
  const [hintsOn, setHints] = useState(readHints);
  const [pickOpen, setPickOpen] = useState(false);
  const [loc, setLoc] = useState<number[] | null>(null);
  const off = loc ?? c.analyticsOff ?? [];
  const sel = useMemo(() => new Set(ALL_IDS.filter((i) => !off.includes(i))), [off]);
  const m = useMemo(() => buildAnalytics(c, F, (id) => sel.has(id), pgCat), [c, F, sel, pgCat]);

  const saveSel = async (next: Set<number>) => {
    const o = ALL_IDS.filter((i) => !next.has(i)); setLoc(o);
    try { await mu.putDoc("settings", "analytics3", { off: o }); } catch { toast.error("Не удалось сохранить выбор показателей"); } finally { setLoc(null); }
  };
  const toggleHints = (v: boolean) => { setHints(v); try { localStorage.setItem(OFFKEY, v ? "1" : "0"); } catch { /* нет хранилища */ } };
  const xlsx = async () => {
    const sh = analyticsSheets(c, F); if (!sh) { toast.error("Нет данных за выбранный период."); return; }
    try { await saveXlsx(sh, fname(c, F, "analitika", "xlsx")); toast.success("Файл скачан"); } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  const wd = m.widgets, out: React.ReactNode[] = [];
  for (let i = 0; i < wd.length; i++) {
    const w = wd[i];
    if (w.group === "trio") {
      const grp: Widget[] = []; while (i < wd.length && wd[i].group === "trio") grp.push(wd[i++]); i--;
      out.push(<div key={"trio" + w.ids[0]} className="grid gap-4 md:col-span-2 md:grid-cols-3 xl:col-span-3">{grp.map((g) => <Wd key={g.ids[0]} title={g.title} note={g.note} hintsOn={hintsOn}>{renderW(g, c.points, setPgCat)}</Wd>)}</div>);
    } else out.push(<Wd key={w.ids[0] + w.title} title={w.title} note={w.kind === "owner" && !w.o ? undefined : w.note} hintsOn={hintsOn} wide={w.wide}>{renderW(w, c.points, setPgCat)}</Wd>);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · статистика продаж в графиках</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight max-sm:text-[28px]">Аналитика продаж</h1>
          <p className="text-[14px] text-muted-foreground">{m.period}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[13px]"><Switch checked={hintsOn} onCheckedChange={toggleHints} aria-label="Пояснения" />Пояснения</label>
          <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>
        </div>
      </header>

      <Tabs value={F.point} onValueChange={(point) => setF({ point })} className="max-w-full">
        <TabsList className="h-auto max-w-full flex-wrap">{[["all", "Общий"], ...c.points.map((p) => [p, p])].map(([v, l]) => <TabsTrigger key={v} value={v} className="px-4 py-1.5"><i className="mr-1.5 size-2 rounded-full" style={{ background: v === "all" ? "var(--primary)" : pointColor(c.points, v) }} />{l}</TabsTrigger>)}</TabsList>
      </Tabs>
      <FilterBar c={c} F={F} set={setF} cats withPoint={false} />

      <section className="glass rounded-[26px] p-5">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setPickOpen((x) => !x)} aria-expanded={pickOpen}>
          <span><b className="text-[15px]">Показатели: включить или выключить</b> <span className="ml-1 text-[13px] text-muted-foreground">· включено {sel.size} из {ALL_IDS.length}</span></span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition", pickOpen && "rotate-180")} />
        </button>
        {pickOpen && (
          <div className="mt-4 flex flex-col gap-5">
            {METRICS.map(([g, items]) => (
              <div key={g}>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g}</div>
                <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {items.map(([id, nm]) => (
                    <label key={id} className="flex cursor-pointer items-start gap-3">
                      <Switch checked={sel.has(id)} onCheckedChange={(v) => { const s = new Set(sel); if (v) s.add(id); else s.delete(id); saveSel(s); }} aria-label={nm} className="mt-0.5" />
                      <span className="text-[13.5px] leading-snug">{nm}{MHINT[id] && <small className="block text-[12px] text-muted-foreground">{MHINT[id]}</small>}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => saveSel(new Set(ALL_IDS))}>Включить все</Button>
              <Button variant="secondary" onClick={() => saveSel(new Set())}>Выключить все</Button>
            </div>
          </div>
        )}
      </section>

      {m.empty ? <Empty>Для аналитики нужны продажи за выбранный период. Внесите их на вкладке «Продажи».</Empty>
        : !sel.size ? <Empty>Все показатели выключены. Включите нужные в списке выше.</Empty>
        : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{m.cards.map((k, i) => <Tile key={k.id + k.label} c={k} i={i} hintsOn={hintsOn} />)}</div>
            <div className="grid grid-flow-row-dense gap-4 md:grid-cols-2 xl:grid-cols-3">{out.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</div>
          </>
        )}
    </div>
  );
}

// ---------- содержимое виджетов ----------
function renderW(w: Widget, points: string[], setPgCat: (c: string) => void): React.ReactNode {
  switch (w.kind) {
    case "line": return <LineC labels={w.labels} series={w.series} />;
    case "donut": return <DonutC items={w.items} center={w.center} sub={w.sub} />;
    case "groupBars": return <GroupBarsC labels={w.labels} series={w.series} />;
    case "hbars": return <HBars items={w.items} rank={w.rank} dot={w.dot} />;
    case "expenses": return <><Sub>По точкам</Sub><HBars items={w.byPoint} /><Sub>По статьям</Sub><HBars items={w.byArt} /></>;
    case "waterfall": return w.steps ? <WaterfallC steps={w.steps} /> : <None />;
    case "bars": {
      const signed = w.vk === "signed", qty = w.vk === "qty";
      return <BarsC labels={w.labels} vals={w.vals} colors={w.colors} color={w.color} hl={w.hl}
        fmtV={signed ? (v) => (v < 0 ? "недостача " : "излишек ") + fmt(Math.abs(v)) : qty ? (v) => v + " шт" : fmt}
        lblV={signed ? (v) => (v < 0 ? "−" : "+") + fmtM(Math.abs(v)) : qty ? String : fmtM} h={190} />;
    }
    case "ranges": {
      if (!w.rows.length) return <None />;
      const mx = Math.max(1, ...w.rows.map((o) => o.avg));
      return (
        <div className="flex flex-col gap-3.5">
          {w.rows.map((o) => (
            <div key={o.k} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate text-[13.5px]"><Sw color={o.color} />{o.k}</span><b className="num text-[13.5px]">{fmt(o.avg)}</b></div>
              <div className="relative h-2 rounded-full bg-muted">
                <span className="absolute top-0 h-full rounded-full bg-foreground/15" style={{ left: o.min / mx * 100 + "%", width: Math.max(0.5, (Math.min(o.max, mx) - o.min) / mx * 100) + "%" }} />
                <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background" style={{ left: Math.min(100, o.avg / mx * 100) + "%", background: o.color }} />
              </div>
              <div className="text-[12px] text-muted-foreground">{fmt(o.u)} ед. · от {fmt(o.min)} до {fmt(o.max)} · выручка {fmtM(o.r)}</div>
            </div>
          ))}
        </div>
      );
    }
    case "top": {
      if (!w.rows.length) return <None />;
      const mx = Math.max(1, ...w.rows.map((o) => o[w.by]));
      return (
        <div className="flex flex-col gap-3.5">
          {w.rows.map((o, i) => (
            <div key={o.k} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[13.5px]"><span className={cn("num grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold", i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</span><span className="truncate">{o.k}</span>{o.cat && <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{o.cat}</span>}</span>
                <b className="num shrink-0 text-[13.5px]">{w.by === "r" ? fmt(o.r) : fmt(o.u) + " шт"}</b>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: o[w.by] / mx * 100 + "%", background: w.by === "r" ? "var(--primary)" : "var(--chart-3)" }} /></div>
              <div className="text-[12px] text-muted-foreground">{w.by === "r" ? `${fmt(o.u)} шт · ср. цена ${fmt(o.u ? o.r / o.u : 0)}` : `выручка ${fmt(o.r)} · ср. цена ${fmt(o.u ? o.r / o.u : 0)}`} · {pctF(w.tot ? o[w.by] / w.tot : 0)} {w.by === "r" ? "выручки" : "всех единиц"}</div>
            </div>
          ))}
        </div>
      );
    }
    case "pg": {
      const mxu = Math.max(1, ...w.bands.map((o) => o.u)), best = w.bands[w.best];
      return (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Категория">
            {[["all", "Все"], ...w.cats.map((x) => [x, x])].map(([v, l]) => <button key={v} type="button" aria-pressed={w.cat === v} onClick={() => setPgCat(v)} className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium transition", w.cat === v ? "bg-primary text-primary-foreground" : "glass-inner text-muted-foreground hover:text-foreground")}>{l}</button>)}
          </div>
          {w.U ? <>
            <p className="mb-3 text-[13px] text-muted-foreground">Больше всего покупают в группе <b className="text-foreground">{best.lbl}</b>: {fmt(best.u)} шт ({pctF(best.u / w.U)}) на {fmt(best.r)} сум. Цена — за одну единицу после скидки.</p>
            <Tbl><thead><tr><Th>Ценовая группа</Th><Th r>Шт</Th><Th className="min-w-[120px]">Доля в штуках</Th><Th r>Выручка</Th><Th>Чаще всего покупают</Th></tr></thead>
              <tbody>{w.bands.map((o, i) => (
                <tr key={o.lbl} className={i === w.best ? "bg-primary/5" : ""}>
                  <Td b>{o.lbl}</Td><Td r>{o.u ? fmt(o.u) : <Dim />}</Td>
                  <Td><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: o.u / mxu * 100 + "%" }} /></div><span className="num text-[12px] text-muted-foreground">{o.u ? pctF(o.u / w.U) : ""}</span></div></Td>
                  <Td r>{o.r ? fmt(o.r) : <Dim />}</Td>
                  <Td className="text-[12px] text-muted-foreground">{o.top.map(([k, v]) => <span key={k} className="mr-2 inline-block">{k} <b className="text-foreground">×{v}</b></span>)}{!o.top.length && "—"}</Td>
                </tr>))}</tbody></Tbl></> : <None />}
        </>
      );
    }
    case "pareto": return <ParetoC items={w.items} />;
    case "lost": return w.rows.length
      ? <Tbl><thead><tr><Th>Товар</Th><Th r>Было ед.</Th><Th r>Было выручки</Th><Th r>Последняя продажа</Th></tr></thead><tbody>{w.rows.map((o) => <tr key={o.k}><Td>{o.k}</Td><Td r>{o.u}</Td><Td r>{fmt(o.r)}</Td><Td r>{dShort(o.last)}</Td></tr>)}</tbody></Tbl>
      : <p className="text-[13px] text-muted-foreground">Таких товаров нет{w.hist ? "" : ": нужна история продаж до периода"}.</p>;
    case "marginPts": return w.has ? (
      <>
        <Tbl>
          <thead><tr><Th>Точка</Th><Th r>Выручка</Th><Th r>Посчитано</Th><Th r>Себестоимость</Th><Th r>Прибыль</Th><Th r className="min-w-[130px]">Маржа</Th><Th r>Покрытие</Th><Th>Самая прибыльная категория</Th></tr></thead>
          <tbody>{w.rows.map((o) => (
            <tr key={o.k}><Td><Sw color={pointColor(points, o.k)} /><b>{o.k}</b></Td><Td r>{fmt(o.all)}</Td><Td r>{fmt(o.rev)}</Td><Td r>{fmt(o.cogs)}</Td><Td r b>{fmt(o.gp)}</Td><Td r><MBar v={o.m} /></Td><Td r className="text-muted-foreground">{pctF(o.cov)}</Td>
              <Td>{o.tc ? <>{o.tc.k} <span className="text-muted-foreground">· {fmtM(o.tc.gp)} прибыли</span></> : <Dim>нет цен покупки</Dim>}</Td></tr>))}</tbody>
          <tfoot><tr><Td b>Итого</Td><Td r b>{fmt(w.T.all)}</Td><Td r b>{fmt(w.T.rev)}</Td><Td r b>{fmt(w.T.cogs)}</Td><Td r b>{fmt(w.T.gp)}</Td><Td r b>{pctF(w.T.rev ? w.T.gp / w.T.rev : null)}</Td><Td r b>{pctF(w.T.all ? w.T.rev / w.T.all : 0)}</Td><Td /></tr></tfoot>
        </Tbl>
        <div className="mt-4"><HBars dot items={w.rows.filter((o) => o.rev).map((o) => ({ label: o.k, value: o.gp, valTxt: fmt(o.gp) + " · " + pctF(o.m), color: pointColor(points, o.k), sub: "прибыль" }))} /></div>
      </>) : <p className="text-[13px] text-muted-foreground">Нет цен покупки.</p>;
    case "owner": return <Owner w={w} />;
    case "heat":
      return (
        <>
          <Tbl>
            <thead><tr><Th>Точка</Th>{WDN.map((x) => <Th key={x} r>{x}</Th>)}</tr></thead>
            <tbody>{w.pts.map((p, pi) => (
              <tr key={p}><Td>{p}</Td>{w.avg[pi].map((v, i) => {
                const o = v ? 0.12 + 0.78 * (v / w.hmax) : 0, b = w.best && w.best[pi] === i && v;
                return <td key={i} title={`${p}: в среднем ${fmt(v)} сум`} className="num border-b border-border/60 px-2 py-2 text-center text-[12px]" style={{ background: `color-mix(in srgb, var(--primary) ${Math.round(o * 100)}%, transparent)`, color: o > 0.55 ? "#fff" : undefined, outline: b ? "2px solid var(--warn)" : undefined, outlineOffset: -2 }}>{v ? fmtM(v) : "—"}</td>;
              })}</tr>))}</tbody>
          </Tbl>
          {w.showBest && w.best && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">{w.pts.map((p, pi) => <span key={p}><Sw color={pointColor(points, p)} />{p}: <b>{WDN[w.best![pi]]}</b> · {fmtM(w.avg[pi][w.best![pi]])} в среднем</span>)}</div>}
        </>
      );
    case "reorder": return <Tbl><thead><tr><Th>Модель</Th><Th r>Пришло</Th><Th r>Продано</Th><Th r>Осталось</Th></tr></thead><tbody>{w.rows.map((i) => <tr key={i.k}><Td>{[i.m || i.n || i.s, i.col].filter(Boolean).join(" · ")}</Td><Td r>{i.q}</Td><Td r b>{i.sold}</Td><Td r>{i.left === 0 ? <span className="text-minus">0</span> : i.left}</Td></tr>)}</tbody></Tbl>;
    case "text": return <p className="text-[13px] text-muted-foreground">{w.text}</p>;
  }
}

function Owner({ w }: { w: Extract<Widget, { kind: "owner" }> }) {
  const o = w.o;
  if (!o) return <p className="text-[13px] text-muted-foreground">Считается только за {w.months.length ? w.months.map((m) => ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"][+m.slice(5, 7) - 1]).join(", ") : "месяцы из отчёта"} — по вашему отчёту. Выберите этот месяц в фильтре.</p>;
  const seg = ([["Расходы", o.op, "var(--chart-4)"], ["Кредит", o.credit, "var(--chart-5)"], ["Налог", o.tax, "var(--minus)"], ["Менеджер", o.mgr ? o.mgr.a : 0, "var(--chart-2)"], ["Собственнику", Math.max(0, o.owner), "var(--plus)"]] as [string, number, string][]).filter((x) => x[1] > 0);
  const tot = seg.reduce((x, y) => x + y[1], 0) || 1;
  const ln = (l: string, v: number | null, cls?: string, sub?: string) => <tr key={l} className={cls}><Td>{l}{sub && <small className="mt-0.5 block text-[12px] font-normal text-muted-foreground">{sub}</small>}</Td><Td r className="whitespace-nowrap">{v == null ? "—" : (v < 0 ? "−" : "") + fmt(Math.abs(v))}</Td></tr>;
  const S = "font-semibold bg-muted/50";
  return (
    <>
      {o.gp <= 0 ? <p className="text-[13px] text-muted-foreground">Валовая прибыль не посчитана — нет цен покупки.</p> : (
        <>
          <div className="flex h-3.5 overflow-hidden rounded-full" role="img" aria-label="Куда уходит валовая прибыль">{seg.map(([l, v, col]) => <i key={l} title={`${l}: ${fmt(v)}`} style={{ flex: v / tot, background: col }} />)}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">{seg.map(([l, v, col]) => <span key={l}><Sw color={col} />{l} <b>{pctF(v / o.gp)}</b></span>)}{o.owner < 0 && <span className="text-minus">не хватает {fmt(-o.owner)} сум</span>}</div>
        </>
      )}
      <Tbl className="mt-3"><tbody>
        {ln("Выручка", o.rev, "", "все точки")}
        {ln("Себестоимость проданного", o.gp > 0 ? -(o.rev - o.gp) : null, "", o.gp > 0 ? `посчитано по ${pctF(o.cover)} выручки${o.cover < 0.995 ? ", остальное — по средней марже" : ""}` : "нет цен покупки")}
        {ln("Валовая прибыль", o.gp, S)}
        {ln("Расходы", -o.op, "", `${o.n} ${pl(o.n, "строка", "строки", "строк")} из Кассы, резерва и р/с; без закупки товара, вложений в C1 и перемещений`)}
        {o.credit ? ln("Платежи по кредиту", -o.credit, "", "по выписке") : null}
        {o.tp ? ln(`Налог с оборота ${o.tp}%`, -o.tax, "", `с безнала месяца, платится в следующем месяце${o.taxPaid ? ` · в этом месяце уплачено ${fmt(o.taxPaid)} за прошлый` : ""}`) : null}
        {ln("Прибыль до доли менеджера", o.before, S)}
        {o.mgr ? ln(`Доля менеджера ${o.mgr.share}%`, -o.mgr.a, "", `от прибыли ${o.mgr.pts.join(" + ")}: база ${fmt(o.mgr.base)}${o.mgr.adv ? ` · выплачено авансом ${fmt(o.mgr.adv)}` : ""}`) : null}
        {ln("Остаётся собственнику", o.owner, S + " text-plus")}
      </tbody></Tbl>
      {o.top.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-[13px] font-medium">Самые крупные расходы месяца</summary>
        <div className="mt-2 flex flex-col gap-1.5">{o.top.slice(0, 8).map((x, i) => <div key={i} className="flex justify-between gap-3 text-[13px]"><span className="min-w-0">{dShort(x.d)} · <span className="text-muted-foreground">{x.f}</span> {x.n}</span><b className="num shrink-0">{fmt(x.a)}</b></div>)}</div></details>}
      <p className="mt-3 text-[12.5px] text-muted-foreground">Не вошло в прибыль: закупка товара {fmt(o.goods)} (уже в себестоимости), вложения в C1 {fmt(o.inv)}. Деньги считаются по дате оплаты.</p>
    </>
  );
}
