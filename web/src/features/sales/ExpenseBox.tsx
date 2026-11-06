// «Расход дня»: форма (запись в Кассу с источником «day»), расходы за период по точкам, последние и полный список.
import { useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { Field, Pager, Sel, digits, fmtIn, usePager } from "./parts";
import { KASSA_POINTS, dShort, expTitle, expVal, fmt, pointColor, todayTash, type DayExp, type Settings } from "./logic";

const LIST = ["Такси", "Доставка", "Доставка линз", "Мастер", "Линзы", "Вода", "Моющие средства", "Хоз. нужды"];

export function ExpenseBox({ exp, settings, onAdd, onDelete }: { exp: DayExp[]; settings: Settings; onAdd: (v: { date: string; point: string; name: string; amount: number }) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [date, setDate] = useState(todayTash()), [point, setPoint] = useState(settings.points[0]), [name, setName] = useState(""), [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null), [busy, setBusy] = useState(false), [openList, setOpenList] = useState(false), [confirm, setConfirm] = useState<string | null>(null);
  const all = [...exp].sort((x, y) => (y.date || "").localeCompare(x.date || "") || (y.createdAt || 0) - (x.createdAt || 0));
  const sum = all.reduce((x, e) => x + expVal(e), 0), pg = usePager(all.length);
  const bp: Record<string, number> = {}; all.forEach((e) => (bp[e.branch as string] = (bp[e.branch as string] || 0) + expVal(e)));
  const mx = Math.max(1, ...Object.values(bp));
  const say = (t: string, bad?: boolean) => { setMsg({ t, bad }); setTimeout(() => setMsg(null), 5000); };
  const pt = settings.points.includes(point) ? point : settings.points[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim(), a = digits(amount);
    if (!n) return say("Впишите статью расхода.", true);
    if (!a) return say("Укажите сумму.", true);
    setBusy(true);
    try { await onAdd({ date: date || todayTash(), point: pt, name: n, amount: a }); setName(""); setAmount(""); say(`Расход добавлен${KASSA_POINTS.includes(pt) ? " и учтён в кассе" : ""}`); }
    catch { say("Не удалось сохранить расход.", true); } finally { setBusy(false); }
  };
  const del = (id: string) => {
    if (confirm !== id) { setConfirm(id); setTimeout(() => setConfirm((c) => (c === id ? null : c)), 3000); return; }
    setConfirm(null); onDelete(id).catch(() => say("Не удалось удалить.", true));
  };

  return (
    <Panel title="Расход дня" note="Такси, доставка, мастер, вода и т.п. Расходы Премиума, Яшнабада и C1 сразу попадают в кассу.">
      <form onSubmit={submit} autoComplete="off" className="grid gap-3 sm:grid-cols-2">
        <Field label="Дата"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Дата расхода" className="num" /></Field>
        <Field label="Точка"><Sel label="Точка расхода" value={pt} onChange={setPoint} options={settings.points} /></Field>
        <Field label="Статья" className="sm:col-span-2"><Input list="sales-dx" value={name} onChange={(e) => setName(e.target.value)} placeholder="Такси" aria-label="Статья расхода" /></Field>
        <datalist id="sales-dx">{LIST.map((n) => <option key={n} value={n} />)}</datalist>
        <Field label="Сумма, сум" className="sm:col-span-2"><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(fmtIn(e.target.value, fmt))} placeholder="50 000" aria-label="Сумма расхода" className="num" /></Field>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>Добавить расход</Button><span role="status" className={cn("text-[13px]", msg?.bad ? "text-minus" : "text-plus")}>{msg?.t}</span></div>
      </form>
      {all.length > 0 && !openList && <div className="mt-5 grid gap-3">
        <h3 className="text-[13px] font-semibold text-muted-foreground">Расходы за период по точкам</h3>
        <div className="grid gap-2">{Object.entries(bp).sort((a, b) => b[1] - a[1]).map(([k, x]) => (
          <div key={k} className="grid gap-1"><div className="flex items-center justify-between gap-2 text-[13.5px]"><span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: pointColor(k, settings.points) }} /><span className="truncate">{k}</span></span><b className="num">{fmt(x)}</b></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full" style={{ width: x / mx * 100 + "%", background: pointColor(k, settings.points) }} /></div></div>))}</div>
        <h3 className="mt-1 text-[13px] font-semibold text-muted-foreground">Последние расходы</h3>
        <div className="grid gap-1">{all.slice(0, 4).map((e) => <div key={e.id} className="flex items-baseline justify-between gap-3 text-[13.5px]"><span className="min-w-0 truncate">{dShort(e.date)} · {expTitle(e)} <span className="text-xs text-muted-foreground">{e.branch}</span></span><span className="num shrink-0">−{fmt(expVal(e))}</span></div>)}</div>
      </div>}
      <Button type="button" variant="secondary" className="mt-4 h-auto min-h-8 w-full whitespace-normal py-1.5" disabled={!all.length} onClick={() => setOpenList((o) => !o)}>
        {all.length ? <><ChevronRight className={cn("transition-transform", openList && "rotate-90")} />{openList ? "Свернуть список расходов" : `Показать расходы за период (${all.length}) · −${fmt(sum)} сум`}</> : "Расходов дня за период нет"}</Button>
      {openList && all.length > 0 && <div className="mt-2">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Точка</TableHead><TableHead>Статья</TableHead><TableHead className="text-right">Сумма</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{pg.slice(all).map((e) => (
            <TableRow key={e.id}><TableCell className="num whitespace-nowrap">{dShort(e.date)}</TableCell><TableCell>{e.branch}</TableCell><TableCell className="max-w-48 truncate">{expTitle(e)}</TableCell><TableCell className="num text-right">{fmt(expVal(e))}</TableCell>
              <TableCell className="text-right"><Button type="button" variant="ghost" size="icon-sm" aria-label={"Удалить расход " + expTitle(e)} onClick={() => del(e.id)} className={cn(confirm === e.id && "bg-minus-soft text-minus")}>{confirm === e.id ? <span className="px-1 text-[11px] font-semibold">Точно?</span> : <Trash2 />}</Button></TableCell></TableRow>))}</TableBody></Table></div>
        <Pager pg={pg} /></div>}
    </Panel>
  );
}
