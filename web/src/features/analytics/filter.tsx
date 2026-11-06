// Простой фильтр периода, месяца, точки и категории (или вида линзы) для Аналитики, Линз и Склада.
// Временный: когда появится общий фильтр раздела «Продажи», его значения подставляются в Flt (see base.ts).
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultFlt, monthOf, monthRange, presetRange, type Flt } from "./base";
import type { Ctx } from "./cost";
import { MONTHS_FULL } from "./util";

export function useFlt(preset = "month") {
  const [F, setF] = useState<Flt>(() => defaultFlt(preset));
  return [F, (p: Partial<Flt>) => setF((x) => ({ ...x, ...p }))] as const;
}

const PRESETS: [string, string][] = [["today", "Сегодня"], ["7d", "7 дней"], ["month", "Месяц"], ["prev", "Прошлый месяц"], ["all", "Всё время"]];
const Lbl = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t}{children}</label>;

export function FilterBar({ c, F, set, kinds, cats, withPoint = true, catLabel = "Категория" }: { c: Ctx; F: Flt; set: (p: Partial<Flt>) => void; kinds?: string[]; cats?: boolean; withPoint?: boolean; catLabel?: string }) {
  const months = useMemo(() => [...new Set(c.sales.map((s) => (s.date || "").slice(0, 7)).filter(Boolean))].sort().reverse(), [c]);
  const cm = monthOf(F);
  return (
    <div className="glass flex flex-wrap items-end gap-x-4 gap-y-3 rounded-[22px] p-4" role="group" aria-label="Фильтр периода">
      <Tabs value={PRESETS.some(([k]) => k === F.preset) ? F.preset : ""} onValueChange={(p) => set({ ...presetRange(p), preset: p })} className="max-w-full">
        <TabsList className="h-auto max-w-full flex-wrap">{PRESETS.map(([k, l]) => <TabsTrigger key={k} value={k} className="px-3 py-1.5">{l}</TabsTrigger>)}</TabsList>
      </Tabs>
      <Lbl t="Месяц">
        <Select value={cm || "custom"} onValueChange={(m) => { if (m !== "custom") set({ ...monthRange(m), preset: "custom" }); }}>
          <SelectTrigger className="w-[170px] max-sm:w-[calc(50vw-2.5rem)]" aria-label="Месяц"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="custom">Свой период</SelectItem>{months.map((m) => <SelectItem key={m} value={m}>{MONTHS_FULL[+m.slice(5, 7) - 1]} {m.slice(0, 4)}</SelectItem>)}</SelectContent>
        </Select>
      </Lbl>
      <Lbl t="С"><Input type="date" value={F.from} onChange={(e) => set({ from: e.target.value, preset: "custom" })} className="w-[150px] max-sm:w-[calc(50vw-2.5rem)]" aria-label="С даты" /></Lbl>
      <Lbl t="По"><Input type="date" value={F.to} onChange={(e) => set({ to: e.target.value, preset: "custom" })} className="w-[150px] max-sm:w-[calc(50vw-2.5rem)]" aria-label="По дату" /></Lbl>
      {withPoint && <Lbl t="Точка">
        <Select value={F.point} onValueChange={(point) => set({ point })}>
          <SelectTrigger className="w-[150px] max-sm:w-[calc(50vw-2.5rem)]" aria-label="Точка"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Все точки</SelectItem>{c.points.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </Lbl>}
      {cats && <Lbl t={catLabel}>
        <Select value={F.cat} onValueChange={(cat) => set({ cat })}>
          <SelectTrigger className="w-[190px] max-sm:w-[calc(50vw-2.5rem)]" aria-label={catLabel}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Все категории</SelectItem>{c.cats.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </Lbl>}
      {kinds && <Lbl t="Вид линзы">
        <Select value={F.lk} onValueChange={(lk) => set({ lk })}>
          <SelectTrigger className="w-[190px] max-sm:w-[calc(50vw-2.5rem)]" aria-label="Вид линзы"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Все виды линз</SelectItem>{kinds.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
        </Select>
      </Lbl>}
    </div>
  );
}
