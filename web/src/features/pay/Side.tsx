// Боковые карточки: ближайшие 7 дней, долги, суммы по статьям.
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PayItem } from "@/lib/types";
import { CATS, dDiff, dLong, fmt, type MonthRow } from "./logic";
import { CatIcon } from "./parts";

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.section whileHover={{ y: -3 }} className="glass rounded-[24px] p-5"><h3 className="mb-3 text-[15px] font-semibold">{title}</h3>{children}</motion.section>
);

export function Soon({ rows, T, onOpen }: { rows: MonthRow[]; T: string; onOpen: (id: string) => void }) {
  const L = rows.filter((r) => r.st !== "ok" && (r.due < T || dDiff(T, r.due) <= 7));
  return (
    <Card title="Ближайшие 7 дней">
      {L.length ? <>
        <div className="flex flex-col gap-0.5">{L.map((r) => (
          <button key={r.it.id} type="button" onClick={() => onOpen(r.it.id)} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-muted">
            <span className={cn("size-2 rounded-full", r.st === "late" ? "bg-minus" : r.st === "today" || r.st === "part" ? "bg-warn" : "bg-muted-foreground")} />
            <span className="flex min-w-0 flex-col leading-tight"><b className="truncate text-[13.5px] font-semibold">{r.it.name}</b><small className="text-xs text-muted-foreground">{dLong(r.due)}{r.st === "late" ? " · просрочено" : ""}</small></span>
            <b className="num text-[13.5px]">{fmt(r.left)}</b>
          </button>))}</div>
        <div className="mt-2.5 flex justify-between border-t border-border pt-2.5 text-[13.5px]"><span>Нужно</span><b className="num">{fmt(L.reduce((s, r) => s + r.left, 0))} сум</b></div>
      </> : <p className="text-[13px] text-muted-foreground">На неделю вперёд всё оплачено.</p>}
    </Card>
  );
}

export type DebtRow = { it: PayItem; total: number; paid: number; left: number | null; pct: number | null };
export function Debts({ debts, onEdit, onAdd }: { debts: DebtRow[]; onEdit: (id: string) => void; onAdd: () => void }) {
  return (
    <Card title="Долги">
      <div className="flex flex-col gap-2">
        {debts.map((d) => (
          <button key={d.it.id} type="button" onClick={() => onEdit(d.it.id)} className="glass-inner flex flex-col gap-1.5 rounded-2xl px-3.5 py-3 text-left transition hover:brightness-105">
            <span className="flex justify-between gap-2 text-[13.5px]"><b className="truncate">{d.it.name}</b><span className="num font-semibold whitespace-nowrap">{d.left == null ? "сумма не указана" : fmt(d.left) + " сум"}</span></span>
            {d.total > 0 && <span className="h-1.5 overflow-hidden rounded-full bg-muted"><motion.i initial={{ width: 0 }} animate={{ width: `${(d.pct || 0) * 100}%` }} transition={{ duration: 0.6 }} className="block h-full rounded-full bg-plus" /></span>}
            <small className="text-xs text-muted-foreground">погашено {fmt(d.paid)}{d.total ? ` из ${fmt(d.total)} · ${Math.round((d.pct || 0) * 100)}%` : ""}</small>
          </button>
        ))}
        {!debts.length && <p className="text-[13px] text-muted-foreground">Долгов нет.</p>}
        <Button variant="secondary" className="mt-1 w-full" onClick={onAdd}><Plus />Долг</Button>
      </div>
    </Card>
  );
}

export function ByCat({ rows }: { rows: MonthRow[] }) {
  const by: Record<string, number> = {}; rows.forEach((r) => (by[r.it.cat || "other"] = (by[r.it.cat || "other"] || 0) + r.am.a));
  const E = Object.entries(by).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...E.map((e) => e[1]));
  if (!E.length) return null;
  return (
    <Card title="По статьям">
      <div className="flex flex-col gap-2.5">{E.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 text-[13px]">
          <span className="flex items-center gap-2"><CatIcon cat={k} size="sm" />{CATS[k] || CATS.other}</span><b className="num">{fmt(v)}</b>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><motion.i initial={{ width: 0 }} animate={{ width: `${(v / mx) * 100}%` }} transition={{ duration: 0.6 }} className="block h-full rounded-full bg-primary/70" /></span>
        </div>))}</div>
    </Card>
  );
}
