// Общие мелочи трёх разделов (Отчёт р/с, Сверка, Склад Billz): переключатель, значок статуса, постраничный показ таблиц, скачивание.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** переключатель из нескольких кнопок; длинные списки переносятся на вторую строку */
export function Seg<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: [T, React.ReactNode][]; label?: string; className?: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={className}>
      <TabsList aria-label={label} className="h-auto! max-w-full flex-wrap justify-start gap-1">
        {options.map(([k, l]) => <TabsTrigger key={k} value={k} className="h-8 flex-none px-3">{l}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}

export const TONES = {
  ok: "bg-plus-soft text-plus", bad: "bg-minus-soft text-minus", warn: "bg-warn-soft text-warn", off: "bg-muted text-muted-foreground", idle: "bg-muted text-muted-foreground", wait: "bg-muted text-muted-foreground",
} as const;
export type Tone = keyof typeof TONES;
export function Pill({ tone, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return <span title={title} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", TONES[tone])}>{children}</span>;
}
export const Dot = ({ color }: { color: string }) => <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full align-[1px]" style={{ background: color }} />;

/** цвет точки — одинаковый во всех разделах новой версии */
const PT: Record<string, string> = { "Премиум": "#0a84ff", "Яшнабад": "#af52de", "Сергели": "#34c759", "C1": "#ff9f0a", "Склад": "#8e8e93" };
export const ptColor = (p: string) => PT[p] || "#8e8e93";

export const FIELD = "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-[14px] outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-input/30";
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("flex min-w-0 flex-col gap-1 text-[12px] font-medium text-muted-foreground", className)}>{label}{children}</label>;
}
export const Dash = () => <span className="text-muted-foreground">—</span>;

// ---------- таблицы: на компьютере обычные, на телефоне каждая строка — карточка с подписями ----------
export type Head = string | [string, "r"];
/** head — заголовки (["Сумма", "r"] — по правому краю) */
export function Tbl({ head, children, className }: { head: Head[]; children: React.ReactNode; className?: string }) {
  return (
    <table className={cn("w-full border-collapse max-md:block", className)}>
      <thead className="max-md:hidden"><tr className="border-b border-border">{head.map((h, i) => { const [t, r] = Array.isArray(h) ? h : [h, ""]; return <th key={i} className={cn("px-2.5 py-2 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase", r && "text-right")}>{t}</th>; })}</tr></thead>
      <tbody className="max-md:block">{children}</tbody>
    </table>
  );
}
export function Tr({ children, tap, tone, selected, onClick, className, foot }: { children: React.ReactNode; tap?: boolean; tone?: "bad" | "warn" | "dim"; selected?: boolean; onClick?: () => void; className?: string; foot?: boolean }) {
  return (
    <tr onClick={onClick} className={cn("border-b border-border/60 last:border-0 max-md:mb-2 max-md:block max-md:rounded-2xl max-md:border max-md:border-border/70 max-md:px-3 max-md:py-2",
      tap && "cursor-pointer transition hover:bg-muted/60", tone === "bad" && "bg-minus-soft/60", tone === "warn" && "bg-warn-soft/60", tone === "dim" && "opacity-55", selected && "bg-accent/70", foot && "font-semibold", className)}>{children}</tr>
  );
}
/** ячейка: l — подпись на телефоне; r — цифра справа; h — главная ячейка строки (на телефоне — заголовок карточки) */
export function Td({ children, l, r, h, className, colSpan }: { children?: React.ReactNode; l?: string; r?: boolean; h?: boolean; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} data-label={l || ""} className={cn("px-2.5 py-2 align-top text-[13.5px]", r && "text-right num",
      "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-0.5 max-md:text-right",
      l && "max-md:before:shrink-0 max-md:before:text-left max-md:before:text-[12px] max-md:before:font-normal max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]",
      h && "max-md:justify-start max-md:pb-1 max-md:text-left max-md:text-[14.5px] max-md:font-semibold", colSpan && "max-md:block max-md:text-left", className)}>{children}</td>
  );
}

// ---------- «Показывать 10 · 20 · 30 · 40 · 50» и листание ----------
export const SIZES = [10, 20, 30, 40, 50];
const lsGet = (k: string) => { try { return +(localStorage.getItem("kassa-web.pg." + k) || 0); } catch { return 0; } };
const lsSet = (k: string, v: number) => { try { localStorage.setItem("kassa-web.pg." + k, String(v)); } catch { /* нет хранилища */ } };
const sp = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** страница списка: срез [from, to) и панель с выбором размера. Размер запоминается для каждой таблицы по ключу. focus — номер строки, которую надо показать */
export function usePaging(total: number, key: string, focus = -1, reset: unknown = "") {
  const [size, setSizeS] = useState(() => (SIZES.includes(lsGet(key)) ? lsGet(key) : SIZES[0])), [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [reset, key]);
  const pc = Math.max(1, Math.ceil(total / size)), pg = Math.min(page, pc - 1);
  useEffect(() => { if (focus >= 0) setPage(Math.floor(focus / size)); }, [focus, size]);
  const setSize = (s: number) => { lsSet(key, s); setSizeS(s); setPage(0); };
  const from = pg * size, to = Math.min(total, from + size);
  const bar = total <= SIZES[0] ? null : (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px]">
      <div className="flex items-center gap-2"><span className="text-muted-foreground">Показывать</span>
        <Tabs value={String(size)} onValueChange={(v) => setSize(+v)}><TabsList aria-label="Строк на странице" className="h-8">{SIZES.map((s) => <TabsTrigger key={s} value={String(s)} className="px-2.5">{s}</TabsTrigger>)}</TabsList></Tabs></div>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="icon" aria-label="Назад" disabled={pg === 0} onClick={() => setPage(pg - 1)}><ChevronLeft /></Button>
        <span className="num min-w-24 text-center text-muted-foreground">{sp(from + 1)}–{sp(to)} из {sp(total)}</span>
        <Button variant="secondary" size="icon" aria-label="Вперёд" disabled={pg >= pc - 1} onClick={() => setPage(pg + 1)}><ChevronRight /></Button>
      </div>
    </div>
  );
  return { from, to, bar };
}

/** скачать файл из памяти */
export function saveBlob(name: string, data: BlobPart, type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/** книга SheetJS → файл (xlsx подгружается только по нажатию) */
export async function saveBook(name: string, sheets: [string, unknown[][] | Record<string, unknown>[]][]) {
  const X = await import("xlsx"), wb = X.utils.book_new();
  sheets.forEach(([n, rows]) => X.utils.book_append_sheet(wb, Array.isArray(rows[0]) ? X.utils.aoa_to_sheet(rows as unknown[][]) : X.utils.json_to_sheet(rows as Record<string, unknown>[]), n.slice(0, 31)));
  const out = X.write(wb, { type: "array", bookType: "xlsx" }); saveBlob(name + ".xlsx", out);
}
