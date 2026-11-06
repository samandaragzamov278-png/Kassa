// Мелкие элементы раздела «Продажи»: поле с подписью, список выбора, переключатель, листание больших таблиц.
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Field = ({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={cn("grid min-w-0 content-start gap-1.5", className)}><Label className="text-[12px] text-muted-foreground">{label}</Label>{children}</div>
);

const E = "__empty";
type Opt = string | { v: string; l: string };
export function Sel({ value, onChange, options, label, className, disabled }: { value: string; onChange: (v: string) => void; options: Opt[]; label: string; className?: string; disabled?: boolean }) {
  const o = options.map((x) => (typeof x === "string" ? { v: x, l: x } : x));
  return (
    <Select value={value === "" ? E : value} onValueChange={(v) => onChange(v === E ? "" : v)} disabled={disabled}>
      <SelectTrigger aria-label={label} className={cn("w-full", className)}><SelectValue /></SelectTrigger>
      <SelectContent>{o.map((x) => <SelectItem key={x.v} value={x.v === "" ? E : x.v}>{x.l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

/** переключатель из кнопок; value пустой — ни одна не выбрана */
export function Seg<T extends string>({ value, onChange, options, label, className }: { value: T | ""; onChange: (v: T) => void; options: [T, string][]; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex w-fit max-w-full flex-wrap gap-0.5 rounded-xl bg-muted p-[3px]", className)}>
      {options.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={cn("rounded-[10px] px-3 py-1 text-[13px] font-medium whitespace-nowrap transition outline-none focus-visible:ring-3 focus-visible:ring-primary/30", value === k ? "bg-popover text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
      ))}
    </div>
  );
}

export const SIZES = [10, 20, 30, 40, 50];
export function usePager(total: number, initial = 10) {
  const [size, setSize] = useState(initial), [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(total / size)), p = Math.min(page, pages - 1);
  return {
    size, setSize: (n: number) => { setSize(n); setPage(0); }, page: p, setPage, pages, total,
    from: total ? p * size + 1 : 0, to: Math.min(total, (p + 1) * size),
    slice: function <T>(a: T[]): T[] { return a.slice(p * size, (p + 1) * size); },
  };
}
export type Pg = ReturnType<typeof usePager>;
/** «Показывать 10 · 20 · 30 · 40 · 50» и листание; для коротких списков не показывается */
export function Pager({ pg, className }: { pg: Pg; className?: string }) {
  if (pg.total <= SIZES[0]) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 text-[13px]", className)}>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground"><span>Показывать</span>
        <div role="group" aria-label="Строк на странице" className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
          {SIZES.map((n) => <button key={n} type="button" aria-pressed={pg.size === n} onClick={() => pg.setSize(n)} className={cn("num rounded-md px-2 py-0.5 text-[12.5px] font-medium", pg.size === n ? "bg-popover text-foreground shadow-sm" : "hover:text-foreground")}>{n}</button>)}
        </div></div>
      <div className="flex items-center gap-2"><span className="num text-muted-foreground">{pg.from}–{pg.to} из {pg.total}</span>
        <Button type="button" variant="secondary" size="icon-sm" aria-label="Предыдущая страница" disabled={pg.page <= 0} onClick={() => pg.setPage(pg.page - 1)}><ChevronLeft /></Button>
        <span className="num min-w-10 text-center text-muted-foreground">{pg.page + 1} / {pg.pages}</span>
        <Button type="button" variant="secondary" size="icon-sm" aria-label="Следующая страница" disabled={pg.page >= pg.pages - 1} onClick={() => pg.setPage(pg.page + 1)}><ChevronRight /></Button></div>
    </div>
  );
}

export const digits = (s: string) => { const v = String(s || "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
export const fmtIn = (s: string, f: (n: number) => string) => { const v = digits(s); return isNaN(v) ? "" : f(v); };
