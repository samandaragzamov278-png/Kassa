// Добавить или изменить расход/приход; шаблоны — одним нажатием заполняют форму.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Entry, Template } from "@/lib/types";
import { TAGS, fmt, tagAuto, todayTash } from "./logic";

export type FormVal = { type: "exp" | "inc"; name: string; amount: number; cat: string; branch: string; date: string; fund: string; tag: string; saveTpl: boolean };
type Props = { templates: Template[]; editing: Entry | null; reserveBal: number; onSubmit: (v: FormVal) => Promise<void>; onCancel: () => void; onDelTpl: (id: string) => void; focusKey: number };
const digits = (s: string) => { const v = String(s || "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
type FState = { type: "exp" | "inc"; name: string; amount: string; cat: string; branch: string; date: string; fund: string; tag: string; saveTpl: boolean };
const empty = (date = todayTash()): FState => ({ type: "exp", name: "", amount: "", cat: "op", branch: "Премиум", date, fund: "", tag: "", saveTpl: false });

export function AddForm({ templates, editing, reserveBal, onSubmit, onCancel, onDelTpl, focusKey }: Props) {
  const [f, setF] = useState<FState>(empty());
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null), [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null), amtRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) setF({ type: editing.type, name: editing.name, amount: fmt(editing.amount || 0), cat: editing.cat || "op", branch: editing.branch || "Общее", date: editing.date || "", fund: editing.fund || "", tag: editing.tag || "", saveTpl: false }); }, [editing]);
  useEffect(() => { if (focusKey) nameRef.current?.focus(); }, [focusKey]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const inc = f.type === "inc";
  const tpl = (t: Template) => { setF((x) => ({ ...x, type: t.type || "exp", name: t.name, amount: t.amount ? fmt(t.amount) : "", cat: t.cat || "op", branch: t.branch || "Премиум", fund: t.fund || "", tag: t.tag || "" })); requestAnimationFrame(() => { amtRef.current?.focus(); amtRef.current?.select(); }); };
  const groups: [string, string][] = [["op", "Операционные"], ["oth", "Прочие"], ["inc", "Приходы"]];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim(), amount = digits(f.amount);
    if (!name) { setMsg({ t: "Впишите название.", bad: true }); nameRef.current?.focus(); return; }
    if (!amount || amount <= 0) { setMsg({ t: "Сумма должна быть больше нуля.", bad: true }); amtRef.current?.focus(); return; }
    if (!inc && f.fund === "reserve" && !editing && amount > reserveBal) { setMsg({ t: `В резерве только ${fmt(reserveBal)} сум — пополните резерв или выберите «Касса».`, bad: true }); return; }
    setBusy(true);
    try { await onSubmit({ ...f, name, amount }); setMsg({ t: editing ? "Запись обновлена" : `${inc ? "Приход" : "Расход"} добавлен: ${fmt(amount)} сум` }); setF(empty(f.date)); }
    catch { setMsg({ t: "Не удалось сохранить. Попробуйте ещё раз.", bad: true }); } finally { setBusy(false); setTimeout(() => setMsg(null), 4500); }
  };
  return (
    <div>
      {templates.length ? <div className="mb-4 flex flex-col gap-2">{groups.map(([k, n]) => { const g = templates.filter((t) => (t.type === "inc" ? "inc" : t.cat) === k).sort((a, b) => (a.order || 99) - (b.order || 99) || a.name.localeCompare(b.name)); return g.length ? (
        <div key={k}><span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{n}</span>
          <div className="mt-1 flex flex-wrap gap-1.5">{g.map((t) => (
            <span key={t.id} className="glass-inner inline-flex items-center gap-1.5 rounded-full py-1 pr-1 pl-3 text-[13px]">
              <button type="button" onClick={() => tpl(t)} className="inline-flex items-center gap-1.5 font-medium"><i className={cn("size-2 rounded-full", t.type === "inc" ? "bg-plus" : t.cat === "op" ? "bg-primary" : "bg-warn")} />{t.name}{t.amount ? <span className="num text-muted-foreground">{fmt(t.amount)}</span> : null}</button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={"Удалить шаблон " + t.name} onClick={() => onDelTpl(t.id)}><X /></Button></span>))}</div></div>) : null; })}</div>
        : <p className="mb-4 text-[13px] text-muted-foreground">Шаблонов пока нет. Отметьте «сохранить как шаблон» при добавлении расхода.</p>}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1.5"><Label>Тип</Label><Select value={f.type} onValueChange={(v) => set("type", v as "exp" | "inc")}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="exp">Расход</SelectItem><SelectItem value="inc">Приход</SelectItem></SelectContent></Select></div>
        <div className="grid gap-1.5 xl:col-span-2"><Label>Название</Label><Input ref={nameRef} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Например: Премиум за такси" /></div>
        <div className="grid gap-1.5"><Label>Сумма</Label><Input ref={amtRef} value={f.amount} onChange={(e) => { const v = digits(e.target.value); set("amount", isNaN(v) ? "" : fmt(v)); }} inputMode="numeric" placeholder="0" className="num" /></div>
        {!inc && <div className="grid gap-1.5"><Label>Вид расхода</Label><Select value={f.cat} onValueChange={(v) => set("cat", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="op">Операционный</SelectItem><SelectItem value="oth">Прочий</SelectItem></SelectContent></Select></div>}
        <div className="grid gap-1.5"><Label>Точка</Label><Select value={f.branch} onValueChange={(v) => set("branch", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["Премиум", "Яшнабад", "Общее"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label>Дата</Label><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></div>
        {!inc && <div className="grid gap-1.5"><Label>Откуда деньги</Label><Select value={f.fund || "kassa"} onValueChange={(v) => set("fund", v === "kassa" ? "" : v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kassa">Касса</SelectItem><SelectItem value="reserve">Резерв · {fmt(reserveBal)}</SelectItem></SelectContent></Select></div>}
        {!inc && <div className="grid gap-1.5"><Label>Тег</Label><Select value={f.tag || "auto"} onValueChange={(v) => set("tag", v === "auto" ? "" : v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="auto">Авто · {tagAuto(f.name)}</SelectItem>{[...TAGS.map((t) => t[0]), "Прочее"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
          <Button type="submit" size="lg" disabled={busy}>{editing ? "Сохранить изменения" : "Добавить"}</Button>
          {editing && <Button type="button" variant="secondary" size="lg" onClick={onCancel}>Отмена</Button>}
          {!editing && <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={f.saveTpl} onCheckedChange={(v) => set("saveTpl", !!v)} />сохранить как шаблон</label>}
          {msg && <span className={cn("text-[13px]", msg.bad ? "text-minus" : "text-plus")}>{msg.t}</span>}
        </div>
      </form>
    </div>
  );
}
