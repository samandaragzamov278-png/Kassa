// «Журнал продаж по дням»: день за днём, колонка на точку, позиции одного чека вместе; правка, удаление, выгрузка.
import { useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { PAYS, PAYSHORT, WD, discOf, fmt, journalOf, payOf, plural, pointColor, wdIdx, type Ctx, type Filter, type SaleX } from "./logic";
import { Pager, usePager } from "./parts";

type J = ReturnType<typeof journalOf>;
const TAGC = ["bg-primary/12 text-primary", "bg-plus-soft text-plus", "bg-warn-soft text-warn", "bg-muted text-muted-foreground"];

function Row({ s, editingId, onEdit, onDelete }: { s: SaleX; editingId: string | null; onEdit: (s: SaleX) => void; onDelete: (id: string) => void }) {
  const [ask, setAsk] = useState(false), d = discOf(s), p = payOf(s);
  const del = () => { if (!ask) { setAsk(true); setTimeout(() => setAsk(false), 3000); return; } onDelete(s.id); };
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5", s.id === editingId && "bg-accent")}>
      <span className="min-w-0 truncate text-[13.5px]" title={`${s.cat || ""} · ${s.product || ""}${(s.qty || 0) > 1 ? ` · ${s.qty} шт` : ""}${d ? ` · скидка ${fmt(d)}` : ""}`}>
        {s.product}
        {(s.qty || 0) > 1 && <small className="ml-1 text-muted-foreground">{s.qty}×{fmt(s.price || 0)}</small>}{d ? <small className="ml-1 text-muted-foreground">−{fmt(d)}</small> : null}
        {s.debt ? <small className="ml-1 font-semibold text-minus">долг {fmt(s.debt)}</small> : null}</span>
      <span className="flex items-center justify-end gap-0.5"><b className="num mr-1 text-[13.5px]">{fmt(s.sum)}</b>
        <Button type="button" variant="ghost" size="icon-xs" data-se={s.id} aria-label="Изменить" title="Изменить" onClick={() => onEdit(s)}><Pencil /></Button>
        <Button type="button" variant="ghost" size="icon-xs" data-sd={s.id} aria-label="Удалить" title="Удалить" onClick={del} className={cn(ask && "bg-minus-soft px-1 text-minus")}>{ask ? <span className="text-[11px] font-semibold">удалить?</span> : <Trash2 />}</Button></span>
      <span className="col-span-2 flex flex-wrap gap-1">{Object.keys(p).filter((k) => p[k]).map((k) => <span key={k} title={`${k}: ${fmt(p[k])}`} className={cn("rounded px-1.5 py-px text-[10.5px] font-semibold", TAGC[PAYS.indexOf(k)] || TAGC[3])}>{PAYSHORT[k] || k}</span>)}</span>
    </div>
  );
}

function Col({ col, points, editingId, onEdit, onDelete }: { col: J["cols"][number]; points: string[]; editingId: string | null; onEdit: (s: SaleX) => void; onDelete: (id: string) => void }) {
  const pg = usePager(col.groups.length);
  return (
    <div className="glass-inner flex min-w-0 flex-col rounded-2xl">
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1"><span className="flex items-center gap-2 font-semibold"><i className="size-2.5 rounded-full" style={{ background: pointColor(col.pt, points) }} />{col.pt} <small className="font-normal text-muted-foreground">{col.items.length} поз.</small></span><b className="num">{fmt(col.sum)}</b></div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-3.5 pb-2 text-[12.5px] text-muted-foreground">{PAYS.filter((p) => col.pay[p]).map((p) => <span key={p}>{PAYSHORT[p]} <b className="num text-foreground">{fmt(col.pay[p])}</b></span>)}{!Object.keys(col.pay).length && <span>продаж нет</span>}</div>
      {col.items.length ? <div className="grid gap-1.5 border-t border-border p-2">
        {pg.slice(col.groups).map((g, i) => g.items.length > 1
          ? <div key={g.c + i} className="rounded-xl border border-border bg-muted/40 py-1"><div className="flex justify-between px-2.5 pt-0.5 text-[12px] font-semibold text-muted-foreground"><span>Чек №{g.c}</span><span className="num">{fmt(g.items.reduce((x, s) => x + (+s.sum || 0), 0))}</span></div>{g.items.map((s) => <Row key={s.id} s={s} editingId={editingId} onEdit={onEdit} onDelete={onDelete} />)}</div>
          : <div key={g.items[0].id} className="rounded-xl border border-border bg-muted/40 py-0.5">{g.c ? <div className="px-2.5 pt-0.5 text-[11px] text-muted-foreground">№{g.c}</div> : null}<Row s={g.items[0]} editingId={editingId} onEdit={onEdit} onDelete={onDelete} /></div>)}
        <Pager pg={pg} className="px-1" /></div>
        : <div className="border-t border-border px-3.5 py-3 text-[13px] text-muted-foreground">Продаж нет</div>}
      {(col.ex || col.pay["Наличные"]) ? <div className="mt-auto grid gap-0.5 border-t border-border px-3.5 py-2 text-[12.5px]">
        {col.ex ? <div className="flex justify-between gap-3"><span className="text-muted-foreground">Расходы дня</span><span className="num text-minus">−{fmt(col.ex)}</span></div> : null}
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Б/Ч после расходов {col.kassa ? "→ в кассу" : "· на точке"}</span><b className="num">{fmt((col.pay["Наличные"] || 0) - col.ex)}</b></div></div> : null}
    </div>
  );
}

export function Journal({ c, F, list, jDay, setJDay, editingId, onEdit, onDelete, onCsv, onXlsx, msg }: {
  c: Ctx; F: Filter; list: SaleX[]; jDay: string; setJDay: (d: string) => void; editingId: string | null; onEdit: (s: SaleX) => void; onDelete: (id: string) => void;
  onCsv: () => void; onXlsx: () => void; msg: { t: string; bad?: boolean } | null;
}) {
  const J = journalOf(c, F, list, jDay), n = J.dayList.length;
  return (
    <Panel title="Журнал продаж по дням" note={`Стрелки листают дни с продажами. Выгрузка CSV и Excel берёт все записи за период фильтра (${list.length} ${plural(list.length, "позиция", "позиции", "позиций")}).`}
      action={<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onCsv}><FileText />CSV</Button><Button type="button" variant="secondary" onClick={onXlsx}><FileSpreadsheet />Excel</Button></div>}>
      <p role="status" className={cn("mb-2 min-h-5 text-[13px]", msg?.bad ? "text-minus" : "text-plus")}>{msg?.t}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="icon" aria-label="Предыдущий день" disabled={!J.prev} onClick={() => setJDay(J.prev)}><ChevronLeft /></Button>
        <Input type="date" aria-label="День журнала" value={J.day} onChange={(e) => e.target.value && setJDay(e.target.value)} className="num w-40" />
        <Button type="button" variant="secondary" size="icon" aria-label="Следующий день" disabled={!J.next} onClick={() => setJDay(J.next)}><ChevronRight /></Button>
        <span className="text-[13px] text-muted-foreground">{WD[wdIdx(J.day)]} · {n} {plural(n, "позиция", "позиции", "позиций")} · {fmt(J.tot)} сум</span>
      </div>
      {n ? <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))]">
        {J.cols.map((col) => <Col key={col.pt} col={col} points={c.settings.points} editingId={editingId} onEdit={onEdit} onDelete={onDelete} />)}</div>
        : <p className="py-6 text-center text-[13px] text-muted-foreground">В этот день продаж нет. Выберите другой день.</p>}
    </Panel>
  );
}
