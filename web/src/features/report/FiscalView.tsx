// «Фискальные модули»: гросс нал и безнал по кассам точек за день и за всё время (fiscal/<день>, settings/fiscal).
// Пока ни один модуль не включён — раздел «в подготовке», цифры не считаются.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Kpi, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { DayChips, Badge } from "./parts";
import { FIELD, Pill, Seg, Tbl, Td, Tr, ptColor, usePaging, type Tone } from "./ui";
import { MN, dLong, dShort, fiscalDayList, fmAnyOn, fmCfg, fmDay, fmDays, fmDayStat, fmGross, fmIsOn, fmKassa, fmMod, fmNum, fmt, pl, todayTash, wdOf, type FmDay, type FmMod } from "./logic";

export interface FmState { m: string; d: string; open: string | null; edit: "day" | "mod" | null }

export function PrepBanner({ d }: { d: Data }) {
  if (fmAnyOn(d)) return null;
  return (
    <div className="glass flex items-start gap-3 rounded-[22px] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-warn-soft text-warn"><Clock className="size-5" /></span>
      <div className="flex flex-col"><b>Раздел в подготовке</b><span className="text-[13px] text-muted-foreground">Фискальные модули пока не подключены, цифры не считаются. Когда подключим выгрузку из Rahmat, модуль точки включается в карточке → «Данные модуля» → «Модуль работает».</span></div></div>
  );
}

