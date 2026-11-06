// «Склад» → остатки Billz по местам (Склад / Сергели / C1) со сравнением выгрузок и перемещения между точками.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Kpi, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { Wip } from "../report/parts";
import { Dash, Field, FIELD, Pill, Seg, Tbl, Td, Tr, saveBook, usePaging } from "../report/ui";
import { collectState, bzRefresh } from "../recon/logic";
import { AUTO, PER, PLACES, dL, dS, dtm, fmt, fq, hasUn, hm, loadTransfers, pl, periodOf, placeRows, sgn, sgq, sortItems, stockData, stockLines, sumBy, type Line, type Transfer } from "./logic";

const ls = { get: (k: string, d: string) => { try { return localStorage.getItem("kassa-web.bzs." + k) ?? d; } catch { return d; } }, set: (k: string, v: string) => { try { localStorage.setItem("kassa-web.bzs." + k, v); } catch { /* нет хранилища */ } } };

export function BzStockView({ d }: { d: Data }) {
  const [view, setView] = useState<"st" | "tr">(() => (ls.get("view", "st") === "tr" ? "tr" : "st"));
  const qc = useQueryClient(), [busy, setBusy] = useState(false), cs = collectState(d);
  const reg = useRef<Exp>(null); // выгрузка в Excel того, что сейчас на экране: её регистрирует открытый вид
  const refresh = async () => {
    setBusy(true); const r = await bzRefresh(); setBusy(false);
    if (r.ok) toast.success("Данные Billz обновлены"); else toast.error("Billz: не удалось обновить — " + r.error);
    qc.invalidateQueries({ queryKey: ["bz"] }); qc.invalidateQueries({ queryKey: ["kassa-data"] });
  };
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0"><div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · данные Billz</div>
          <h2 className="text-[26px] leading-tight font-bold tracking-tight">Остатки Billz и перемещения</h2>
          <p className="text-[14px] text-muted-foreground">Что лежит на складе и точках по Billz, что продали, привезли и увезли</p></div>
        <Button variant="secondary" size="lg" onClick={() => (reg.current ? reg.current() : Promise.reject(new Error("нечего выгружать"))).then(() => toast.success("Файл скачан")).catch((e) => toast.error("Не удалось выгрузить: " + String(e)))}><FileSpreadsheet />Выгрузить Excel</Button>
      </div>
      <Wip>Полностью заработает после инвентаризации Премиума и Яшнабада. Сейчас считаются остатки Склада, Сергели и C1.</Wip>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg value={view} onChange={(v) => { setView(v); ls.set("view", v); }} label="Вид" options={[["st", "Остатки Billz"], ["tr", "Перемещения"]]} />
        <div className="flex flex-wrap items-center gap-2"><Pill tone={cs.cls === "err" ? "bad" : cs.cls}>{cs.t}</Pill>{cs.last && <span className="text-[12.5px] text-muted-foreground">{cs.last}</span>}
          <Button variant="secondary" disabled={busy} onClick={refresh}><RefreshCw className={cn(busy && "animate-spin")} />{busy ? "Загружаю из Billz…" : "Обновить из Billz"}</Button></div>
      </div>
      {view === "st" ? <Stock reg={reg} /> : <Transfers reg={reg} />}
    </section>
  );
}

type Exp = (() => Promise<void>) | null;
type Reg = React.MutableRefObject<Exp>;

