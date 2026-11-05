// Журнал записей: по месяцам, фильтры, факт вместо плана прямо в строке, изменить/удалить.
import { useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineNumber } from "@/components/Inline";
import { cn } from "@/lib/utils";
import type { Entry } from "@/lib/types";
import { dShort, fmt, fromRsv, hasFact, isBc, isRsvIn, monthName, tagOf, val } from "./logic";
import { pl } from "../pay/logic";

type F = "all" | "op" | "oth" | "inc" | "rsv";
const FILTERS: [F, string][] = [["all", "Все"], ["op", "Операционные"], ["oth", "Прочие"], ["inc", "Приходы"], ["rsv", "С резерва"]];
const byDate = (a: Entry, b: Entry) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0);
const SRC: Record<string, string> = { excel: "Excel", photo: "записка", nal: "расходы с налички", day: "отчёт дня" };

function Pill({ e }: { e: Entry }) {
  const p = (cls: string, t: string, title?: string) => <span title={title} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", cls)}>{t}</span>;
  if (isBc(e)) return p("bg-plus-soft text-plus", "приход · Б/Ч дня", "Остаток Б/Ч дня: уже учтён в строке Б/Ч, второй раз не прибавляется");
  if (isRsvIn(e)) return p("bg-warn-soft text-warn", `в резерв · ${e.from === "kassa" ? "из кассы" : "со стороны"}`);
  if (e.type === "inc") return p("bg-plus-soft text-plus", "приход");
  return <span className="flex flex-wrap gap-1">{p(e.cat === "op" ? "bg-primary/12 text-primary" : "bg-warn-soft text-warn", e.cat === "op" ? "операционный" : "прочий")}{fromRsv(e) && p("bg-warn-soft text-warn", "с резерва")}</span>;
}

type Props = { list: Entry[]; M: string; editingId: string | null; onEdit: (e: Entry) => void; onDelete: (id: string) => void; onFact: (e: Entry, v: number | null) => void };

