// «Выписка за день и ежедневный отчёт оптика»: остатки р/с и расходы со счёта по дням, выручка по точкам,
// гросс нал/безнал, расходы с Б/Ч и выгрузка Excel «Отчёт оптика». Всё, что вписано, сохраняется сразу (report/<день>).
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Download, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { Panel } from "@/components/kit";
import { Badge, DayChips, NumField, Tile } from "./parts";
import { FIELD, Pill, Seg, Tbl, Td, Tr, ptColor, saveBlob } from "./ui";
import { RP_GN_FROM, RP_MF, bankChips, dFull, dShort, fmt, fmt2, monthLabel, pl, repDocs, rpAllDays, rpCalc, rpGNmap, rpMonthDays, rpMonths, rpPrevDoc, rpStat, todayTash, wdOf, type BankRow, type RepDoc } from "./logic";

type Sav = (day: string, patch: Partial<RepDoc>) => Promise<void>;

export function DayReport({ d, open: openReq }: { d: Data; open: { day: string; n: number } | null }) {
  const T = todayTash(), mu = useMutations(), R = repDocs(d);
  const ms = useMemo(() => rpMonths(d, T), [d, T]);
  const [m0, setM] = useState(""), [pk, setPk] = useState<string | null>(null), [pickOpen, setPickOpen] = useState(false), [sel, setSel] = useState<Set<string> | null>(null);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const month = m0 && ms.includes(m0) ? m0 : ms[ms.length - 1];
  const M = useMemo(() => rpCalc(d, month, true, T), [d, month, T]);
  const saleDays = useMemo(() => new Set(d.sales.map((s) => s.date)), [d.sales]);
  const day = pk && M.days.includes(pk) ? pk : (M.days.filter((x) => saleDays.has(x)).pop() || M.days[M.days.length - 1] || "");
  const ex = useMemo(() => rpMonthDays(d, month, false, T), [d, month, T]);
  const ready = ex.filter((x) => rpStat(d, x, T) === "ok").length, all = useMemo(() => rpAllDays(d, T), [d, T]);
  const mName = monthLabel(month), ms2 = [...new Set(all.map((x) => x.slice(0, 7)))];
  // «Исправить выписку за …» из отчёта по счёту: открыть нужный день
  useEffect(() => { if (openReq?.day) { setM(openReq.day.slice(0, 7)); setPk(openReq.day); } }, [openReq]);
  const tm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = () => { setSaved(true); clearTimeout(tm.current); tm.current = setTimeout(() => setSaved(false), 1800); };
  const save: Sav = async (x, patch) => {
    const cur = { date: x, rsStart: null, rsEnd: null, grossCash: null, grossNon: null, bank: [], tr: {}, ...(R[x] || {}), ...patch, updatedAt: Date.now() } as RepDoc & { id?: string };
    delete cur.id;
    try { await mu.putDoc("report", x, cur); flash(); } catch { toast.error("Не сохранилось — проверьте связь"); }
  };

  const exportList = async (list: string[], allMode: boolean) => {
    if (!list.length) { setMsg({ t: "Не выбрано ни одного дня.", bad: true }); return; }
    setBusy(true); setMsg({ t: "Собираю файл…" });
    try {
      const { buildOpticDays } = await import("./optic-xlsx"), x = await buildOpticDays(d, list, T);
      saveBlob(`Отчёт оптика ${allMode ? "(все дни) " : ""}${dShort(x.first)}–${dFull(x.last)}.xlsx`, x.buf);
      setMsg({ t: `Файл сохранён: ${x.count} ${pl(x.count, "лист", "листа", "листов")}` });
    } catch (e) { setMsg({ t: e instanceof Error && e.message === "load" ? "Не загрузился модуль Excel. Проверьте интернет и повторите." : "Не удалось собрать файл.", bad: true }); }
    finally { setBusy(false); }
  };

  const i = M.days.indexOf(day), row = i >= 0 ? M.rows[i] : null, r = row?.r || {};
  const picked = sel ?? new Set(all.filter((x) => x.startsWith(month)));

  return (
    <div className="flex flex-col gap-4" id="rs-day-report">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-[15rem] flex-1 text-[13.5px] text-muted-foreground">{ex.length ? `${mName} · ${ex.length} ${pl(ex.length, "день", "дня", "дней")} в отчёте · выручка и расходы с Б/Ч подставляются сами` : `${mName} · дней с продажами пока нет`}</p>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setPickOpen((v) => !v)} aria-expanded={pickOpen}><CalendarCheck />Выбрать дни</Button>
            <Button disabled={!all.length || busy} onClick={() => exportList(all, true)}><Download />Скачать все дни</Button>
          </div>
          <span className="text-[12px] text-muted-foreground">{all.length ? `${ms2.length > 1 ? RP_MF[+ms2[0].slice(5, 7) - 1].toLowerCase() + " – " + RP_MF[+ms2[ms2.length - 1].slice(5, 7) - 1].toLowerCase() + " " + ms2[ms2.length - 1].slice(0, 4) : monthLabel(ms2[0])} · ${all.length} ${pl(all.length, "лист", "листа", "листов")}` : ""}</span>
          <span role="status" className={cn("min-h-4 text-[12.5px]", msg?.bad ? "text-minus" : "text-plus")}>{msg?.t || ""}</span>
        </div>
      </div>

      {pickOpen && (
        <Panel title="Какие дни выгрузить" note="Нажимайте на дни, чтобы включить или убрать их из файла. «С начала месяца» и «за месяц» в файле всё равно считаются по всем дням месяца."
          action={<Button variant="ghost" size="icon" aria-label="Закрыть" onClick={() => setPickOpen(false)}><X /></Button>}>
          <div className="flex flex-col gap-3">
            {[...new Set(all.map((x) => x.slice(0, 7)))].reverse().map((m) => { const ds = all.filter((x) => x.startsWith(m)), on = ds.filter((x) => picked.has(x)).length;
              const setMany = (v: boolean) => { const n = new Set(picked); ds.forEach((x) => (v ? n.add(x) : n.delete(x))); setSel(n); };
              return (
                <div key={m} className="glass-inner rounded-2xl p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1"><b>{monthLabel(m)}</b><span className="text-[12.5px] text-muted-foreground">{on} из {ds.length}</span><span className="flex-1" />
                    <button type="button" className="text-[12.5px] text-primary" onClick={() => setMany(true)}>весь месяц</button><button type="button" className="text-[12.5px] text-primary" onClick={() => setMany(false)}>убрать месяц</button></div>
                  <div className="flex flex-wrap gap-1.5">{ds.map((x) => (
                    <button key={x} type="button" aria-pressed={picked.has(x)} title={dFull(x)} onClick={() => { const n = new Set(picked); n.has(x) ? n.delete(x) : n.add(x); setSel(n); }}
                      className={cn("flex w-11 flex-col items-center rounded-lg border py-1 transition", picked.has(x) ? "border-primary bg-accent text-accent-foreground" : "border-border opacity-60 hover:opacity-100")}>
                      <b className="num text-[14px] leading-tight">{+x.slice(8)}</b><small className="text-[10px] text-muted-foreground">{wdOf(x)}</small></button>))}</div>
                </div>); })}
            {!all.length && <p className="text-[13px] text-muted-foreground">Дней с продажами пока нет</p>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px]">{picked.size ? <>Выбрано: <b>{picked.size} {pl(picked.size, "день", "дня", "дней")}</b> · в файле будет {picked.size} {pl(picked.size, "лист", "листа", "листов")}</> : "Ничего не выбрано"}</span>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setSel(new Set())}>Снять все</Button><Button variant="secondary" onClick={() => setSel(new Set(all))}>Выбрать все</Button>
              <Button disabled={!picked.size || busy} onClick={() => exportList([...picked], false)}><Download />Скачать выбранные</Button></div>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg value={month} onChange={(m) => { setM(m); setPk(null); }} options={ms.map((m) => [m, monthLabel(m)])} label="Месяц" />
        {ex.length > 0 && <div className="flex min-w-0 items-center gap-3 text-[13px]"><span>Р/с и гросс заполнены: <b className="num">{ready} из {ex.length}</b></span>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-plus" style={{ width: `${(ready / ex.length) * 100}%` }} /></span></div>}
      </div>
      <DayChips days={M.days} value={day} onPick={setPk} label="День отчёта" stat={(x) => rpStat(d, x, T)}
        title={(x) => `${dFull(x)} · ${{ ok: "заполнено", part: "заполнено частично", none: "р/с и гросс не заполнены" }[rpStat(d, x, T)]}`} />

      {row && (<>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile hero label={"Выручка " + dShort(day)} big={fmt(row.tot.sum)} sub={[["нал", row.tot.c], ["терминал", row.tot.t], ["QR", row.tot.q]].concat(row.tot.e ? [["переч.", row.tot.e]] : []).map(([a, b]) => `${a} ${fmt(b as number)}`).join(" · ")} />
          <Tile label="С начала месяца" big={fmt(row.cum.sum)} sub={`${i + 1} ${pl(i + 1, "день", "дня", "дней")} · по ${dShort(day)} включительно`} />
          <Tile label="Расходы дня" big={fmt(row.bankSum + row.bcSum)} sub={`с р/с ${fmt(row.bankSum)} · с Б/Ч ${fmt(row.bcSum)}`} />
          {r.rsEnd != null ? <Tile label="Р/с на конец дня" big={fmt2(r.rsEnd)} sub={r.rsStart != null ? `на начало ${fmt2(r.rsStart)}` : "начало дня не заполнено"} />
            : <Tile label="Р/с на конец дня" big="—" tone="muted" sub={<Pill tone="warn">Не заполнено</Pill>} />}
        </div>

        <Panel title="Выручка по точкам" note="Считается сама из вкладки «Продажи»: Б/Ч — наличные, QR — Payme и QR" action={<Badge auto />}>
          {r.adjNote && <div className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">{r.adjNote}</div>}
          <Tbl head={["Точка", ["Б/Ч", "r"], ["Терминал", "r"], ["QR", "r"], ["Перечисления", "r"], ["Итого", "r"], ["С начала месяца", "r"]]}>
            {M.pts.map((p) => { const o = row.pts[p], z = (v: number) => (v ? fmt(v) : <span className="text-muted-foreground">0</span>);
              return (<Tr key={p}><Td h><span className="inline-flex items-center"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: ptColor(p) }} />{p}</span></Td>
                <Td r l="Б/Ч">{z(o.c)}</Td><Td r l="Терминал">{z(o.t)}</Td><Td r l="QR">{z(o.q)}</Td><Td r l="Перечисления">{z(o.e)}</Td>
                <Td r l="Итого" className="font-semibold">{z(o.sum || 0)}</Td><Td r l="С начала месяца" className="text-muted-foreground">{fmt(row.cum.pts[p] || 0)}</Td></Tr>); })}
            <Tr foot className="bg-muted/40"><Td h>Итого</Td><Td r l="Б/Ч">{fmt(row.tot.c)}</Td><Td r l="Терминал">{fmt(row.tot.t)}</Td><Td r l="QR">{fmt(row.tot.q)}</Td><Td r l="Перечисления">{fmt(row.tot.e)}</Td><Td r l="Итого">{fmt(row.tot.sum)}</Td><Td r l="С начала месяца">{fmt(row.cum.sum)}</Td></Tr>
            <Tr foot><Td h>С начала месяца</Td><Td r l="Б/Ч">{fmt(row.cum.c)}</Td><Td r l="Терминал">{fmt(row.cum.t)}</Td><Td r l="QR">{fmt(row.cum.q)}</Td><Td r l="Перечисления">{fmt(row.cum.e)}</Td><Td r l="Итого">{fmt(row.cum.sum)}</Td><Td className="max-md:hidden" /></Tr>
          </Tbl>
        </Panel>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Panel title="Расчётный счёт" note="Остаток по выписке банка и расходы, списанные со счёта" action={<span className="flex items-center gap-2"><span className={cn("text-[12px] text-plus transition-opacity", saved ? "opacity-100" : "opacity-0")}>Сохранено</span><Badge /></span>}>
            <RsPanel key={day} d={d} day={day} cumBank={row.cum.bank - row.bankSum} save={save} />
          </Panel>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="Гросс нал и безнал" note="Итоговые суммы на конец дня" action={<Badge />}><GrossPanel d={d} day={day} T={T} save={save} /></Panel>
            <Panel title="Расходы с Б/Ч" note="Расходы дня из налички точек — из «Продаж» и «Кассы»" action={<Badge auto />}>
              {row.bc.length ? <div className="flex flex-col">{row.bc.map((b, k) => (
                <div key={k} className="flex items-center gap-2 border-b border-border/60 py-1.5 last:border-0"><span className="size-2 shrink-0 rounded-full" style={{ background: ptColor(b.p) }} /><span className="min-w-0 flex-1 truncate" title={b.n}>{b.n}</span><span className="num font-medium">{fmt(b.a)}</span></div>))}</div>
                : <p className="text-[13px] text-muted-foreground">Расходов с Б/Ч в этот день нет</p>}
              <Sums a={["За день", fmt(row.bcSum)]} b={["За месяц", fmt(row.cum.bc)]} />
            </Panel>
          </div>
        </div>
      </>)}
      {!row && <p className="glass-inner rounded-2xl p-5 text-[13.5px] text-muted-foreground">В этом месяце пока нет дней: нет ни продаж, ни расходов, ни выписки.</p>}
      <p className="text-[12.5px] text-muted-foreground">Всё, что вы вписываете, сохраняется сразу. Кнопка «Скачать все дни» собирает файл «Отчёт оптика»: отдельный лист на каждый день, новые дни сверху, формулы «с начала месяца» и «за месяц» как в вашем файле.</p>
    </div>
  );
}

const Sums = ({ a, b }: { a: [string, string]; b: [string, string] }) => (
  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">{[a, b].map(([l, v]) => <div key={l} className="flex flex-col"><span className="text-[12px] text-muted-foreground">{l}</span><b className="num text-[17px]">{v}</b></div>)}</div>
);

function Fld({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1"><span className="text-[12px] font-medium text-muted-foreground">{label}</span>{children}<span className="min-h-4 text-[12px] text-muted-foreground">{hint}</span></div>;
}

function RsPanel({ d, day, cumBank, save }: { d: Data; day: string; cumBank: number; save: Sav }) {
  const r = repDocs(d)[day] || {}, pe = rpPrevDoc(d, day, "rsEnd");
  const [rows, setRows] = useState<BankRow[]>(() => (Array.isArray(r.bank) ? r.bank : []).map((b) => ({ n: b.n || "", a: b.a == null ? null : +b.a, ...(b.c ? { c: b.c } : {}) })));
  const focusRow = useRef(-1), box = useRef<HTMLDivElement>(null);
  const clean = (x: BankRow[]) => x.filter((b) => String(b.n || "").trim() || b.a).map((b) => ({ ...b, n: String(b.n || "").trim(), a: b.a == null ? 0 : b.a }));
  const commit = (x: BankRow[]) => { setRows(x); return save(day, { bank: clean(x) }); };
  useEffect(() => { if (focusRow.current >= 0) { box.current?.querySelectorAll<HTMLInputElement>("[data-bank]")[focusRow.current * 2 + (rows[focusRow.current]?.n ? 1 : 0)]?.focus(); focusRow.current = -1; } });
  const sum = rows.reduce((a, b) => a + (+(b.a as number) || 0), 0), chips = bankChips(d, rows.map((b) => b.n));
  const fld = (k: "rsStart" | "rsEnd", label: string, prev: { d: string; v: number } | null) => {
    const v = r[k];
    return (
      <Fld label={label} hint={prev ? <>Конец {dShort(prev.d)}: <span className="num">{fmt2(prev.v)}</span>{(v == null || Math.abs(v - prev.v) > 0.004) && <button type="button" className="ml-2 text-primary" onClick={() => save(day, { [k]: prev.v })}>Подставить</button>}</> : null}>
        <NumField label={label} value={v} onCommit={(x) => save(day, { [k]: x })} /></Fld>);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">{fld("rsStart", "Р/с на начало дня", pe)}{fld("rsEnd", "Р/с на конец дня", null)}</div>
      {r.rsStart != null && r.rsEnd != null && <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-[13.5px]"><span>Изменение за день</span><b className={cn("num", r.rsEnd - r.rsStart >= 0 ? "text-plus" : "text-minus")}>{r.rsEnd - r.rsStart >= 0 ? "+" : ""}{fmt2(r.rsEnd - r.rsStart)}</b></div>}
      {pe && r.rsStart != null && Math.abs(r.rsStart - pe.v) > 0.004 && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">Начало дня не совпадает с концом {dShort(pe.d)} (<b className="num">{fmt2(pe.v)}</b>) — разница <b className="num">{fmt2(r.rsStart - pe.v)}</b>. Проверьте выписку.</div>}
      <h3 className="mt-1 text-[14.5px] font-semibold">Расходы с р/с</h3>
      <div ref={box} className="flex flex-col gap-2">
        {rows.map((b, j) => (
          <div key={j} className="flex items-center gap-2">
            <input data-bank aria-label="Название расхода" className={cn(FIELD, "flex-1")} value={b.n} placeholder="Название, например: комиссия банка" autoComplete="off"
              onChange={(e) => setRows(rows.map((x, k) => (k === j ? { ...x, n: e.target.value } : x)))} onBlur={() => commit(rows)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
            <NumField label="Сумма" className="w-32 shrink-0 sm:w-40" placeholder="Сумма" value={b.a} onCommit={(v) => commit(rows.map((x, k) => (k === j ? { ...x, a: v } : x)))} />
            <Button variant="ghost" size="icon" aria-label="Удалить расход" onClick={() => commit(rows.filter((_, k) => k !== j))}><X /></Button>
          </div>))}
        {!rows.length && <p className="text-[13px] text-muted-foreground">Расходов со счёта в этот день нет</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => { focusRow.current = rows.length; setRows([...rows, { n: "", a: null }]); }}><Plus />Добавить расход</Button>
        {chips.map((n) => <button key={n} type="button" className="rounded-full border border-border px-2.5 py-1 text-[12.5px] transition hover:bg-muted" onClick={() => { focusRow.current = rows.length; setRows([...rows, { n, a: null }]); }}>{n}</button>)}
      </div>
      <Sums a={["Итого за день", fmt2(sum) || "0"]} b={["За месяц", fmt2(cumBank + sum) || "0"]} />
    </div>
  );
}

function GrossPanel({ d, day, T, save }: { d: Data; day: string; T: string; save: Sav }) {
  const r = repDocs(d)[day] || {}, pgc = rpPrevDoc(d, day, "grossCash"), pgn = rpPrevDoc(d, day, "grossNon"), gx = rpGNmap(d, T)[day], auto = day >= RP_GN_FROM;
  const hint = (p: { d: string; v: number } | null, v: number | null | undefined, k: "grossCash" | "grossNon") => p ? <>Конец {dShort(p.d)}: <span className="num">{fmt2(p.v)}</span>{(v == null || Math.abs(v - p.v) > 0.004) && <button type="button" className="ml-2 text-primary" onClick={() => save(day, { [k]: p.v })}>Подставить</button>}</> : null;
  const dc = r.grossCash != null && pgc ? r.grossCash - pgc.v : null, dn = auto ? (gx && gx.prev != null ? (gx.t || 0) + (gx.q || 0) : null) : (r.grossNon != null && pgn ? r.grossNon - pgn.v : null);
  const sg = (v: number | null) => (v == null ? "—" : (v > 0 ? "+" : "") + (fmt2(v) || "0"));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Fld label="Итог гросс нал" hint={hint(pgc, r.grossCash, "grossCash")}><NumField label="Итог гросс нал" value={r.grossCash} onCommit={(v) => save(day, { grossCash: v })} /></Fld>
        {auto ? <Fld label={<>Итог гросс безнал <em className="ml-1 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary not-italic">считается сам</em></>}
          hint={gx && gx.prev != null ? <>вчера <span className="num">{fmt2(gx.prev)}</span> + терминал <span className="num">{fmt(gx.t || 0)}</span> + QR <span className="num">{fmt(gx.q || 0)}</span></> : "нет гросса за прошлый день"}>
          <div className={cn(FIELD, "num flex items-center justify-end bg-muted/50 font-medium")}>{gx && gx.v != null ? fmt2(gx.v) : "—"}</div></Fld>
          : <Fld label="Итог гросс безнал" hint={hint(pgn, r.grossNon, "grossNon")}><NumField label="Итог гросс безнал" value={r.grossNon} onCommit={(v) => save(day, { grossNon: v })} /></Fld>}
      </div>
      {(dc != null || dn != null) && <Sums a={["Нал за день", sg(dc)]} b={["Безнал за день", sg(dn)]} />}
    </div>
  );
}

