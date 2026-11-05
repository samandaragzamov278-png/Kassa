// Раздел «Касса»: месяцы, плитки, расчёт по шагам, форма расхода, анализ, журнал, Б/Ч по дням.
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Data, Entry } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { Panel } from "../pay/parts";
import { analysis, cashState, compute, fmt, kAll, kMonths, lastM, monthName, newId, recFor, recM, reserve, todayTash } from "./logic";
import { Tiles } from "./Tiles";
import { Steps } from "./Steps";
import { AddForm, type FormVal } from "./AddForm";
import { Journal } from "./Journal";
import { Articles, DayChart, Insights, Split } from "./Analysis";

export function KassaPage({ d, focus }: { d: Data; focus?: "expense" | "cash" | null }) {
  const ms = useMemo(() => kMonths(d), [d]), LM = lastM(d);
  const [sel, setSel] = useState(""), M = sel && ms.includes(sel) ? sel : LM, isLast = M === LM;
  const [editing, setEditing] = useState<Entry | null>(null), [fk, setFk] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const mu = useMutations();
  const c = useMemo(() => compute(d, M), [d, M]);
  const rec = useMemo(() => recFor(d, M), [d, M]), st = rec ? cashState(d, rec, M) : null;
  const rsv = useMemo(() => reserve(d, isLast ? null : M), [d, M, isLast]);
  const a = useMemo(() => analysis(d, M, c), [d, M, c]);
  const hasCash = !!d.cash && typeof d.cash.amount === "number", cm = hasCash ? recM(d, { amount: d.cash!.amount, at: +d.cash!.updatedAt || 0, month: d.cash!.month }) : "";
  const lastRecNote = isLast && hasCash && cm !== M ? `в этом месяце ещё не пересчитывали · последний пересчёт ${fmt(d.cash!.amount)} — за ${monthName(cm).toLowerCase()}` : isLast ? "ещё не пересчитывали" : "в этом месяце кассу не пересчитывали";
  useEffect(() => { if (focus === "expense") { formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setFk(Date.now()); } }, [focus]);

  const submit = async (v: FormVal) => {
    const e: Omit<Entry, "id"> = { type: v.type, name: v.name, amount: v.amount, cat: v.type === "inc" ? "" : v.cat, branch: v.branch, date: v.date || "" };
    if (v.type !== "inc") { e.fund = v.fund || ""; e.tag = v.tag || ""; }
    if (editing) { const { id, ...old } = editing; await mu.putEntry(id, { ...old, ...e }); setEditing(null); }
    else await mu.putEntry(newId(), { ...e, source: "manual", createdAt: Date.now() });
    if (v.saveTpl && !d.templates.some((t) => t.name.toLowerCase() === v.name.toLowerCase() && (t.type || "exp") === v.type))
      await mu.putTemplate(newId(), { type: v.type, name: v.name, amount: v.amount, cat: e.cat, branch: e.branch, order: 50, ...(v.type !== "inc" ? { fund: e.fund, tag: e.tag } : {}) });
  };
  const onFact = (e: Entry, v: number | null) => { const { id, ...next } = e; if (v == null || v === +(e.amount || 0)) delete next.fact; else next.fact = v;
    if ((typeof e.fact === "number" ? e.fact : null) === (typeof next.fact === "number" ? next.fact : null)) return; mu.putEntry(id, next).catch(() => toast.error("Не удалось сохранить факт")); };
  const xlsx = async () => {
    try {
      const X = await import("xlsx");
      const sum = [["Б/Ч Премиум", c.bcP], ["Б/Ч Яшнабад", c.bcY], ["Б/Ч C1", c.bcC], ["Б/Ч всего", c.bcT], ["+ Приходы", c.sInc], ["− Операционные расходы", -c.sOp], ["− Прочие расходы", -c.sOth],
        ["Должно быть на руках", c.expected], ["Фактическая наличка", st ? st.actual : null], ["Излишек / недостача", st ? st.actual - c.expected : null], ["Сэкономлено против плана", c.saved]];
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Показатель", "Сумма"], ...sum]), "Итог");
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(c.days.map((x) => ({ "Дата": x.d, "Премиум": x.p, "Яшнабад": x.y, "C1": x.c, "Источник": x.src }))), "Б/Ч по дням");
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet([...c.op, ...c.oth, ...c.inc, ...c.rsvExp].map((e) => ({ "Дата": e.date, "Название": e.name, "Вид": e.type === "inc" ? "приход" : e.cat === "op" ? "операционный" : "прочий", "Точка": e.branch, "Сумма": e.amount, "Факт": e.fact ?? null }))), "Записи");
      X.writeFile(wb, `Касса ${monthName(M)}.xlsx`); toast.success("Файл скачан");
    } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · наличные (Б/Ч) · Премиум, Яшнабад и C1</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Касса</h1>
          <p className="text-[15px] text-muted-foreground">Б/Ч Премиума, Яшнабада и C1 + приходы − расходы дня − прочие расходы</p></div>
        <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>
      </header>
      {ms.length > 1 && <Tabs value={M} onValueChange={setSel}><TabsList className="h-auto flex-wrap">{ms.map((m) => <TabsTrigger key={m} value={m} className="px-4 py-1.5">{monthName(m)}</TabsTrigger>)}</TabsList></Tabs>}
      <Tiles c={c} M={M} isLast={isLast} rec={rec} st={st} lastRecNote={lastRecNote} rsv={rsv}
        onCash={(v) => mu.saveCash(v, compute(d, LM).expected, LM, newId()).then(() => { toast.success("Пересчёт сохранён"); })}
        onReserve={(v, from) => mu.putEntry(newId(), { type: "inc", kind: "rsv", from, name: from === "kassa" ? "Пополнение резерва из кассы" : "Пополнение резерва со стороны", amount: v, cat: "", branch: "Общее", date: todayTash(), source: "manual", createdAt: Date.now() }).then(() => { toast.success("Резерв пополнен"); })} />
      {isLast && <div ref={formRef}><Panel title={editing ? "Изменить запись" : "Добавить расход"} note="Нажмите на шаблон, чтобы заполнить форму, поправьте сумму и дату, затем «Добавить». Итог и недостача пересчитаются сразу.">
        <AddForm templates={d.templates} editing={editing} reserveBal={reserve(d).bal} onSubmit={submit} onCancel={() => setEditing(null)} focusKey={fk}
          onDelTpl={(id) => mu.delTemplate(id).catch(() => toast.error("Не удалось удалить шаблон"))} /></Panel></div>}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Расчёт по шагам" note="Нажмите шаг, чтобы увидеть записи."><Steps c={c} rsvBal={reserve(d, isLast ? null : M).bal} /></Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Операционные и прочие"><Split c={c} /></Panel>
          <Panel title="Выводы"><Insights items={a.insights} /></Panel>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Б/Ч по дням" note="Наличные продаж Премиума, Яшнабада и C1 за каждый день месяца."><DayChart days={c.days} /></Panel>
        <Panel title="Расходы с Б/Ч по статьям"><Articles a={a} /></Panel>
      </div>
      <Panel title="Журнал записей" note="Факт — нажмите на сумму, если потратили не столько, сколько планировали.">
        <Journal list={kAll(d)} M={M} editingId={editing?.id || null} onFact={onFact}
          onEdit={(e) => { setEditing(e); setSel(LM); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }}
          onDelete={(id) => { if (editing?.id === id) setEditing(null); mu.delEntry(id).then(() => toast.success("Запись удалена")).catch(() => toast.error("Не удалось удалить")); }} />
      </Panel>
    </div>
  );
}