export function FiscalView({ d, F, setF }: { d: Data; F: FmState; setF: (f: Partial<FmState>) => void }) {
  const T = todayTash(), P = d.points, mu = useMutations();
  const all = useMemo(() => fiscalDayList(d, T), [d, T]);
  const ms = useMemo(() => [...new Set(all.map((x) => x.slice(0, 7)).concat([T.slice(0, 7)]))].sort(), [all, T]);
  const m = ms.includes(F.m) ? F.m : ms[ms.length - 1], md = all.filter((x) => x.startsWith(m)), days = fmDays(d);
  const day = md.includes(F.d) ? F.d : ((md.filter((x) => days[x]).pop()) || md[md.length - 1] || T);
  const dayT = { c: 0, n: 0 }, totT = { c: 0, n: 0 };
  P.forEach((p) => { const x = fmDay(d, day, p); if (x) { dayT.c += x.c; dayT.n += x.n; } const g = fmGross(d, p, day); totT.c += g.c; totT.n += g.n; });
  const on = P.filter((p) => fmIsOn(d, p)).length;
  const L = md.slice().reverse().filter((x) => x <= T), pg = usePaging(L.length, "fm-days", -1, m);
  const edRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (F.open) setTimeout(() => edRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60); }, [F.open]);

  const saveDay = async (x: string, pts: NonNullable<FmDay["pts"]>) => { const cur = { date: x, pts: {}, ...(days[x] || {}) } as FmDay; cur.pts = { ...cur.pts, ...pts }; cur.updatedAt = Date.now(); await mu.putDoc("fiscal", x, cur); };
  const saveCfg = async (p: string, patch: Partial<FmMod>) => { const c = JSON.parse(JSON.stringify(fmCfg(d))); c.mods[p] = { ...(c.mods[p] || {}), ...patch }; await mu.putDoc("settings", "fiscal", c); };
  const clearDay = async (p: string) => { const cur = { ...days[day] }; cur.pts = { ...cur.pts }; delete cur.pts[p]; await mu.putDoc("fiscal", day, cur); toast.success("День очищен"); };

  return (
    <div className="flex flex-col gap-5">
      <PrepBanner d={d} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg value={m} onChange={(v) => setF({ m: v, d: "", open: null })} label="Месяц" options={ms.map((x) => [x, MN[+x.slice(5, 7) - 1] + " " + x.slice(0, 4)])} />
        <span className="flex items-center gap-3 text-[12px] text-muted-foreground"><i className="size-2 rounded-full bg-plus" />все модули внесены<i className="size-2 rounded-full bg-warn" />частично<i className="size-2 rounded-full bg-border" />нет данных</span>
      </div>
      <DayChips days={md} value={day} onPick={(x) => setF({ d: x, m: x.slice(0, 7) })} label="День" stat={(x) => fmDayStat(d, x)} title={(x) => dLong(x)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label={"Гросс нал · " + dShort(day)} value={fmt(dayT.c) + " сум"} sub={`по ${on} ${pl(on, "модулю", "модулям", "модулям")} за ${dLong(day)}`} />
        <Kpi i={1} label={"Гросс безнал · " + dShort(day)} value={fmt(dayT.n) + " сум"} sub="карты и QR через фискальный модуль" />
        <Kpi i={2} label="Гросс нал · всё время" value={fmt(totT.c) + " сум"} tone="primary" sub={"нарастающим итогом по " + dShort(day)} />
        <Kpi i={3} label="Гросс безнал · всё время" value={fmt(totT.n) + " сум"} tone="primary" sub={"нарастающим итогом по " + dShort(day)} />
      </div>

      <Panel title="Точки и фискальные модули" note={`Нажмите карточку, чтобы внести гросс за ${dLong(day)} или изменить данные модуля`} action={<Badge>{on} из {P.length} подключено</Badge>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{P.map((p) => <Card key={p} d={d} p={p} day={day} sel={F.open === p} onClick={() => setF({ open: F.open === p ? null : p, edit: null })} />)}</div>
      </Panel>

      {F.open && <div ref={edRef}><Editor key={F.open + day + (F.edit || "")} d={d} p={F.open} day={day} tab={F.edit || (fmIsOn(d, F.open) ? "day" : "mod")} setTab={(t) => setF({ edit: t })}
        onClose={() => setF({ open: null })} onClear={() => clearDay(F.open as string)}
        onSaveDay={async (v) => { try { await saveDay(day, { [F.open as string]: v }); toast.success(`${F.open} · ${dLong(day)} сохранено`); } catch { toast.error("Не сохранилось — проверьте связь"); } }}
        onSaveMod={async (v) => { try { await saveCfg(F.open as string, v); setF({ edit: "day" }); toast.success(`${F.open} · данные модуля сохранены`); } catch { toast.error("Не сохранилось — проверьте связь"); } }} /></div>}

      <Panel title={"По дням · " + MN[+m.slice(5, 7) - 1].toLowerCase()} note="Нал / безнал по фискальным модулям. Нажмите день, чтобы открыть его.">
        <Tbl head={["День", ...P.map((p) => p), ["Итого нал", "r"], ["Итого безнал", "r"], ["Гросс всего", "r"]]}>
          {L.slice(pg.from, pg.to).map((x) => { let c = 0, n = 0;
            const cells = P.map((p) => { const v = fmDay(d, x, p); if (v) { c += v.c; n += v.n; }
              return <Td key={p} l={p}>{!fmIsOn(d, p) ? <span className="text-muted-foreground">—</span> : v ? <span className="flex flex-col items-end md:items-start"><span className="num">{fmt(v.c)}</span><span className="num text-[12px] text-muted-foreground">{fmt(v.n)}</span></span> : <span className="text-[12px] text-warn">не внесено</span>}</Td>; });
            const g = P.reduce((a, p) => { const q = fmGross(d, p, x); return a + q.c + q.n; }, 0);
            return (<Tr key={x} tap selected={x === day} onClick={() => setF({ d: x, m: x.slice(0, 7) })}><Td h>{dShort(x)} <span className="ml-1 text-[12px] font-normal text-muted-foreground">{wdOf(x)}</span></Td>{cells}
              <Td r l="Итого нал" className="font-semibold">{fmt(c)}</Td><Td r l="Итого безнал" className="font-semibold">{fmt(n)}</Td><Td r l="Гросс всего" className="text-muted-foreground">{fmt(g)}</Td></Tr>); })}
          {!L.length && <Tr><Td colSpan={P.length + 4} className="py-4 text-center text-muted-foreground">Дней пока нет</Td></Tr>}
        </Tbl>
        {pg.bar}
        <p className="mt-3 text-[12.5px] text-muted-foreground">В ячейке точки: сверху нал, снизу безнал. «Гросс всего» — нарастающий итог нал + безнал по всем модулям на конец дня.</p>
      </Panel>
    </div>
  );
}

function Card({ d, p, day, sel, onClick }: { d: Data; p: string; day: string; sel: boolean; onClick: () => void }) {
  const m = fmMod(d, p) || {}, on = fmIsOn(d, p), x = fmDay(d, day, p), g = fmGross(d, p, day), k = fmKassa(d, day, p);
  const st: [Tone, string] = !on ? ["off", "Не подключён"] : x ? ["ok", "Внесено"] : k.c || k.n ? ["warn", "Нет данных за день"] : ["idle", "Продаж не было"];
  const row = (l: string, v?: string) => <div className="flex justify-between gap-2 text-[12.5px]"><span className="text-muted-foreground">{l}</span><b className={cn("truncate font-medium", !v && "font-normal text-muted-foreground")}>{v || "не указано"}</b></div>;
  return (
    <button type="button" onClick={onClick} aria-expanded={sel} className={cn("flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition", sel ? "border-primary bg-accent" : "border-border bg-card/50 hover:bg-muted/60", !on && "opacity-70")}>
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full" style={{ background: ptColor(p) }} />{p}</span><Pill tone={st[0]}>{st[1]}</Pill></div>
      {row("Касса (серийный №)", m.kassa)}{row("Фискальный модуль", m.fm)}{row("Торговый пункт", m.tp)}
      <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-2 text-[12.5px]">
        <div><span className="text-muted-foreground">За {dShort(day)}</span><p className="flex justify-between"><em className="text-muted-foreground not-italic">нал</em><b className="num">{x ? fmt(x.c) : "—"}</b></p><p className="flex justify-between"><em className="text-muted-foreground not-italic">безнал</em><b className="num">{x ? fmt(x.n) : "—"}</b></p></div>
        <div><span className="text-muted-foreground">За всё время</span><p className="flex justify-between"><em className="text-muted-foreground not-italic">нал</em><b className="num">{on ? fmt(g.c) : "—"}</b></p><p className="flex justify-between"><em className="text-muted-foreground not-italic">безнал</em><b className="num">{on ? fmt(g.n) : "—"}</b></p></div>
      </div>
      <span className="mt-0.5 flex items-center gap-1 text-[12.5px] font-medium text-primary">{on ? (x ? "Изменить" : "Внести гросс") : "Подключить модуль"}<ChevronDown className="size-3.5" /></span>
    </button>
  );
}

function Editor({ d, p, day, tab, setTab, onClose, onClear, onSaveDay, onSaveMod }: { d: Data; p: string; day: string; tab: "day" | "mod"; setTab: (t: "day" | "mod") => void; onClose: () => void; onClear: () => void;
  onSaveDay: (v: { c: number; n: number; k: number }) => Promise<void>; onSaveMod: (v: Partial<FmMod>) => Promise<void> }) {
  const m = fmMod(d, p) || {}, x = fmDay(d, day, p), k = fmKassa(d, day, p), on = fmIsOn(d, p), hasDay = !!fmDays(d)[day]?.pts?.[p];
  const [v, setV] = useState({ c: x ? fmt(x.c) : "", n: x ? fmt(x.n) : "", k: x ? String(x.k) : "", kassa: m.kassa || "", fm: m.fm || "", tp: m.tp || "", c0: m.c0 ? fmt(m.c0) : "", n0: m.n0 ? fmt(m.n0) : "", on: m.on !== false });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [key]: e.target.value });
  const money = (key: "c" | "n" | "c0" | "n0") => () => { const q = fmNum(v[key]); setV({ ...v, [key]: q == null ? "" : fmt(q) }); };
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  const fld = (label: string, key: keyof typeof v, hint?: string, ph = "0", text = false, blur?: () => void) => (
    <label className="flex min-w-0 flex-col gap-1"><span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <input className={cn(FIELD, !text && "num text-right")} inputMode={text ? "text" : "decimal"} autoComplete="off" placeholder={ph} value={String(v[key])} onChange={set(key)} onBlur={blur} />
      <span className="min-h-4 text-[12px] text-muted-foreground">{hint}</span></label>);
  return (
    <Panel title={`${p} · ${tab === "day" ? dLong(day) : "данные модуля"}`} note={tab === "day" ? "Цифры из Z-отчёта или выгрузки Rahmat за день" : "Номера из кабинета Rahmat → Касса → Кассы"}
      action={<Button variant="ghost" size="icon" aria-label="Закрыть" onClick={onClose}><X /></Button>}>
      <div className="flex flex-col gap-4">
        {on && <Seg value={tab} onChange={setTab} label="Режим" options={[["day", "Гросс за день"], ["mod", "Данные модуля"]]} />}
        {tab === "day" ? (<>
          <div className="grid gap-3 sm:grid-cols-3">{fld("Гросс нал за день", "c", `в Кассе нал ${fmt(k.c)}`, "0", false, money("c"))}{fld("Гросс безнал за день", "n", `в Кассе терминал и QR ${fmt(k.n)}`, "0", false, money("n"))}{fld("Чеков", "k", `в Кассе ${k.k} ${pl(k.k, "чек", "чека", "чеков")}`)}</div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run(() => onSaveDay({ c: fmNum(v.c) || 0, n: fmNum(v.n) || 0, k: fmNum(v.k) || 0 }))}>Сохранить</Button>
            <Button variant="secondary" onClick={() => setV({ ...v, c: fmt(k.c), n: fmt(k.n), k: String(k.k) })}>Подставить из Кассы</Button>
            {hasDay && <Button variant="ghost" className="text-minus" onClick={() => run(async () => onClear())}>Очистить день</Button>}
          </div></>) : (<>
          <div className="grid gap-3 sm:grid-cols-3">{fld("Серийный номер кассы", "kassa", "", "P3B…", true)}{fld("Фискальный модуль", "fm", "", "VG…", true)}{fld("Торговый пункт в Rahmat", "tp", "", "Название точки", true)}</div>
          <div className="grid items-end gap-3 sm:grid-cols-3">{fld("Гросс нал до учёта", "c0", "накоплено до первого внесённого дня", "0", false, money("c0"))}{fld("Гросс безнал до учёта", "n0", "накоплено до первого внесённого дня", "0", false, money("n0"))}
            <label className="flex items-center gap-2 pb-5 text-[14px]"><Switch checked={v.on} onCheckedChange={(c) => setV({ ...v, on: c })} aria-label="Модуль работает" />Модуль работает</label></div>
          <div><Button disabled={busy} onClick={() => run(() => onSaveMod({ kassa: v.kassa.trim(), fm: v.fm.trim(), tp: v.tp.trim(), c0: fmNum(v.c0) || 0, n0: fmNum(v.n0) || 0, on: v.on }))}>Сохранить</Button></div></>)}
      </div>
    </Panel>
  );
}
