// Форма «Новая продажа» / «Изменить продажу»: одна строка — одна позиция; смешанная оплата, линзы, долг.
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { Field, Sel, digits, fmtIn } from "./parts";
import { LCOAT, LIDX, LTYPES, PAYS, fmt, normPay, normS, payOf, pointColor, todayTash, type SaleX, type Settings } from "./logic";

export type SaleRec = Record<string, unknown>;
type St = { date: string; point: string; check: string; cat: string; product: string; qty: string; price: string; sum: string; pay: string; mx: string[]; debt: string; lType: string; lIndex: string; lCoat: string };
const isLensCat = (c: string) => /очков.*линз/i.test(c);
const empty = (s: Settings, date = todayTash(), point = s.points[0]): St => ({ date, point, check: "", cat: s.cats[0], product: "", qty: "1", price: "", sum: "", pay: PAYS[0], mx: ["", "", "", ""], debt: "", lType: "", lIndex: "", lCoat: "" });
const MIXED = "Смешанная";

export function SaleForm({ sales, settings, editing, onSave, onCancel }: { sales: SaleX[]; settings: Settings; editing: SaleX | null; onSave: (id: string | null, rec: SaleRec) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState<St>(() => empty(settings)), [touched, setTouched] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null), [busy, setBusy] = useState(false);
  const productRef = useRef<HTMLInputElement>(null), priceRef = useRef<HTMLInputElement>(null), qtyRef = useRef<HTMLInputElement>(null), root = useRef<HTMLDivElement>(null);
  const set = <K extends keyof St>(k: K, v: St[K]) => setF((x) => ({ ...x, [k]: v }));
  const note = (t: string, bad?: boolean) => { setMsg({ t, bad }); window.clearTimeout((note as unknown as { t?: number }).t); (note as unknown as { t?: number }).t = window.setTimeout(() => setMsg(null), 5000); };
  const names = useMemo(() => [...new Set(sales.map((s) => s.product).filter(Boolean) as string[])].sort().slice(0, 400), [sales]);

  useEffect(() => {
    if (!editing) return;
    const s = editing, mixed = !!(s.pays && Object.keys(s.pays).length > 1), o = payOf(s), l = s.lens || {};
    setF({ date: s.date, point: s.point, check: s.check || "", cat: s.cat || settings.cats[0], product: s.product || "", qty: String(s.qty ?? 1), price: fmt(s.price || 0), sum: fmt(s.sum), pay: mixed ? MIXED : normPay(s.pay), mx: PAYS.map((p) => (mixed && o[p] ? fmt(o[p]) : "")), debt: s.debt ? fmt(s.debt) : "", lType: l.type || "", lIndex: l.index || "", lCoat: l.coat || "" });
    setTouched(true); root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editing, settings.cats]);
  // точка могла исчезнуть из настроек
  useEffect(() => { if (!settings.points.includes(f.point)) setF((x) => ({ ...x, point: settings.points[0] })); }, [settings.points, f.point]);

  const autoSum = (qty: string, price: string, t = touched) => { if (t) return ""; const q = digits(qty), p = digits(price); return q && p ? fmt(q * p) : ""; };
  const setQty = (v: string) => { const n = digits(v); const qty = isNaN(n) ? "" : String(n); setF((x) => ({ ...x, qty, sum: touched ? x.sum : autoSum(qty, x.price) })); };
  const setPrice = (v: string) => { const price = fmtIn(v, fmt); setF((x) => ({ ...x, price, sum: touched ? x.sum : autoSum(x.qty, price) })); };
  const setSum = (v: string) => { const sum = fmtIn(v, fmt); setTouched(sum !== ""); setF((x) => ({ ...x, sum })); };
  const pickProduct = () => {
    const n = normS(f.product); if (!n) return;
    const last = [...sales].filter((s) => normS(s.product) === n).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    if (!last) return;
    setF((x) => { const price = x.price || fmt(last.price || 0); return { ...x, price, cat: last.cat && settings.cats.includes(last.cat) ? last.cat : x.cat, sum: touched ? x.sum : autoSum(x.qty, price) }; });
  };
  const reset = (keep?: boolean) => { setF((x) => ({ ...empty(settings, keep ? x.date : todayTash(), x.point), check: keep ? x.check : "", cat: x.cat, pay: x.pay })); setTouched(false); };
  const cancel = () => { reset(); onCancel(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = f.product.trim(), qty = digits(f.qty) || 0, price = digits(f.price) || 0;
    let sum = digits(f.sum); if (isNaN(sum)) sum = qty * price;
    if (!f.date) return note("Укажите дату.", true);
    if (!product) { note("Впишите товар.", true); productRef.current?.focus(); return; }
    if (!qty) { note("Количество должно быть больше нуля.", true); qtyRef.current?.focus(); return; }
    if (!sum) { note("Укажите цену или сумму.", true); priceRef.current?.focus(); return; }
    const rec: SaleRec = { date: f.date, point: f.point, cat: f.cat, product, qty, price: price || Math.round(sum / qty), sum, check: f.check.trim() };
    if (f.pay === MIXED) {
      const pays: Record<string, number> = {}; PAYS.forEach((p, i) => { const v = digits(f.mx[i]); if (v) pays[p] = v; });
      const tot = Object.values(pays).reduce((a, v) => a + v, 0);
      if (!tot) return note("Впишите, сколько оплачено каждым способом.", true);
      if (tot !== sum) return note(`Сумма частей (${fmt(tot)}) не равна оплаченному (${fmt(sum)}).`, true);
      rec.pays = pays; rec.pay = MIXED;
    } else { rec.pay = f.pay; rec.pays = null; }
    if (isLensCat(String(rec.cat))) { const l: Record<string, string> = {}; if (f.lType) l.type = f.lType; if (f.lIndex) l.index = f.lIndex; if (f.lCoat) l.coat = f.lCoat; rec.lens = Object.keys(l).length ? l : null; }
    const debt = digits(f.debt); rec.debt = !isNaN(debt) && debt > 0 ? debt : undefined;
    setBusy(true);
    try {
      if (editing) { await onSave(editing.id, rec); note("Продажа обновлена"); reset(true); }
      else { await onSave(null, { ...rec, createdAt: Date.now() }); note(`Добавлено: ${product}, ${fmt(sum)} сум`); reset(true); }
      productRef.current?.focus();
    } catch { note("Не удалось сохранить. Попробуйте ещё раз.", true); } finally { setBusy(false); }
  };
  const mixed = f.pay === MIXED;
  const mxTot = f.mx.reduce((a, v) => a + (digits(v) || 0), 0);

  return (
    <div ref={root}><Panel title={editing ? "Изменить продажу" : "Новая продажа"} note="Одна строка — одна позиция. Сумма = кол-во × цена; если заплатили меньше, впишите фактическую сумму, разница считается скидкой.">
      <form onSubmit={submit} autoComplete="off" className="grid gap-3">
        <div className="grid gap-1.5"><span className="text-[12px] text-muted-foreground">Точка</span>
          <div role="radiogroup" aria-label="Точка" className="flex flex-wrap gap-1.5">{settings.points.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={f.point === p} onClick={() => set("point", p)}
              className={cn("inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition outline-none focus-visible:ring-3 focus-visible:ring-primary/30", f.point === p ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted")}>
              <i className="size-2.5 rounded-full" style={{ background: pointColor(p, settings.points) }} />{p}</button>))}</div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Дата"><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} aria-label="Дата" className="num" /></Field>
          <Field label="Чек №"><Input value={f.check} onChange={(e) => set("check", e.target.value)} placeholder="необязательно" aria-label="Чек №" /></Field>
          <Field label="Категория" className="sm:col-span-2"><Sel label="Категория" value={f.cat} onChange={(v) => set("cat", v)} options={settings.cats.includes(f.cat) ? settings.cats : [f.cat, ...settings.cats]} /></Field>
          <Field label="Товар" className="sm:col-span-2"><Input ref={productRef} list="sales-products" value={f.product} onChange={(e) => set("product", e.target.value)} onBlur={pickProduct} onInput={(e) => { if (!(e.nativeEvent as InputEvent).inputType) pickProduct(); }} placeholder="Например: Оправа 5802 или Линзы 1.61 блю-блок" aria-label="Товар" /></Field>
          <datalist id="sales-products">{names.map((n) => <option key={n} value={n} />)}</datalist>
          <Field label="Кол-во"><Input ref={qtyRef} inputMode="numeric" value={f.qty} onChange={(e) => setQty(e.target.value)} aria-label="Количество" className="num" /></Field>
          <Field label="Цена, сум"><Input ref={priceRef} inputMode="numeric" value={f.price} onChange={(e) => setPrice(e.target.value)} placeholder="450 000" aria-label="Цена" className="num" /></Field>
          <Field label="Оплачено, сум"><Input inputMode="numeric" value={f.sum} onChange={(e) => setSum(e.target.value)} placeholder="авто" aria-label="Оплачено" className="num" /></Field>
          <Field label="Оплата"><Sel label="Оплата" value={f.pay} onChange={(v) => set("pay", v)} options={[...PAYS, MIXED]} /></Field>
        </div>
        {mixed && <div className="glass-inner grid gap-3 rounded-2xl p-3 sm:grid-cols-2">
          {PAYS.map((p, i) => <Field key={p} label={p === "Наличные" ? "Наличные" : p === "Терминал" ? "Терминал" : p}><Input inputMode="numeric" value={f.mx[i]} aria-label={"Оплачено: " + p} className="num" onChange={(e) => setF((x) => ({ ...x, mx: x.mx.map((v, j) => (j === i ? fmtIn(e.target.value, fmt) : v)) }))} /></Field>)}
          <p className={cn("text-[12.5px] sm:col-span-2", mxTot && mxTot === (digits(f.sum) || 0) ? "text-plus" : "text-muted-foreground")}>Сумма частей: <b className="num">{fmt(mxTot)}</b> из <b className="num">{fmt(digits(f.sum) || 0)}</b></p></div>}
        {isLensCat(f.cat) && <div className="glass-inner grid gap-3 rounded-2xl p-3 sm:grid-cols-3">
          <Field label="Вид линзы"><Sel label="Вид линзы" value={f.lType} onChange={(v) => set("lType", v)} options={[{ v: "", l: "определить по названию" }, ...LTYPES]} /></Field>
          <Field label="Индекс"><Sel label="Индекс" value={f.lIndex} onChange={(v) => set("lIndex", v)} options={[{ v: "", l: "определить по названию" }, ...LIDX]} /></Field>
          <Field label="Покрытие"><Sel label="Покрытие" value={f.lCoat} onChange={(v) => set("lCoat", v)} options={[{ v: "", l: "определить по названию" }, ...LCOAT]} /></Field></div>}
        <Field label="Долг, сум (необязательно)"><Input inputMode="numeric" value={f.debt} onChange={(e) => set("debt", fmtIn(e.target.value, fmt))} placeholder="если покупатель ещё должен" aria-label="Долг" className="num" /></Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy}>{editing ? "Сохранить изменения" : "Добавить продажу"}</Button>
          {editing && <Button type="button" variant="secondary" onClick={cancel}>Отменить правку</Button>}
          <span role="status" className={cn("text-[13px]", msg?.bad ? "text-minus" : "text-plus")}>{msg?.t}</span>
        </div>
      </form>
    </Panel></div>
  );
}
