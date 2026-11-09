// Касса дня по точкам: по блоку на точку — оплаты, расходы дня и наличные после расходов.
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Panel } from "@/components/kit";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PAYS, WD, dShort, fmt, plural, pointColor, wdIdx, type DayCashRow, type Filter } from "./logic";
import { dayCashBlocks } from "./logic";
import { Pager, usePager } from "./parts";

type Block = ReturnType<typeof dayCashBlocks>[number];
const Pill = ({ kassa }: { kassa: boolean }) => <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", kassa ? "bg-primary/12 text-primary" : "bg-warn-soft text-warn")}>{kassa ? "Б/Ч в кассу" : "Б/Ч на точке"}</span>;
const Dash = () => <span className="text-muted-foreground">—</span>;

function BlockView({ b, points, open, toggle }: { b: Block; points: string[]; open: boolean; toggle: () => void }) {
  const pg = usePager(b.rows.length);
  const sw = <span className="size-2.5 shrink-0 rounded-full" style={{ background: pointColor(b.pt, points) }} />;
  if (!b.rows.length) return (
    <div className="glass-inner flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl px-4 py-3">
      <span className="flex items-center gap-2 font-semibold"><span className="size-4" />{sw}{b.pt}<Pill kassa={b.kassa} /></span>
      <span className="text-[13px] text-muted-foreground">{b.empty === "billz" ? "за период в Billz нет ни одного чека" : "за период продаж нет"}</span>
    </div>);
  const rows = pg.slice(b.rows);
  return (
    <div className="glass-inner overflow-hidden rounded-2xl">
      <button type="button" data-dc={b.pt} aria-expanded={open} onClick={toggle} className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-primary/30">
        <span className="flex items-center gap-2 font-semibold"><ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />{sw}{b.pt}<Pill kassa={b.kassa} /></span>
        <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted-foreground">
          <span>{b.rows.length} {plural(b.rows.length, "день", "дня", "дней")}</span>
          <span>выручка <b className="num text-foreground">{fmt(b.tot)}</b></span><span>наличные <b className="num text-foreground">{fmt(b.cash)}</b></span>
          <span>расходы <b className="num text-foreground">−{fmt(b.exp)}</b></span><span>Б/Ч после расходов <b className="num text-foreground">{fmt(b.after)}</b></span></span>
      </button>
      {open && <div className="px-2 pb-3">
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Дата</TableHead>{PAYS.map((p) => <TableHead key={p} className="text-right">{p}</TableHead>)}<TableHead className="text-right">Итого</TableHead><TableHead className="text-right">Расходы дня</TableHead><TableHead className="text-right">Б/Ч после расходов</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((o: DayCashRow) => (
            <TableRow key={o.d}><TableCell className="num whitespace-nowrap">{dShort(o.d)} <span className="text-xs text-muted-foreground">{WD[wdIdx(o.d)]}</span></TableCell>
              {PAYS.map((p) => <TableCell key={p} className="num text-right">{o.pay[p] ? fmt(o.pay[p]) : <Dash />}</TableCell>)}
              <TableCell className="num text-right font-semibold">{fmt(o.tot)}</TableCell>
              <TableCell className="num text-right">{o.exp ? <span className="text-minus">−{fmt(o.exp)}</span> : <Dash />}</TableCell>
              <TableCell className="num text-right font-semibold">{fmt(o.after)}</TableCell></TableRow>))}</TableBody>
          <TableFooter><TableRow><TableCell className="font-semibold">Итого</TableCell>{PAYS.map((p) => <TableCell key={p} className="num text-right font-semibold">{fmt(b.pay[p])}</TableCell>)}
            <TableCell className="num text-right font-semibold">{fmt(b.tot)}</TableCell><TableCell className="num text-right font-semibold">−{fmt(b.exp)}</TableCell><TableCell className="num text-right font-semibold">{fmt(b.after)}</TableCell></TableRow></TableFooter>
        </Table></div>
        <Pager pg={pg} className="px-2" />
      </div>}
    </div>
  );
}

export function DayCash({ rows, points, F }: { rows: DayCashRow[]; points: string[]; F: Filter }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const blocks = dayCashBlocks(rows, points, F);
  const tg = (p: string) => setOpen((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  return (
    <Panel title="Касса дня по точкам" note="Отдельная таблица на каждую точку: оплаты, расходы дня и наличные после расходов. Б/Ч Премиума и Яшнабада идёт в кассу, Б/Ч Сергели и C1 остаётся на точке.">
      <div className="grid gap-2.5">
        {blocks.map((b) => <BlockView key={b.pt} b={b} points={points} open={open.has(b.pt)} toggle={() => tg(b.pt)} />)}
        {!rows.length && <p className="text-[13px] text-muted-foreground">За выбранный период нет ни продаж, ни расходов дня.</p>}
      </div>
    </Panel>
  );
}
