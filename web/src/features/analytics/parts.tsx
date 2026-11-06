// Общие элементы Аналитики, Линз и Склада: плитка показателя с пояснением, панель графика, таблицы, полоса маржи.
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Card } from "./base";
import { HINT } from "./texts";
import { MiniRing, Spark } from "./charts";
import { pctF } from "./util";

export const hintOf = (title: string) => {
  const k = title.trim();
  return HINT[k] || (k.startsWith("Касса за ") ? "Сдана ли касса закрытого месяца и итог по наличным." : k.startsWith("Продано с ") ? "Сколько штук новой партии продано с даты поставки." : /^(Излишек|Недостача) в кассе/.test(k) ? "Разница между пересчитанной наличкой и тем, что должно быть по расчёту." : "");
};

/** текст пояснения: показан всегда или по нажатию на заголовок, если «Пояснения» выключены */
function useHint(title: string, hintsOn: boolean | null) {
  const [open, setOpen] = useState(false);
  const h = hintsOn === null ? "" : hintOf(title); // null — пояснений нет (Линзы и Склад)
  return { h, show: !!h && (!!hintsOn || open), toggle: hintsOn === false && h ? () => setOpen((x) => !x) : undefined, open };
}
const tone = (d: string) => (d.startsWith("▲") ? "text-plus" : d.startsWith("▼") ? "text-minus" : "");

export function Tile({ c, i = 0, hintsOn = true }: { c: Card; i?: number; hintsOn?: boolean | null }) {
  const { h, show, toggle } = useHint(c.label, hintsOn);
  const hero = !!c.main;
  return (
    <motion.div initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.4 }} whileHover={{ y: -3 }}
      onClick={toggle} role={toggle ? "button" : undefined}
      className={cn("flex min-w-0 flex-col gap-1.5 rounded-[22px] px-5 py-4", hero ? "bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_14px_36px_rgb(10_132_255/0.38)]" : "glass", c.warn && "ring-1 ring-warn/50", toggle && "cursor-pointer")}>
      <span className={cn("text-[11px] font-semibold tracking-wide uppercase", hero ? "text-white/85" : "text-muted-foreground")}>{c.label}</span>
      {show && <p className={cn("text-[12px] leading-snug", hero ? "text-white/85" : "text-muted-foreground")}>{h}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className={cn("num min-w-0 text-[22px] leading-tight font-semibold tracking-tight break-words", c.warn && "text-warn")}>{c.v}</span>
        {c.spark ? <Spark vals={c.spark.vals} color={c.spark.color} light={hero} /> : c.ring ? <MiniRing p={c.ring.p} color={c.ring.color} light={hero} /> : null}
      </div>
      <span className={cn("text-[12.5px] leading-snug", hero ? "text-white/85" : "text-muted-foreground", !hero && tone(c.d))}>{c.d || " "}</span>
    </motion.div>
  );
}

export function Wd({ title, note, hintsOn = true, wide, children, className }: { title: string; note?: string; hintsOn?: boolean | null; wide?: boolean; children: React.ReactNode; className?: string }) {
  const { show, h, toggle } = useHint(title, hintsOn);
  return (
    <section className={cn("glass min-w-0 rounded-[26px] p-5", wide && "md:col-span-2 xl:col-span-3", className)}>
      <h2 className={cn("text-[17px] font-semibold tracking-tight", toggle && "cursor-pointer")} onClick={toggle}>{title}</h2>
      {show && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{h}</p>}
      {note && !(h && hintsOn === true && !/\d/.test(note)) && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{note}</p>}
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

// ---- таблицы ----
export const Tbl = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("-mx-1 overflow-x-auto px-1", className)}><table className="w-full border-collapse text-[13px]">{children}</table></div>;
export const Th = ({ children, r, className }: { children?: React.ReactNode; r?: boolean; className?: string }) => <th className={cn("border-b border-border px-2 py-2 text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase", r ? "text-right" : "text-left", className)}>{children}</th>;
export const Td = ({ children, r, num, b, className, colSpan }: { children?: React.ReactNode; r?: boolean; num?: boolean; b?: boolean; className?: string; colSpan?: number }) => <td colSpan={colSpan} className={cn("border-b border-border/60 px-2 py-2 align-middle", r && "text-right", (num || r) && "num", b && "font-semibold", className)}>{children}</td>;
export const Dim = ({ children = "—" }: { children?: React.ReactNode }) => <span className="text-muted-foreground">{children}</span>;
export const Sw = ({ color }: { color: string }) => <i className="mr-1.5 inline-block size-2.5 rounded-full align-middle" style={{ background: color }} />;
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="glass rounded-[22px] p-6 text-center text-[14px] text-muted-foreground">{children}</div>;
export const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">{children}</h3>;

/** полоска маржи с процентом */
export function MBar({ v, w = 70, color = "var(--plus)" }: { v: number | null; w?: number; color?: string }) {
  if (v == null) return <Dim />;
  return <div className="flex items-center justify-end gap-2"><div className="h-2 overflow-hidden rounded-full bg-muted" style={{ width: w }}><span className="block h-full rounded-full" style={{ width: Math.max(0, Math.min(100, v * 100)) + "%", background: color }} /></div><b className="num w-9 text-right">{pctF(v)}</b></div>;
}
export function Bar2({ v, color = "var(--primary)" }: { v: number; color?: string }) {
  return <div className="h-2 min-w-[70px] overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: Math.round(v * 100) + "%", background: color }} /></div>;
}
export function Seg<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: [T, string][]; label: string }) {
  return (
    <div role="group" aria-label={label} className="glass inline-flex max-w-full flex-wrap gap-1 rounded-full p-1">
      {items.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition", value === v ? "bg-popover text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}
    </div>
  );
}

export function Box({ title, note, action, children }: { title: string; note?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass min-w-0 rounded-[26px] p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>{note && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{note}</p>}</div>{action}
      </div>
      {children}
    </section>
  );
}
