// «Журнал продаж по дням»: день за днём, строка на точку (итоги слева, чеки карточками в ряд); правка, удаление, выгрузка.
import { useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { PAYCOL, PAYS, PAYSHORT, WD, discOf, fmt, journalOf, payOf, plural, pointColor, wdIdx, type Ctx, type Filter, type SaleX } from "./logic";
import { Pager, usePager } from "./parts";

type J = ReturnType<typeof journalOf>;

function Row({ s, editingId, onEdit, onDelete }: { s: SaleX; editingId: string | null; onEdit: (s: SaleX) => void; onDelete: (id: string) => void }) {
  const [ask, setAsk] = useState(false), d = discOf(s), p = payOf(s);
  const del = () => { if (!ask) { setAsk(true); setTimeout(() => setAsk(false), 3000); return; } onDelete(s.id); };
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-lg px-2 py-1.5", s.id === editingId && "bg-accent")}>
      <span className="min-w-0 truncate text-[13.5px]" title={`${s.cat || ""} · ${s.product || ""}${(s.qty || 0) > 1 ? ` · ${s.qty} шт` : ""}${d ? ` · скидка ${fmt(d)}` : ""}`}>
        {s.product}
        {(s.qty || 0) > 1 && <small className="ml-1 text-muted-foreground">{s.qty}×{fmt(s.price || 0)}</small>}{d ? <small className="ml-1 text-muted-foreground">−{fmt(d)}</small> : null}
        {s.debt ? <small className="ml-1 font-semibold text-minus">долг {fmt(s.debt)}</small> : null}</span>
      <span className="flex gap-1">{Object.keys(p).filter((k) => p[k]).map((k) => <span key={k} title={`${k}: ${fmt(p[k])}`} className="rounded px-1.5 py-px text-[10.5px] font-semibold" style={{ color: PAYCOL[k] || "var(--muted-foreground)", background: `color-mix(in oklab, ${PAYCOL[k] || "var(--muted-foreground)"} 16%, transparent)` }}>{PAYSHORT[k] || k}</span>)}</span>
      <span className="flex items-center justify-end gap-0.5"><b className="num mr-1 text-[13.5px]">{fmt(s.sum)}</b>
        <Button type="button" variant="ghost" size="icon-xs" data-se={s.id} aria-label="Изменить" title="Изменить" onClick={() => onEdit(s)}><Pencil /></Button>
        <Button type="button" variant="ghost" size="icon-xs" data-sd={s.id} aria-label="Удалить" title="Удалить" onClick={del} className={cn(ask && "bg-minus-soft px-1 text-minus")}>{ask ? <span className="text-[11px] font-semibold">удалить?</span> : <Trash2 />}</Button></span>
    </div>
  );
}

function Col({ col, points, editingId, onEdit, onDelete }: { col: J["cols"][number]; points: string[]; editingId: string | null; onEdit: (s: SaleX) => void; onDelete: (id: string) => void }) {
  const pg = usePager(col.groups.length), color = pointColor(col.pt, points), cash = (col.pay["Наличные"] || 0) - col.ex;
  const sumOf = (g: { items: SaleX[] }) => g.items.reduce((x, s) => x + (+s.sum || 0), 0);
  // строка точки: слева итоги точки, справа чеки карточками в ряд
  return (
    <div className="glass-inner grid min-w-0 overflow-hidden rounded-2xl lg:grid-cols-[230px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2 border-b border-border p-3.5 lg:border-r lg:border-b-0" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
        <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 font-semibold"><i className="size-2.5 shrink-0 rounded-full" style={{ background: color }} /><span className="truncate">{col.pt}</span></span><small className="shrink-0 text-muted-foreground">{col.items.length} поз.</small></div>
        <b className="num text-[20px] leading-tight tracking-tight">{fmt(col.sum)}</b>
        <div className="grid gap-0.5 text-[12.5px]">
          {PAYS.filter((p) => col.pay[p]).map((p) => <div key={p} className="flex justify-between gap-3"><span className="text-muted-foreground">{PAYSHORT[p] || p}</span><span className="num">{fmt(col.pay[p])}</span></div>)}
          {!Object.keys(col.pay).length && <span className="text-muted-foreground">продаж нет</span>}
          {col.ex ? <div className="flex justify-between gap-3"><span className="text-muted-foreground">Расходы дня</span><span className="num text-minus">−{fmt(col.ex)}</span></div> : null}
        </div>
        {(col.ex || col.pay["Наличные"]) ? <div className="mt-auto flex justify-between gap-3 border-t border-border pt-2 text-[12.5px]"><span className="text-muted-foreground">Б/Ч {col.kassa ? "→ в кассу" : "· на точке"}</span><b className="num">{fmt(cash)}</b></div> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2 p-2.5">
        {col.items.length ? <>
          <div className="grid items-start gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
            {pg.slice(col.groups).map((g, i) => (
              <div key={(g.c || g.items[0].id) + i} className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/40 py-1">
                <div className="flex justify-between gap-2 px-2.5 pt-0.5 text-[11.5px] font-semibold text-muted-foreground"><span className="truncate">{g.c ? "Чек №" + g.c : "Без чека"}</span>{g.items.length > 1 && <span className="num">{fmt(sumOf(g))}</span>}</div>
                {g.items.map((s) => <Row key={s.id} s={s} editingId={editingId} onEdit={onEdit} onDelete={onDelete} />)}
              </div>))}
          </div>
          <Pager pg={pg} className="px-1" /></>
          : <div className="grid h-full place-items-center py-4 text-[13px] text-muted-foreground">Продаж нет</div>}
      </div>
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
      {n ? <div className="flex flex-col gap-3">
        {J.cols.map((col) => <Col key={col.pt} col={col} points={c.settings.points} editingId={editingId} onEdit={onEdit} onDelete={onDelete} />)}</div>
        : <p className="py-6 text-center text-[13px] text-muted-foreground">В этот день продаж нет. Выберите другой день.</p>}
    </Panel>
  );
}
