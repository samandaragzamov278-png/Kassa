// Настройка платежей: общие суммы, дни, откуда платим, вкл/выкл — меняются прямо в строке.
import { Ellipsis, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineNumber, InlineText } from "@/components/Inline";
import { cn } from "@/lib/utils";
import type { Data, PayItem } from "@/lib/types";
import { KINDS, MNg, SRC, isOn, list } from "./logic";
import { CatIcon } from "./parts";

type Props = { d: Data; tab: PayItem["kind"]; setTab: (k: PayItem["kind"]) => void; onChange: (it: PayItem, patch: Partial<PayItem>) => void; onEdit: (id: string) => void; onAdd: (k: PayItem["kind"]) => void };
const ROW = "grid grid-cols-[minmax(0,1fr)_220px_110px_130px_56px_40px] items-center gap-2.5 max-lg:grid-cols-[minmax(0,1fr)_auto] max-lg:gap-y-1 max-lg:border-b max-lg:border-border max-lg:py-3";

export function Settings({ d, tab, setTab, onChange, onEdit, onAdd }: Props) {
  const L = list(d).filter((it) => it.kind === tab).sort((a, b) => Number(a.on === false) - Number(b.on === false) || (a.kind === "plan" ? String(a.date).localeCompare(String(b.date)) : (a.day || 1) - (b.day || 1)));
  const cnt = (k: string) => list(d).filter((it) => it.kind === k).length;
  return (
    <section className="glass rounded-[26px] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-[17px] font-semibold tracking-tight">Настройка платежей</h2><p className="mt-0.5 text-[13px] text-muted-foreground">Общие суммы и дни. Меняйте прямо в строке — сохраняется сразу. Остальное — «⋯».</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as PayItem["kind"])}><TabsList>{KINDS.map(([k, l]) => <TabsTrigger key={k} value={k}>{l} <span className="ml-1 text-xs text-muted-foreground">{cnt(k)}</span></TabsTrigger>)}</TabsList></Tabs>
          <Button onClick={() => onAdd(tab)}><Plus />Добавить</Button>
        </div>
      </div>
      {!L.length ? <p className="text-[13px] text-muted-foreground">Пока пусто.</p> : (
        <div className="flex flex-col">
          <div className={cn(ROW, "border-b border-border px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase max-lg:hidden")}>
            <span>Платёж</span><span className="text-right">{tab === "debt" ? "Платёж в месяц" : "Сумма"}</span><span>{tab === "plan" ? "Дата" : "День"}</span><span>Откуда</span><span>Вкл.</span><span />
          </div>
          {L.map((it) => {
            const usd = +(it.usd || 0) > 0, tax = it.auto === "tax";
            return (
              <div key={it.id} className={cn(ROW, "rounded-xl px-2 py-1.5 transition hover:bg-muted/70", !isOn(it) && "opacity-55")}>
                <span className="flex min-w-0 items-center gap-2 max-lg:col-span-2"><CatIcon cat={it.cat} size="sm" /><InlineText value={it.name} label="Название" onSave={(name) => onChange(it, { name })} /></span>
                <span className="flex items-center justify-end gap-1 text-[13px] text-muted-foreground whitespace-nowrap max-lg:justify-start">
                  {tax ? <><InlineNumber raw value={it.pct || 0} label="Процент" onSave={(v) => { if (v != null) onChange(it, { pct: v }); }} className="max-w-16" />% безнала</>
                    : usd ? <><InlineNumber value={it.usd} label="Доллары" onSave={(v) => { if (v != null) onChange(it, { usd: v }); }} className="max-w-20" />$ ×<InlineNumber value={it.rate} label="Курс" onSave={(v) => { if (v != null) onChange(it, { rate: v }); }} className="max-w-24" /></>
                    : <InlineNumber value={tab === "debt" ? it.amount || null : it.amount} placeholder={tab === "debt" ? "без графика" : "0"} label="Сумма" onSave={(v) => onChange(it, { amount: v ?? 0 })} />}
                </span>
                <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  {tab === "plan" ? <input type="date" aria-label="Дата" value={it.date || ""} onChange={(e) => e.target.value && onChange(it, { date: e.target.value })} className="rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-border focus:border-primary focus:outline-none" />
                    : <><InlineNumber raw value={it.day || 1} label="День месяца" onSave={(v) => { if (v != null) onChange(it, { day: Math.min(31, Math.max(1, Math.round(v))) }); }} className="max-w-12 text-center" />{it.freq === "year" ? MNg[(it.mon || 1) - 1] : "-го"}</>}
                </span>
                <span><Select value={it.src} onValueChange={(v) => onChange(it, { src: v as PayItem["src"] })}><SelectTrigger size="sm" className="w-28" aria-label="Откуда платим"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SRC).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></span>
                <span><Switch checked={isOn(it)} onCheckedChange={(on) => onChange(it, { on })} aria-label="Платёж действует" /></span>
                <span className="max-lg:hidden"><Button variant="ghost" size="icon-sm" onClick={() => onEdit(it.id)} aria-label="Все настройки"><Ellipsis /></Button></span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
