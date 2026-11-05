// Боковая панель со всеми настройками платежа (React Hook Form + Zod).
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Data, PayItem } from "@/lib/types";
import { CATS, KINDS, MN, SRC, addM, cashless, dLong, fmt, num, todayTash } from "./logic";
import { CatIcon } from "./parts";

const schema = z.object({
  kind: z.enum(["fixed", "plan", "debt"]), cat: z.string(), name: z.string().trim().min(1, "Укажите название"), src: z.enum(["bank", "cash", "founder"]), point: z.string(),
  cur: z.enum(["sum", "usd"]), tax: z.boolean(), pct: z.string(), amount: z.string(), usd: z.string(), rate: z.string(), freq: z.enum(["month", "year"]), day: z.string(), mon: z.string(),
  date: z.string(), from: z.string(), to: z.string(), total: z.string(), totalUsd: z.string(), paid0: z.string(), match: z.string(), note: z.string(), on: z.boolean(),
}).refine((v) => v.kind !== "plan" || !!v.date, { path: ["date"], message: "Укажите дату платежа" });
type F = z.infer<typeof schema>;
const s = (v: number | undefined | null) => (v == null || v === 0 ? "" : fmt(v));

function toForm(it: Partial<PayItem> | null, kind: PayItem["kind"], M: string): F {
  const x = it || {};
  return { kind: x.kind || kind, cat: x.cat || (kind === "debt" ? "debt" : "other"), name: x.name || "", src: x.src || "bank", point: x.point || "Общее", cur: +(x.usd || 0) > 0 ? "usd" : "sum",
    tax: x.auto === "tax", pct: String(x.pct ?? 4), amount: s(x.amount), usd: s(x.usd), rate: s(x.rate), freq: x.freq || "month", day: String(x.day || 1), mon: String(x.mon || 1),
    date: x.date || "", from: x.from ?? (it ? "" : M), to: x.to || "", total: s(x.total), totalUsd: s(x.totalUsd), paid0: s(x.paid0), match: x.match || "", note: x.note || "", on: x.on !== false };
}
function fromForm(f: F, old: PayItem | null): Omit<PayItem, "id"> {
  const o: Omit<PayItem, "id"> = { name: f.name.trim(), kind: f.kind, cat: f.cat as PayItem["cat"], src: f.src, point: f.point || "Общее", match: f.match.trim(), note: f.note.trim(), on: f.on, createdAt: old?.createdAt || Date.now() - 1000 };
  if (f.cat === "tax" && f.tax) { o.auto = "tax"; o.pct = num(f.pct) || 0; } else if (f.cur === "usd") { o.usd = num(f.usd) || 0; o.rate = num(f.rate) || 0; } else o.amount = num(f.amount) || 0;
  if (f.kind === "plan") o.date = f.date;
  else { o.freq = f.freq; o.day = Math.min(31, Math.max(1, Math.round(num(f.day) || 1))); if (o.freq === "year") o.mon = +f.mon || 1; if (f.from) o.from = f.from; if (f.to) o.to = f.to; }
  if (f.kind === "debt") { if (f.cur === "usd" && (num(f.totalUsd) || 0) > 0) o.totalUsd = num(f.totalUsd)!; else if ((num(f.total) || 0) > 0) o.total = num(f.total)!; if ((num(f.paid0) || 0) > 0) o.paid0 = num(f.paid0)!; if (old?.pays) o.pays = old.pays; }
  return o;
}

type Props = { d: Data; M: string; open: string | null; newKind: PayItem["kind"]; onClose: () => void;
  onSave: (id: string, it: Omit<PayItem, "id">) => Promise<void>; onDelete: (id: string) => Promise<void> };

const Seg = ({ value, opts, onChange }: { value: string; opts: [string, string][]; onChange: (v: string) => void }) => (
  <Tabs value={value} onValueChange={onChange}><TabsList>{opts.map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}</TabsList></Tabs>
);
const Field = ({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("flex min-w-0 flex-col gap-1.5", className)}><Label className="text-[12.5px] font-medium text-muted-foreground">{label}</Label>{children}
    {error ? <small className="text-xs text-minus">{error}</small> : hint ? <small className="text-xs text-muted-foreground">{hint}</small> : null}</div>
);

