// Раздел «Продажи»: плитки, календарь, касса дня по точкам, ввод продаж и расходов, статистика, журнал, выгрузка.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { Kpi } from "@/components/kit";
import { cn } from "@/lib/utils";
import { SalesFilter, useSalesFilter } from "./filter";
import { Calendar } from "./Calendar";
import { DayCash } from "./DayCash";
import { Debts } from "./DebtsPanel";
import { SaleForm, type SaleRec } from "./SaleForm";
import { ExpenseBox } from "./ExpenseBox";
import { Stats } from "./Stats";
import { Journal } from "./Journal";
import { Photos, SettingsBox } from "./Extras";
import { downloadCsv, downloadXlsx } from "./files";
import { agg, cmpText, csvOf, ctxOf, dayCashRows, expFiltered, expVal, filtered, fmt, fname, lowerFirst, newId, prevList, sheetsOf, type SaleX, type Settings } from "./logic";

function Cmp({ cur, prev }: { cur: number; prev: number | null | undefined }) {
  const t = cmpText(cur, prev);
  return <span className={cn(t.kind === "up" && "text-plus", t.kind === "down" && "text-minus")}>{t.text || " "}</span>;
}

export function SalesPage({ d }: { d: Data }) {
  const mu = useMutations(), { F } = useSalesFilter();
  const c = useMemo(() => ctxOf(d), [d]);
  const list = useMemo(() => filtered(c, F), [c, F]);
  const ex = useMemo(() => expFiltered(c, F), [c, F]);
  const a = agg(list), pv = prevList(c, F), pa = pv ? agg(pv.list) : null;
  const expSum = ex.reduce((x, e) => x + expVal(e), 0);
  const rows = useMemo(() => dayCashRows(list, ex, c.settings.points), [list, ex, c.settings.points]);

  const [jDay, setJDay] = useState(""), [editing, setEditing] = useState<SaleX | null>(null), [xmsg, setXmsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const jRef = useRef<HTMLDivElement>(null);
  const resetKey = `${F.from}|${F.to}|${F.point}`;
  useEffect(() => setJDay(""), [resetKey]);
  const say = (t: string, bad?: boolean, ms = 5000) => { setXmsg({ t, bad }); if (t) setTimeout(() => setXmsg((m) => (m && m.t === t ? null : m)), ms); };

  const save = async (id: string | null, rec: SaleRec) => {
    const old = id ? c.sales.find((s) => s.id === id) : null, data: Record<string, unknown> = { ...(old || {}), ...rec }; delete data.id;
    setJDay(String(rec.date));
    await mu.putDoc("sales", id || newId(), data);
    if (id) setEditing(null);
  };
  const remove = (id: string) => { if (editing?.id === id) setEditing(null); mu.delDoc("sales", id).catch(() => say("Не удалось удалить.", true)); };
  const addExp = async (v: { date: string; point: string; name: string; amount: number }) => {
    await mu.putEntry(newId(), { type: "exp", name: `${v.point} за ${lowerFirst(v.name)}`, amount: v.amount, cat: "op", branch: v.point, date: v.date, source: "day", createdAt: Date.now() });
  };
  const csv = () => { const r = csvOf(c, F); if (!r.n) return say("Нет данных за выбранный период.", true); downloadCsv(r.text, fname(c, F, "prodazhi", "csv")); say("Файл сохранён"); };
  const xlsx = async () => {
    if (!list.length) return say("Нет данных за выбранный период.", true);
    say("Готовлю файл…", false, 60000);
    try { const name = fname(c, F, "prodazhi", "xlsx"); await downloadXlsx(sheetsOf(c, F), name); say("Файл сохранён: " + name); } catch { say("Не удалось выгрузить файл.", true); }
  };
  const saveSettings = async (v: Settings) => { await mu.putDoc("settings", "sales", v); toast.success("Настройки сохранены"); };
  const openDay = (day: string) => { setJDay(day); requestAnimationFrame(() => jRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · Премиум · Яшнабад · Сергели · C1</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Продажи</h1>
          <p className="text-[15px] text-muted-foreground">Выручка, чеки и касса по дням и точкам</p></div>
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] text-muted-foreground"><i className="size-2 rounded-full bg-plus" />Сохраняется автоматически</span>
      </header>
      <SalesFilter d={d} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 @5xl/main:grid-cols-4">
        <Kpi i={0} tone="primary" label="Выручка" value={fmt(a.rev) + " сум"} sub={<Cmp cur={a.rev} prev={pa && pa.rev} />} />
        <Kpi i={1} label="Чеков / позиций" value={`${fmt(a.checks)} / ${fmt(a.n)}`} sub={<Cmp cur={a.checks} prev={pa && pa.checks} />} />
        <Kpi i={2} label="Средний чек" value={fmt(a.avg) + " сум"} sub={<Cmp cur={a.avg} prev={pa && pa.avg} />} />
        <Kpi i={3} label="Б/Ч − расходы дня" value={fmt(a.cash - expSum) + " сум"} sub={`наличные ${fmt(a.cash)} · расходы ${fmt(expSum)}`} />
      </div>
      <Calendar c={c} F={F} jDay={jDay} onOpenDay={openDay} />
      <DayCash rows={rows} points={c.settings.points} F={F} />
      <Debts sales={c.sales} F={F} />
      <div className="grid gap-4 xl:grid-cols-2">
        <SaleForm sales={c.sales} settings={c.settings} editing={editing} onSave={save} onCancel={() => setEditing(null)} />
        <ExpenseBox exp={ex} settings={c.settings} onAdd={addExp} onDelete={(id) => mu.delEntry(id)} />
      </div>
      <Stats c={c} F={F} list={list} resetKey={resetKey} />
      <div ref={jRef} className="scroll-mt-4"><Journal c={c} F={F} list={list} jDay={jDay} setJDay={setJDay} editingId={editing?.id || null} onEdit={setEditing} onDelete={remove} onCsv={csv} onXlsx={xlsx} msg={xmsg} /></div>
      <Photos rows={d.rows.photos || {}} sales={c.sales} />
      <SettingsBox key={c.settings.points.join() + c.settings.cats.join() + c.settings.plan} settings={c.settings} onSave={saveSettings} />
    </div>
  );
}
