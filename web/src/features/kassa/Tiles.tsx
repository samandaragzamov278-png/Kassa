// Четыре плитки Кассы: должно быть, факт (с пересчётом), недостача/излишек, резерв (с пополнением).
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CashRec } from "@/lib/types";
import { fmt, monthName, type Kassa } from "./logic";

const digits = (s: string) => { const v = String(s || "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
const when = (at: number) => new Date(at + 5 * 3600e3).toISOString().replace(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d).*/, "$3.$2, $4:$5");
const Tile = ({ i, hero, children, className }: { i: number; hero?: boolean; children: React.ReactNode; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: i * 0.05, duration: 0.45 }} whileHover={{ y: -4 }}
    className={cn("flex min-w-0 flex-col gap-1.5 rounded-[26px] p-5", hero ? "bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_14px_36px_rgb(10_132_255/0.38)]" : "glass", className)}>{children}</motion.div>
);
const Eyebrow = ({ children, light }: { children: React.ReactNode; light?: boolean }) => <span className={cn("text-[11px] font-semibold tracking-wide uppercase", light ? "text-white/85" : "text-muted-foreground")}>{children}</span>;

type Props = { c: Kassa; M: string; isLast: boolean; rec: CashRec | null; st: { actual: number; afterExp: number; afterInc: number } | null; lastRecNote: string;
  rsv: { bal: number; inn: number; out: number; n: number; mIn: number; mOut: number }; onCash: (v: number) => Promise<void>; onReserve: (v: number, from: "kassa" | "out") => Promise<void> };

export function Tiles({ c, M, isLast, rec, st, lastRecNote, rsv, onCash, onReserve }: Props) {
  const [cash, setCash] = useState(""), [rv, setRv] = useState(""), [from, setFrom] = useState<"kassa" | "out">("kassa"), [msg, setMsg] = useState(""), [rmsg, setRmsg] = useState("");
  const diff = st ? c.expected - st.actual : null;
  const fmtIn = (s: string) => { const v = digits(s); return isNaN(v) ? "" : fmt(v); };
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile i={0} hero>
        <Eyebrow light>{isLast ? "Должно быть на руках" : `Должно быть на конец месяца · ${monthName(M).toLowerCase()}`}</Eyebrow>
        <span className="num my-auto text-[30px] font-semibold tracking-tight">{fmt(c.expected)} сум</span>
        <span className="text-[12.5px] text-white/85">{!isLast && "месяц закрыт · "}расходы: операционные {fmt(c.sOp)} · прочие {fmt(c.sOth)}{c.saved ? ` · ${c.saved > 0 ? "сэкономили" : "перерасход"} ${fmt(Math.abs(c.saved))}` : ""}</span>
      </Tile>
      <Tile i={1}>
        <Eyebrow>{isLast ? "Фактическая наличка сейчас" : "Фактическая наличка на конец месяца"}</Eyebrow>
        <span className="num text-[26px] font-semibold tracking-tight">{st ? fmt(st.actual) + " сум" : "—"}</span>
        <span className="text-[12.5px] text-muted-foreground">{rec ? <>Пересчёт {when(rec.at)}: {fmt(rec.amount)}{st?.afterExp ? ` · после него расходы −${fmt(st.afterExp)}` : ""}{st?.afterInc ? ` · приходы +${fmt(st.afterInc)}` : ""}</> : lastRecNote}</span>
        {isLast && <form className="mt-auto flex gap-2 pt-2" onSubmit={async (e) => { e.preventDefault(); const v = digits(cash); if (isNaN(v)) { setMsg("Введите сумму цифрами"); return; } try { await onCash(v); setCash(""); setMsg(""); } catch { setMsg("Не удалось сохранить, попробуйте ещё раз"); } }}>
          <Input value={cash} onChange={(e) => setCash(fmtIn(e.target.value))} inputMode="numeric" placeholder="Новый пересчёт кассы" aria-label="Сколько наличных в кассе" className="num" />
          <Button type="submit">Пересчитал</Button></form>}
        {msg && <small className="text-xs text-minus">{msg}</small>}
      </Tile>
      <Tile i={2}>
        <Eyebrow>Недостача / излишек</Eyebrow>
        <span className="num text-[26px] font-semibold tracking-tight">{diff == null ? "—" : fmt(Math.abs(diff)) + " сум"}</span>
        <span className={cn("self-start rounded-full px-3 py-1 text-xs font-semibold", diff == null ? "bg-muted text-muted-foreground" : diff > 0 ? "bg-minus-soft text-minus" : diff < 0 ? "bg-warn-soft text-warn" : "bg-plus-soft text-plus")}>
          {diff == null ? (isLast ? "Пересчитайте кассу" : "Не пересчитывали") : diff > 0 ? "Недостача" : diff < 0 ? "Излишек" : "Касса сходится"}</span>
        <span className="mt-auto text-[12.5px] text-muted-foreground">{isLast ? "Новые расходы уменьшают и «должно быть», и фактическую наличку, поэтому разница не меняется" : "По последнему пересчёту кассы за этот месяц"}</span>
      </Tile>
      <Tile i={3}>
        <Eyebrow>Резерв</Eyebrow>
        <span className="num text-[26px] font-semibold tracking-tight">{fmt(rsv.bal)} сум</span>
        <span className="text-[12.5px] text-muted-foreground">{!isLast ? (rsv.mIn || rsv.mOut ? `на конец месяца · за месяц пополнено ${fmt(rsv.mIn)} · потрачено ${fmt(rsv.mOut)}` : rsv.n ? "на конец месяца · в этом месяце движений не было" : "в этом месяце резерва ещё не было")
          : rsv.n ? `пополнено ${fmt(rsv.inn)} · потрачено ${fmt(rsv.out)}` : "резерва пока нет — пополните его ниже"}</span>
        {isLast && <form className="mt-auto flex flex-col gap-2 pt-2" onSubmit={async (e) => { e.preventDefault(); const v = digits(rv); if (isNaN(v) || v <= 0) { setRmsg("Введите сумму пополнения цифрами"); return; } try { await onReserve(v, from); setRv(""); setRmsg(""); } catch { setRmsg("Не удалось сохранить, попробуйте ещё раз"); } }}>
          <Input value={rv} onChange={(e) => setRv(fmtIn(e.target.value))} inputMode="numeric" placeholder="Сумма пополнения" aria-label="Сумма пополнения резерва" className="num" />
          <div className="flex gap-2"><Select value={from} onValueChange={(x) => setFrom(x as "kassa" | "out")}><SelectTrigger className="flex-1" aria-label="Откуда пополнение"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="kassa">из кассы</SelectItem><SelectItem value="out">со стороны</SelectItem></SelectContent></Select><Button type="submit">Пополнить</Button></div>
        </form>}
        {rmsg && <small className="text-xs text-minus">{rmsg}</small>}
      </Tile>
    </div>
  );
}