export function Editor({ d, M, open, newKind, onClose, onSave, onDelete }: Props) {
  const cur = open && open !== "new" ? d.items[open] || null : null;
  const form = useForm<F>({ resolver: zodResolver(schema), defaultValues: toForm(cur, newKind, M) });
  const [confirmDel, setConfirmDel] = useState(false), [busy, setBusy] = useState(false);
  const [pd, setPd] = useState(todayTash()), [pa, setPa] = useState("");
  useEffect(() => { if (open) { form.reset(toForm(cur, newKind, M)); setConfirmDel(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useWatch({ control: form.control }) as F;
  const set = <K extends keyof F>(k: K, val: F[K]) => form.setValue(k, val as never, { shouldDirty: true });
  const fmtOnBlur = (k: keyof F) => () => { const x = num(form.getValues(k)); form.setValue(k, (x == null ? "" : fmt(x)) as never); };
  const pm = addM(M, -1), usd = v.cur === "usd", tax = v.cat === "tax" && v.tax;
  const am = usd ? Math.round((num(v.usd) || 0) * (num(v.rate) || 0)) : 0;
  const submit = form.handleSubmit(async (f) => { setBusy(true); try { await onSave(open === "new" ? "pay_" + Date.now().toString(36) : open!, fromForm(f, cur)); onClose(); } finally { setBusy(false); } });
  const pays = cur?.pays || [];
  const savePays = (next: PayItem["pays"]) => cur && onSave(cur.id, { ...cur, pays: next });
  const reg = (k: keyof F, money?: boolean) => ({ ...form.register(k), ...(money ? { onBlur: fmtOnBlur(k), inputMode: "decimal" as const } : {}) });

  return (
    <Sheet open={!!open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="glass w-full gap-0 border-l-0 p-0 sm:max-w-[460px]">
        <SheetHeader className="flex-row items-center gap-3 border-b border-border p-5">
          <CatIcon cat={v.cat} /><div className="min-w-0"><SheetTitle className="truncate text-[17px]">{cur ? cur.name : "Новый платёж"}</SheetTitle>
            <SheetDescription>{v.kind === "debt" ? "Долг: общая сумма и, если есть, платёж в месяц" : v.kind === "plan" ? "Разовый платёж в определённый день" : "Повторяется каждый месяц или раз в год"}</SheetDescription></div>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
            <Field label="Вид"><Seg value={v.kind} opts={KINDS as [string, string][]} onChange={(k) => { set("kind", k as F["kind"]); if (k === "debt" && v.cat === "other") set("cat", "debt"); }} /></Field>
            <Field label="Статья"><div className="flex flex-wrap gap-1.5">{Object.entries(CATS).map(([k, l]) => (
              <button key={k} type="button" onClick={() => { set("cat", k); if (k !== "tax") set("tax", false); }}
                className={cn("inline-flex items-center gap-1.5 rounded-xl border py-1 pr-3 pl-1 text-[13px] transition", v.cat === k ? "border-primary bg-accent font-semibold" : "border-border hover:border-primary/40")}>
                <CatIcon cat={k} size="sm" />{l}</button>))}</div></Field>
            <Field label="Название" error={form.formState.errors.name?.message}><Input {...reg("name")} placeholder="Например: Аренда Премиума" /></Field>
            <div className="flex flex-col gap-4">
              <Field label="Откуда платим" hint={v.src === "founder" ? "из личных денег — отмечайте вручную" : "там и ищем оплату"}><Seg value={v.src} opts={Object.entries(SRC)} onChange={(x) => set("src", x as F["src"])} /></Field>
              <Field label="Точка"><Select value={v.point} onValueChange={(x) => set("point", x)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{["Общее", ...d.points].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Field>
            </div>
            {v.cat === "tax" && <label className="flex items-center gap-2.5 text-sm"><Switch checked={v.tax} onCheckedChange={(x) => { set("tax", x); if (x && !v.pct) set("pct", "4"); }} />Считать сам: процент с безнала прошлого месяца</label>}
            {tax ? <Field label="Процент с безнала" hint={`за ${MN[+pm.slice(5, 7) - 1].toLowerCase()}: ${fmt(cashless(d, pm))} сум безнала`}><Input {...reg("pct")} inputMode="decimal" /></Field> : <>
              <Field label="Валюта"><Seg value={v.cur} opts={[["sum", "Сумы"], ["usd", "Доллары"]]} onChange={(x) => set("cur", x as F["cur"])} /></Field>
              {usd ? <div className="grid grid-cols-2 gap-3"><Field label={v.kind === "debt" ? "Платёж в месяц, $" : "Сумма, $"}><Input {...reg("usd", true)} /></Field><Field label="Курс" hint={am ? `≈ ${fmt(am)} сум` : ""}><Input {...reg("rate", true)} /></Field></div>
                : <Field label={v.kind === "debt" ? "Платёж в месяц, сум" : "Сумма, сум"} hint={v.kind === "debt" ? "пусто — без графика платежей" : ""}><Input {...reg("amount", true)} /></Field>}
            </>}
            {v.kind === "plan" ? <Field label="Дата платежа" error={form.formState.errors.date?.message}><Input type="date" {...reg("date")} /></Field> : <>
              <Field label="Как часто"><Seg value={v.freq} opts={[["month", "Каждый месяц"], ["year", "Раз в год"]]} onChange={(x) => set("freq", x as F["freq"])} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="День месяца" hint="нет такого дня — последний"><Input {...reg("day")} inputMode="numeric" /></Field>
                {v.freq === "year" ? <Field label="Месяц"><Select value={v.mon} onValueChange={(x) => set("mon", x)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{MN.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></Field> : <span />}</div>
              <div className="grid grid-cols-2 gap-3"><Field label="Действует с"><Input type="month" {...reg("from")} /></Field><Field label="Действует по" hint="пусто — без конца"><Input type="month" {...reg("to")} /></Field></div>
            </>}
            {v.kind === "debt" && <div className="grid grid-cols-2 gap-3">{usd ? <Field label="Сумма долга, $"><Input {...reg("totalUsd", true)} /></Field> : <Field label="Сумма долга, сум"><Input {...reg("total", true)} /></Field>}<Field label="Погашено до учёта"><Input {...reg("paid0", true)} /></Field></div>}
            <Field label="Слова для поиска в выписке и Кассе" hint="через запятую; «-ндфл» — исключить"><Input {...reg("match")} placeholder="например: кредит" /></Field>
            <Field label="Примечание"><Input {...reg("note")} /></Field>
            <label className="flex items-center gap-2.5 text-sm"><Switch checked={v.on} onCheckedChange={(x) => set("on", x)} />Платёж действует</label>
            {v.kind === "debt" && cur && (
              <div className="glass-inner rounded-2xl p-4">
                <h4 className="mb-2 text-[13.5px] font-semibold">Погашения вручную</h4>
                {pays.map((p, i) => <div key={i} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-[13px] last:border-0"><span>{p.date ? dLong(p.date) + " " + p.date.slice(0, 4) : "—"}{p.note ? ` · ${p.note}` : ""}</span>
                  <span className="flex items-center gap-1"><b className="num">{fmt(p.amount)}</b><Button type="button" variant="ghost" size="icon-xs" aria-label="Удалить погашение" onClick={() => savePays(pays.filter((_, j) => j !== i))}><X /></Button></span></div>)}
                {!pays.length && <p className="text-[13px] text-muted-foreground">Пока нет. Погашения из выписки и Кассы считаются сами.</p>}
                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><Input type="date" value={pd} onChange={(e) => setPd(e.target.value)} aria-label="Дата погашения" />
                  <Input value={pa} onChange={(e) => setPa(e.target.value)} onBlur={() => { const x = num(pa); setPa(x == null ? "" : fmt(x)); }} inputMode="decimal" placeholder="Сумма" aria-label="Сумма погашения" />
                  <Button type="button" variant="secondary" size="icon" aria-label="Добавить погашение" onClick={() => { const a = num(pa); if (a) { savePays([...pays, { date: pd || todayTash(), amount: a }]); setPa(""); } }}><Plus /></Button></div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border p-5">
            <Button type="submit" disabled={busy}>Сохранить</Button><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
            {cur && <Button type="button" variant="destructive" className="ml-auto" onClick={async () => { if (!confirmDel) { setConfirmDel(true); return; } await onDelete(cur.id); onClose(); }}><Trash2 />{confirmDel ? "Точно удалить?" : "Удалить"}</Button>}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