function Stock({ reg }: { reg: Reg }) {
  const [sd, setSd] = useState(""), [cmp, setCmp] = useState(""), [pt, setPtS] = useState(() => ls.get("pt", "all")), [cat, setCat] = useState("all"), [qy, setQ] = useState(""), [only, setOnly] = useState(false);
  const setPt = (v: string) => { setPtS(v); ls.set("pt", v); };
  const q = useQuery({ queryKey: ["bz", "stock", sd, cmp], queryFn: () => stockData(sd, cmp) });
  const D = q.data?.D || null, lines = D ? stockLines(D) : [];
  const s = qy.trim().toLowerCase(), L = lines.filter((l) => (pt === "all" || l.p === pt) && (cat === "all" || l.c === cat) && (!s || (l.n + " " + l.s).toLowerCase().includes(s)));
  const items = sortItems(L, only), pg = usePaging(items.length, "bz-stock", -1, (D?.cur.d || "") + pt + cat + qy + only);
  // выгрузка в Excel — то, что видно в таблице «Товары»
  useEffect(() => { reg.current = D ? async () => { await saveBook("Остатки Billz " + D.cur.d, [["Лист1", items.map((l) => ({ "Место": l.p, "Товар": l.n, "Артикул": l.s, "Категория": l.c, "Цена": l.price, "Было": l.was, "Продано": l.sold, "Пришло": l.tin, "Ушло": l.tout, "Сейчас": l.now, "Расхождение": l.un }))]]); } : null; return () => { reg.current = null; }; });
  if (q.isLoading) return <p className="glass rounded-3xl p-6 text-muted-foreground">Загружаю остатки Billz…</p>;
  if (q.error) return <p className="glass rounded-3xl p-6 text-minus">Не удалось загрузить остатки: {String((q.error as Error).message || q.error)}</p>;
  if (!D) return <p className="glass rounded-3xl p-6 text-muted-foreground">Остатков Billz ещё нет — нажмите «Обновить из Billz».</p>;
  const cats = [...new Set(lines.map((l) => l.c).filter(Boolean))].sort();
  const Q = sumBy(L, (l) => l.now), V = sumBy(L, (l) => l.now * l.price), C = sumBy(L, (l) => l.now * l.cp), unN = L.filter(hasUn);
  const cmpTxt = D.cmp ? `с ${dS(D.cmp.d)} ${hm(D.cmp.at)}` : "";
  const places = pt === "all" ? placeRows(lines, cat) : [];
  return (
    <>
      <Panel title="Выгрузка и фильтры" className="py-4">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Остатки на"><select className={FIELD} value={D.cur.d} onChange={(e) => { setSd(e.target.value); setCmp(""); }}>{D.dates.slice().reverse().map((x) => <option key={x.d} value={x.d}>{dL(x.d)} · {hm(x.at)}</option>)}</select></Field>
            <Field label="Сравнить с"><select className={FIELD} value={D.cmp && q.data?.cmp ? D.cmp.d : ""} onChange={(e) => setCmp(e.target.value)}>
              <option value="">{D.dates.length > 1 ? "предыдущей выгрузкой" : "—"}</option>{D.dates.filter((x) => x.d < D.cur.d).reverse().map((x) => <option key={x.d} value={x.d}>{dL(x.d)}</option>)}</select></Field>
            <Field label="Категория"><select className={FIELD} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">Все</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Поиск"><input className={FIELD} placeholder="Товар или артикул" value={qy} onChange={(e) => setQ(e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Seg value={pt} onChange={setPt} label="Место" options={[["all", "Все места"], ...PLACES.map((p) => [p, p] as [string, string])]} />
            <label className="flex items-center gap-2 text-[13.5px]"><Switch checked={only} onCheckedChange={setOnly} aria-label="Только с движением или расхождением" />Только с движением или расхождением</label>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label={pt === "all" ? "Всего на остатке" : "Остаток · " + pt} value={fmt(Q) + " шт"} sub={`${L.filter((l) => l.now).length} позиций · ${dL(D.cur.d)} ${hm(D.cur.at)}`} />
        <Kpi i={1} label="В розничных ценах" value={fmt(V) + " сум"} sub={C ? `закупка ≈ ${fmt(C)} сум` : "закупочные цены Billz не отдаёт"} />
        <Kpi i={2} label={"Изменение " + cmpTxt} value={D.cmp ? sgn(sumBy(L, (l) => l.delta)) + " шт" : "—"} tone={D.cmp && sumBy(L, (l) => l.delta) >= 0 ? "plus" : undefined} sub={D.cmp ? `продано ${fq(sumBy(L, (l) => l.sold))} · пришло ${fq(sumBy(L, (l) => l.tin))} · ушло ${fq(sumBy(L, (l) => l.tout))}` : "история копится с первой выгрузки"} />
        <Kpi i={3} label="Без объяснения" value={D.cmp ? String(unN.length) : "—"} tone={D.cmp && !unN.length ? "plus" : undefined} sub={D.cmp ? (unN.length ? "позиций: изменилось без продажи и перемещения" : "всё объяснено продажами и перемещениями ✓") : ""} />
      </div>
      {pt === "all" && (
        <Panel title="По местам" note="Было − продано + пришло − ушло = должно быть. Если в Billz другое число — строка отмечена. Продажи берутся из чеков Billz, движение — из перемещений Billz.">
          <Tbl head={["Место", ["Позиций", "r"], ["Штук", "r"], ["В розничных ценах", "r"], ["Изменение", "r"], ["Продано", "r"], ["Пришло", "r"], ["Ушло", "r"], ["Без объяснения", "r"]]}>
            {places.map((o) => (
              <Tr key={o.p} tap tone={o.un ? "bad" : undefined} onClick={() => setPt(o.p)}>
                <Td h><b>{o.p}</b>{AUTO.has(o.p) && <span className="ml-1.5 rounded bg-primary/12 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">в Кассе</span>}</Td>
                <Td r l="Позиций">{fmt(o.pos)}</Td><Td r l="Штук">{fmt(o.q)}</Td><Td r l="В розничных ценах">{fmt(o.v)}</Td>
                <Td r l="Изменение">{D.cmp ? sgq(o.d) : "—"}</Td><Td r l="Продано">{D.cmp ? fq(o.s) : "—"}</Td><Td r l="Пришло">{D.cmp ? fq(o.i) : "—"}</Td><Td r l="Ушло">{D.cmp ? fq(o.o) : "—"}</Td>
                <Td r l="Без объяснения">{D.cmp ? (o.un ? <><b className="text-minus">{sgq(o.u)}</b> <span className="text-[12px] text-muted-foreground">{o.un} поз.</span></> : <span className="text-plus">0 ✓</span>) : "—"}</Td></Tr>))}
          </Tbl>
        </Panel>)}
      <Panel title="Товары" note={`${items.length} ${pl(items.length, "строка", "строки", "строк")}. Сначала — с расхождением, затем с движением.`}>
        <Tbl head={[...(pt === "all" ? ["Место"] : []), "Товар", "Категория", ["Цена", "r"], ["Было", "r"], ["Продано", "r"], ["Пришло", "r"], ["Ушло", "r"], ["Сейчас", "r"], ["Расхождение", "r"]]}>
          {items.slice(pg.from, pg.to).map((l: Line) => { const bad = hasUn(l); return (
            <Tr key={l.p + l.s} tone={bad ? "bad" : undefined}>
              {pt === "all" && <Td l="Место">{l.p}</Td>}
              <Td h>{l.n}<br /><span className="text-[12px] font-normal text-muted-foreground">{l.s}</span></Td><Td l="Категория" className="text-[12.5px] text-muted-foreground">{l.c}</Td>
              <Td r l="Цена">{l.price > 1 ? fmt(l.price) : "—"}</Td><Td r l="Было">{l.was == null ? "—" : fq(l.was)}</Td><Td r l="Продано">{l.sold ? fq(l.sold) : <Dash />}</Td>
              <Td r l="Пришло">{l.tin ? <span className="text-plus">+{fq(l.tin)}</span> : <Dash />}</Td><Td r l="Ушло">{l.tout ? <span className="text-minus">−{fq(l.tout)}</span> : <Dash />}</Td>
              <Td r l="Сейчас" className="font-semibold">{fq(l.now)}</Td><Td r l="Расхождение">{l.un == null ? "—" : bad ? <b className="text-minus">{sgq(l.un)}</b> : <span className="text-plus">✓</span>}</Td></Tr>); })}
          {!items.length && <Tr><Td colSpan={10} className="py-4 text-center text-muted-foreground">Нет позиций под фильтр</Td></Tr>}
        </Tbl>
        {pg.bar}
      </Panel>
    </>
  );
}

function Transfers({ reg }: { reg: Reg }) {
  const [per, setPerS] = useState(() => ls.get("tper", "month")), [cf, setCf] = useState(""), [ct, setCt] = useState(""), [pt, setPt] = useState("all"), [open, setOpen] = useState<string | null>(null);
  const [f, t] = per === "all" ? ["2000-01-01", "2999-12-31"] : periodOf(per, cf, ct);
  const q = useQuery({ queryKey: ["bz", "transfers"], queryFn: loadTransfers });
  const L: Transfer[] = (q.data || []).filter((x) => x.d >= f && x.d <= t && (pt === "all" || x.from_point === pt || x.to_point === pt));
  const idx = L.findIndex((x) => x.id === open), pg = usePaging(L.length, "bz-transfers", idx, f + t + pt);
  useEffect(() => { reg.current = async () => { const rows: Record<string, unknown>[] = []; L.forEach((x) => (x.items || []).forEach((i) => rows.push({ "Дата": dtm(x.accepted || x.created), "№": x.num, "Откуда": x.from_point, "Куда": x.to_point, "Статус": x.status, "Товар": i.n, "Артикул": i.sku, "Отправлено": i.sent, "Принято": i.arr, "Цена": i.price }))); if (!rows.length) throw new Error("нечего выгружать"); await saveBook("Перемещения Billz", [["Лист1", rows]]); }; return () => { reg.current = null; }; });
  const sent = L.reduce((a, x) => a + (+(x.sent || 0)), 0), arr = L.reduce((a, x) => a + (+(x.arrived || 0)), 0), way = L.filter((x) => x.status === "в пути"), bad = L.filter((x) => x.status === "принят" && +(x.sent || 0) !== +(x.arrived || 0));
  return (
    <>
      <Panel title="Период и место" className="py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Seg value={per} onChange={(v) => { if (v === "custom") { setCf(f); setCt(t); } setPerS(v); ls.set("tper", v); }} label="Период" options={[...PER.filter((p) => p[0] !== "today" && p[0] !== "yday"), ["all", "Все"]] as [string, string][]} />
            {per === "custom" && <div className="flex gap-2"><Field label="С"><input type="date" className={FIELD} value={f} max={t} onChange={(e) => setCf(e.target.value)} /></Field><Field label="По"><input type="date" className={FIELD} value={t} min={f} onChange={(e) => setCt(e.target.value)} /></Field></div>}
          </div>
          <Seg value={pt} onChange={setPt} label="Место" options={[["all", "Все места"], ...PLACES.map((p) => [p, p] as [string, string])]} />
        </div>
      </Panel>
      {q.isLoading ? <p className="glass rounded-3xl p-6 text-muted-foreground">Загружаю перемещения…</p> : q.error ? <p className="glass rounded-3xl p-6 text-minus">Не удалось загрузить перемещения: {String((q.error as Error).message || q.error)}</p> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi i={0} label="Перемещений" value={String(L.length)} sub={`${dS(f)} — ${dS(t)}`} />
          <Kpi i={1} label="Отправлено" value={fmt(sent) + " шт"} sub={`принято ${fmt(arr)} шт`} />
          <Kpi i={2} label="В пути" value={String(way.length)} sub={way.length ? "ещё не приняты на точке" : "всё принято"} />
          <Kpi i={3} label="С расхождением" value={String(bad.length)} tone={bad.length ? undefined : "plus"} sub={bad.length ? "принято не столько, сколько отправлено" : "отправлено = принято ✓"} />
        </div>
        <Panel title="Перемещения между точками" note="Из Billz, обновляются каждый день. Нажмите строку, чтобы увидеть товары.">
          <Tbl head={["Дата", "№", "Откуда", "Куда", "Статус", ["Отправлено", "r"], ["Принято", "r"], ["В розничных ценах", "r"], "Кто"]}>
            {L.slice(pg.from, pg.to).map((x) => { const diff = x.status === "принят" && +(x.sent || 0) !== +(x.arrived || 0), op = open === x.id; return [
              <Tr key={x.id} tap tone={diff ? "bad" : x.status === "в пути" ? "warn" : undefined} selected={op} onClick={() => setOpen(op ? null : x.id)}>
                <Td h><span className="num">{dtm(x.accepted || x.created)}</span></Td><Td l="№"><span className="num">{x.num}</span></Td><Td l="Откуда">{x.from_point}</Td><Td l="Куда">{x.to_point}</Td>
                <Td l="Статус">{x.status === "принят" ? <span className="text-plus">принят</span> : x.status === "в пути" ? <Pill tone="warn">в пути</Pill> : <span className="text-muted-foreground">черновик</span>}</Td>
                <Td r l="Отправлено">{fmt(x.sent || 0)}</Td><Td r l="Принято">{diff ? <b className="text-minus">{fmt(x.arrived || 0)}</b> : fmt(x.arrived || 0)}</Td><Td r l="В розничных ценах">{fmt(x.retail || 0)}</Td>
                <Td l="Кто" className="text-[12.5px] text-muted-foreground">{x.by_name || ""}</Td></Tr>,
              op && <tr key={x.id + "-d"} className="max-md:block"><td colSpan={9} className="bg-muted/30 px-3 py-3 max-md:block">
                <Tbl head={["Товар", ["Отправлено", "r"], ["Принято", "r"], ["Цена", "r"]]}>
                  {(x.items || []).map((i, k) => <Tr key={k} tone={+(i.sent || 0) !== +(i.arr || 0) && x.status === "принят" ? "bad" : undefined}><Td h>{i.n}<br /><span className="text-[12px] font-normal text-muted-foreground">{i.sku}</span></Td><Td r l="Отправлено">{fq(i.sent)}</Td><Td r l="Принято">{fq(i.arr)}</Td><Td r l="Цена">{i.price ? fmt(i.price) : "—"}</Td></Tr>)}
                  {!(x.items || []).length && <Tr><Td colSpan={4} className="text-muted-foreground">Товаров нет</Td></Tr>}
                </Tbl></td></tr>]; })}
            {!L.length && <Tr><Td colSpan={9} className="py-4 text-center text-muted-foreground">Перемещений за период нет</Td></Tr>}
          </Tbl>
          {pg.bar}
        </Panel></>}
    </>
  );
}
