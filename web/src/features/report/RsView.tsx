// «Отчёт по расчётному счёту»: остаток, поступления и расходы со счёта по дням и месяцам (report/<день>: rsStart, rsEnd, bank[]).
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Kpi, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { toast } from "sonner";
import { Seg, Tbl, Td, Tr, usePaging } from "./ui";
import { CAT_NAMES, RP_MF, catOf, dShort, fmt, pl, repDocs, rsByMonth, rsCalc, wdOf, type RsDay } from "./logic";

const mn = (m: string) => RP_MF[+m.slice(5, 7) - 1];
const ls = { get: () => { try { return localStorage.getItem("kassa-web.rs.m") || ""; } catch { return ""; } }, set: (v: string) => { try { localStorage.setItem("kassa-web.rs.m", v); } catch { /* нет хранилища */ } } };
const fm1 = (v: number) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " млн" : fmt(v));

function Chart({ L }: { L: RsDay[] }) {
  const rows = L.filter((x) => x.e != null || x.out || x.in);
  if (rows.length < 2) return <p className="text-[13px] text-muted-foreground">Для графика нужно хотя бы два дня с выпиской.</p>;
  const data = rows.map((x) => ({ d: x.d.slice(8), full: dShort(x.d), in: x.in != null && x.in > 0 ? x.in : 0, out: -x.out, e: x.e }));
  const W = Math.max(0, rows.length * 38);
  return (
    <div className="max-w-full overflow-x-auto" role="img" aria-label="Движение по счёту">
      <div style={{ minWidth: Math.min(W, 1400), height: 260 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="d" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
            <YAxis yAxisId="m" tickFormatter={(v) => fm1(Math.abs(v))} width={64} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis yAxisId="b" orientation="right" hide domain={[0, "dataMax"]} />
            <ReferenceLine yAxisId="m" y={0} stroke="var(--border)" />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12.5 }}
              labelFormatter={(_, p) => (p?.[0]?.payload?.full as string) || ""} formatter={(v, n) => [fmt(Math.abs(+(v as number) || 0)) + " сум", n === "in" ? "Поступило" : n === "out" ? "Списано" : "Остаток вечером"]} />
            <Bar yAxisId="m" dataKey="in" fill="var(--plus)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar yAxisId="m" dataKey="out" fill="var(--minus)" radius={[0, 0, 4, 4]} maxBarSize={22} />
            <Line yAxisId="b" dataKey="e" type="monotone" stroke="var(--primary)" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RsView({ d, onEdit }: { d: Data; onEdit: (day: string | null) => void }) {
  const mu = useMutations();
  const BM = useMemo(() => rsByMonth(d), [d]);
  const [m0, setM] = useState(ls.get), [open, setOpen] = useState<string | null>(null);
  const ms = BM.ms;
  const m = m0 === "all" && ms.length > 1 ? "all" : ms.includes(m0) ? m0 : ms[ms.length - 1];
  const C = useMemo(() => rsCalc(d, m), [d, m]);
  const L = useMemo(() => C.days.slice().reverse(), [C]);
  const openIdx = L.findIndex((x) => x.d === open);
  const pg = usePaging(L.length, "rs-days", openIdx, m);
  if (!ms.length) return <Panel title="Выписок по счёту ещё нет" note="Нажмите «Внести выписку за день» — остатки и расходы со счёта появятся здесь.">{null}</Panel>;
  const lbl = m === "all" ? "за всё время" : "за " + mn(m).toLowerCase(), per = m === "all" ? "" : " · " + mn(m).toLowerCase();
  const cats = CAT_NAMES.filter((c) => ms.some((x) => BM.rows[x].cat[c])).sort((a, b) => ms.reduce((s, x) => s + (BM.rows[x].cat[b] || 0), 0) - ms.reduce((s, x) => s + (BM.rows[x].cat[a] || 0), 0));
  const tot = (c: string) => ms.reduce((s, x) => s + (BM.rows[x].cat[c] || 0), 0), mx = Math.max(1, ...cats.map(tot));
  const setCat = async (day: string, idx: number, c: string) => {
    const R = repDocs(d)[day] || {}, bank = (R.bank || []).slice(), vis = bank.filter((b) => +(b.a as number)), it = vis[idx]; if (!it) return;
    bank[bank.indexOf(it)] = { ...it, c };
    try { await mu.putDoc("report", day, { ...R, date: day, bank, updatedAt: Date.now() }); } catch { toast.error("Не сохранилось — проверьте связь"); }
  };
  const pick = (v: string) => { setM(v); ls.set(v); setOpen(null); };
  return (
    <div className="flex flex-col gap-5">
      <Seg value={m} onChange={pick} label="Месяц" options={[...ms.map((x) => [x, mn(x)] as [string, string]), ...(ms.length > 1 ? [["all", "Все месяцы"] as [string, string]] : [])]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label={"Остаток на " + (C.startD ? dShort(C.startD) : "начало")} value={C.start != null ? fmt(C.start) + " сум" : "—"} sub="утро первого дня с выпиской" />
        <Kpi i={1} label={"Поступило " + lbl} value={"+" + fmt(C.in) + " сум"} tone="plus" sub="терминал, Payme, перечисления" />
        <Kpi i={2} label={"Списано " + lbl} value={"−" + fmt(C.out) + " сум"} sub={`${C.outDays} ${pl(C.outDays, "день", "дня", "дней")} со списаниями`} />
        <Kpi i={3} label={"Остаток на " + (C.endD ? dShort(C.endD) : "конец")} value={C.end != null ? fmt(C.end) + " сум" : "—"} tone="primary" sub="по последней выписке" />
      </div>

      <Panel title={"Движение по дням" + per} note="Зелёное — поступило на счёт, красное — списано, линия — остаток вечером"><Chart L={C.days} /></Panel>

      <Panel title="Расходы по месяцам" note="Все списания со счёта по статьям. Статья определяется по названию расхода; поменять её можно в раскрытом дне ниже.">
        <Tbl head={["Статья", ...ms.map((x) => [mn(x), "r"] as [string, "r"]), ["Итого", "r"], ""]}>
          {cats.map((c) => (
            <Tr key={c}><Td h>{c}</Td>{ms.map((x) => <Td key={x} r l={mn(x)}>{BM.rows[x].cat[c] ? fmt(BM.rows[x].cat[c]) : <span className="text-muted-foreground">—</span>}</Td>)}
              <Td r l="Итого" className="font-semibold">{fmt(tot(c))}</Td>
              <Td className="min-w-28 max-md:hidden"><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${(tot(c) / mx) * 100}%` }} /></div></Td></Tr>))}
          <Tr foot className="bg-muted/40"><Td h>Итого списано</Td>{ms.map((x) => <Td key={x} r l={mn(x)}>{fmt(BM.rows[x].out)}</Td>)}<Td r l="Итого">{fmt(ms.reduce((s, x) => s + BM.rows[x].out, 0))}</Td><Td className="max-md:hidden" /></Tr>
        </Tbl>
        <div className="mt-5">
          <Tbl head={["Месяц", ["Остаток на начало", "r"], ["Поступило", "r"], ["Списано", "r"], ["Остаток на конец", "r"]]}>
            {ms.map((x) => { const r = BM.rows[x]; return (
              <Tr key={x}><Td h><b>{mn(x)}</b></Td><Td r l="Остаток на начало">{r.start != null ? fmt(r.start) : "—"}</Td><Td r l="Поступило" className="text-plus">+{fmt(r.in)}</Td><Td r l="Списано" className="text-minus">−{fmt(r.out)}</Td><Td r l="Остаток на конец" className="font-semibold">{r.end != null ? fmt(r.end) : "—"}</Td></Tr>); })}
          </Tbl>
        </div>
      </Panel>

      <Panel title={"Расходы по дням" + per} note="Нажмите на день, чтобы увидеть все списания, поменять статью или исправить выписку.">
        <Tbl head={["День", ["Утром", "r"], ["Поступило", "r"], ["Списано", "r"], "Расходы", ["Вечером", "r"]]}>
          {L.slice(pg.from, pg.to).map((x) => { const op = open === x.d; return [
            <Tr key={x.d} tap selected={op} onClick={() => setOpen(op ? null : x.d)}>
              <Td h>{dShort(x.d)} <span className="ml-1 text-[12px] font-normal text-muted-foreground">{wdOf(x.d)}</span></Td>
              <Td r l="Утром">{x.s != null ? fmt(x.s) : "—"}</Td>
              <Td r l="Поступило">{x.in != null && x.in > 0.5 ? <span className="text-plus">+{fmt(x.in)}</span> : <span className="text-muted-foreground">—</span>}</Td>
              <Td r l="Списано">{x.out ? <span className="text-minus">−{fmt(x.out)}</span> : <span className="text-muted-foreground">—</span>}</Td>
              <Td l="Расходы" className="max-w-64 text-[12.5px] text-muted-foreground">{x.bank.slice(0, 3).map((b) => b.n).join(", ")}{x.bank.length > 3 ? " …" : ""}</Td>
              <Td r l="Вечером" className="font-semibold">{x.e != null ? fmt(x.e) : "—"}</Td></Tr>,
            op && <tr key={x.d + "-d"} className="max-md:block"><td colSpan={6} className="bg-muted/30 px-3 py-3 max-md:block">
              {x.bank.length ? <Tbl head={["Расход", "Статья", ["Сумма", "r"]]}>
                {x.bank.map((b, i) => (<Tr key={i}><Td h>{b.n}</Td><Td l="Статья"><select aria-label="Статья расхода" value={catOf(b)} onChange={(e) => setCat(x.d, i, e.target.value)} className="h-8 max-w-full rounded-lg border border-input bg-transparent px-2 text-[13px] dark:bg-input/30">
                  {CAT_NAMES.map((c) => <option key={c}>{c}</option>)}</select>{b.c ? <span className="ml-2 text-[12px] text-muted-foreground">вручную</span> : null}</Td><Td r l="Сумма">{fmt(+(b.a as number))}</Td></Tr>))}</Tbl>
                : <p className="text-[13px] text-muted-foreground">Списаний в этот день не было.</p>}
              <Button variant="secondary" className="mt-3" onClick={() => onEdit(x.d)}>Исправить выписку за {dShort(x.d)}</Button>
            </td></tr>]; })}
          {!L.length && <Tr><Td colSpan={6} className="py-4 text-center text-muted-foreground">Нет выписок за период</Td></Tr>}
        </Tbl>
        {pg.bar}
      </Panel>
    </div>
  );
}

