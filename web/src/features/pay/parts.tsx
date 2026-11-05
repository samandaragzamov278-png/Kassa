// Мелкие элементы раздела: значок статьи, статус, плитка показателя, кольцо прогресса.
import { motion } from "motion/react";
import { AppWindow, CircleDollarSign, Ellipsis, House, Landmark, ReceiptText, Users, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dDiff, pl, type MonthRow, type Status } from "./logic";

const ICONS: Record<string, LucideIcon> = { credit: Landmark, rent: House, tax: ReceiptText, salary: Users, service: AppWindow, utility: Zap, debt: CircleDollarSign, other: Ellipsis };

export function CatIcon({ cat, size = "md" }: { cat?: string; size?: "sm" | "md" }) {
  const I = ICONS[cat || "other"] || Ellipsis;
  return <span className={cn("glass-inner grid shrink-0 place-items-center rounded-xl text-foreground/75", size === "sm" ? "size-8" : "size-10")}><I className={size === "sm" ? "size-4" : "size-5"} strokeWidth={1.8} /></span>;
}

const ST: Record<Status, [string, string]> = {
  ok: ["bg-plus-soft text-plus", "Оплачено"], part: ["bg-warn-soft text-warn", "Частично"], late: ["bg-minus-soft text-minus", "Просрочено"],
  today: ["bg-warn-soft text-warn", "Сегодня"], soon: ["bg-muted text-muted-foreground", "Впереди"],
};
export function statusText(r: MonthRow, T: string) {
  if (r.st === "late") { const n = dDiff(r.due, T); return `Просрочено · ${n} ${pl(n, "день", "дня", "дней")}`; }
  if (r.st === "soon") { const n = dDiff(T, r.due); return n === 1 ? "Завтра" : `Через ${n} ${pl(n, "день", "дня", "дней")}`; }
  return ST[r.st][1];
}
export function StatusChip({ r, T, onClick }: { r: MonthRow; T: string; onClick?: () => void }) {
  const title = r.st === "ok" ? (r.man && !r.auto ? "Снять отметку" : "Оплачено по выписке") : "Отметить оплату";
  return (
    <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={onClick} title={title}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-primary/30", ST[r.st][0])}>
      <i className={cn("size-1.5 rounded-full", r.st === "soon" ? "ring-[1.5px] ring-current" : "bg-current")} />{statusText(r, T)}
    </motion.button>
  );
}

export function Ring({ p, className }: { p: number; className?: string }) {
  const r = 15, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p));
  return (
    <svg viewBox="0 0 40 40" className={cn("size-11 shrink-0", className)} aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4.5" className="stroke-muted" />
      <motion.circle cx="20" cy="20" r={r} fill="none" strokeWidth="4.5" strokeLinecap="round" className="stroke-plus" transform="rotate(-90 20 20)"
        initial={{ strokeDasharray: `0 ${c}` }} animate={{ strokeDasharray: `${c * v} ${c}` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

export function Kpi({ label, value, sub, tone, extra, i = 0 }: { label: string; value: string; sub?: React.ReactNode; tone?: "plus" | "primary"; extra?: React.ReactNode; i?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }} className="glass flex min-w-0 flex-col gap-1 rounded-[22px] px-5 py-4">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("num truncate text-[22px] font-semibold tracking-tight", tone === "plus" && "text-plus", tone === "primary" && "text-primary")}>{value}</span>{extra}
      </div>
      <span className="truncate text-xs text-muted-foreground">{sub || " "}</span>
    </motion.div>
  );
}

export function Panel({ title, note, action, children, className }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass min-w-0 rounded-[26px] p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>{note && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{note}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}