export function Journal({ list, M, editingId, onEdit, onDelete, onFact }: Props) {
  const [f, setF] = useState<F>("all"), [open, setOpen] = useState<Set<string>>(new Set([M])), [all, setAll] = useState<Set<string>>(new Set()), [confirm, setConfirm] = useState<string | null>(null);
  let L = [...list].sort((a, b) => -byDate(a, b));
  if (f === "op") L = L.filter((e) => e.type !== "inc" && e.cat === "op"); if (f === "oth") L = L.filter((e) => e.type !== "inc" && e.cat !== "op");
  if (f === "inc") L = L.filter((e) => e.type === "inc" && !isRsvIn(e)); if (f === "rsv") L = L.filter((e) => isRsvIn(e) || fromRsv(e));
  const byM: Record<string, Entry[]> = {}; L.forEach((e) => { const m = (e.date || "").slice(0, 7) || "—"; (byM[m] ||= []).push(e); });
  const months = Object.keys(byM).sort().reverse(), LIM = 10;
  const tg = (s: Set<string>, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; };
  const cur = byM[M] || [];
  const s = cur.filter((e) => !isBc(e)).reduce((a, e) => a + (e.type === "inc" ? 1 : -1) * +(e.amount || 0), 0), sf = cur.filter((e) => !isBc(e)).reduce((a, e) => a + (e.type === "inc" ? 1 : -1) * val(e), 0);
  const sd = cur.reduce((a, e) => a + (e.type !== "inc" && hasFact(e) ? +(e.amount || 0) - (e.fact as number) : 0), 0);
  const del = (id: string) => { if (confirm === id) { onDelete(id); setConfirm(null); } else { setConfirm(id); setTimeout(() => setConfirm((c) => (c === id ? null : c)), 3000); } };
  return (
    <div>
      <Tabs value={f} onValueChange={(v) => setF(v as F)} className="mb-3"><TabsList className="flex-wrap">{FILTERS.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}</TabsList></Tabs>
      {!L.length && <p className="text-[13px] text-muted-foreground">Записей нет.</p>}
      <div className="flex flex-col">
        {months.map((m) => { const arr = byM[m], on = open.has(m), shown = all.has(m) ? arr : arr.slice(0, LIM);
          const exp = arr.filter((e) => e.type !== "inc").reduce((a, e) => a + val(e), 0), inc = arr.filter((e) => e.type === "inc" && !isBc(e)).reduce((a, e) => a + val(e), 0);
          return (
            <div key={m} className="border-b border-border">
              <button type="button" onClick={() => setOpen((x) => tg(x, m))} aria-expanded={on} className="flex w-full items-center gap-2 py-3 text-left">
                <ChevronRight className={cn("size-4 transition-transform", on && "rotate-90")} /><b>{m === "—" ? "Без даты" : monthName(m)}</b>
                <span className="text-[13px] text-muted-foreground">· {arr.length} {pl(arr.length, "запись", "записи", "записей")} · расходы −{fmt(exp)}{inc ? ` · приходы +${fmt(inc)}` : ""}</span></button>
              {on && <div className="pb-2">
                <div className="grid grid-cols-[60px_minmax(0,1fr)_150px_100px_120px_150px_80px] gap-2 px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase max-xl:hidden">
                  <span>Дата</span><span>Название</span><span>Вид</span><span>Точка</span><span className="text-right">Сумма</span><span className="text-right">Факт</span><span /></div>
                {shown.map((e) => { const isExp = e.type !== "inc", d = hasFact(e) ? +(e.amount || 0) - (e.fact as number) : 0; return (
                  <div key={e.id} className={cn("grid grid-cols-[60px_minmax(0,1fr)_150px_100px_120px_150px_80px] items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-muted/70 max-xl:grid-cols-[52px_minmax(0,1fr)_auto]", e.id === editingId && "bg-accent")}>
                    <span className="num text-[13px] text-muted-foreground max-xl:row-span-2">{dShort(e.date)}</span>
                    <span className="min-w-0"><span className="block truncate font-medium">{e.name}</span><span className="text-xs text-muted-foreground">{isExp && <span className="mr-1 rounded bg-muted px-1.5 py-0.5">{tagOf(e)}</span>}{SRC[e.source || ""] ? "· " + SRC[e.source || ""] : ""}</span></span>
                    <span className="max-xl:hidden"><Pill e={e} /></span>
                    <span className="text-[13px] text-muted-foreground max-xl:hidden">{e.branch || "—"}</span>
                    <span className="num text-right font-semibold">{isBc(e) ? <span className="text-muted-foreground" title="уже учтено в Б/Ч">+{fmt(e.amount || 0)}</span> : (e.type === "inc" ? "+" : "−") + fmt(e.amount || 0)}</span>
                    <span className="flex items-center justify-end gap-1 max-xl:col-start-2 max-xl:justify-start">{isExp ? <><InlineNumber value={hasFact(e) ? (e.fact as number) : null} placeholder={fmt(e.amount || 0)} label={"Фактически потрачено: " + e.name} onSave={(v) => onFact(e, v)} className="max-w-28" />
                      {d ? <span className={cn("num text-xs font-semibold", d > 0 ? "text-plus" : "text-minus")}>{d > 0 ? "−" : "+"}{fmt(Math.abs(d))}</span> : null}</> : <span className="text-muted-foreground">—</span>}</span>
                    <span className="flex justify-end gap-0.5 max-xl:col-start-3"><Button variant="ghost" size="icon-sm" aria-label="Изменить" onClick={() => onEdit(e)}><Pencil /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Удалить" onClick={() => del(e.id)} className={cn(confirm === e.id && "bg-minus-soft text-minus")}>{confirm === e.id ? <span className="px-1 text-[11px] font-semibold">Точно?</span> : <Trash2 />}</Button></span>
                  </div>); })}
                {arr.length > LIM && <Button variant="ghost" className="mt-1 w-full" onClick={() => setAll((x) => tg(x, m))}>{all.has(m) ? "Свернуть" : `Показать все (${arr.length})`}</Button>}
              </div>}
            </div>); })}
      </div>
      {cur.length > 0 && <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 pt-3 text-[13.5px]"><span>Итого за {monthName(M).toLowerCase()}:</span><span>по плану <b className="num">{fmt(s)}</b></span><span>по факту <b className="num">{fmt(sf)}</b></span>{sd ? <span className={cn("font-semibold", sd > 0 ? "text-plus" : "text-minus")}>{sd > 0 ? "сэкономили" : "перерасход"} {fmt(Math.abs(sd))}</span> : null}</div>}
    </div>
  );
}
