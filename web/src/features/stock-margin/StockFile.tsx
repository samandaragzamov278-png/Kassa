// «Склад из файла»: остатки по местам, группы, товары и загрузка файла склада в коллекцию stock (как на рабочем сайте).
import { useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMutations } from "@/lib/useData";
import type { BItem, Ctx } from "../analytics/cost";
import { Box, Dim, Empty, Seg, Tbl, Td, Th, Tile } from "../analytics/parts";
import { dShort, fmt, pctF, today } from "../analytics/util";
import { mergeStock, parseSheet, stockSearch, stockView } from "./logic";

const SHOW = 150, MORE = 300;
type Pending = { items: BItem[]; raw: number; file: string; sheet: string };

export function StockFile({ c }: { c: Ctx }) {
  const mu = useMutations();
  const [place, setPlace] = useState("all"), [q, setQ] = useState(""), [lim, setLim] = useState(SHOW);
  const [pend, setPend] = useState<Pending | null>(null), [date, setDate] = useState(today()), [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ t: string; bad?: boolean }>({ t: "" });
  const file = useRef<HTMLInputElement>(null);
  const has = c.stockItems.length > 0;
  const pl0 = place !== "all" && has && !c.stockItems.some((i) => (i.pt || "Без места") === place) ? "all" : place;
  const v = useMemo(() => (has ? stockView(c, pl0) : null), [c, pl0, has]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const X = await import("xlsx"), wb = X.read(await f.arrayBuffer(), { type: "array" });
      let best: { items: BItem[]; err?: string; sheet: string } | null = null;
      wb.SheetNames.forEach((n) => { const r = parseSheet(X as never, wb.Sheets[n], { zero: true }); if (!best || r.items.length > best.items.length) best = Object.assign(r, { sheet: n }); });
      const b = best as { items: BItem[]; err?: string; sheet: string } | null;
      if (!b || !b.items.length) { setMsg({ t: b && b.err ? b.err : "В файле не нашлось товаров.", bad: true }); setPend(null); return; }
      setPend({ items: mergeStock(b.items), raw: b.items.length, file: f.name, sheet: b.sheet }); setMsg({ t: "" });
    } catch { setMsg({ t: "Не удалось прочитать файл. Сохраните его как .xlsx и попробуйте снова.", bad: true }); }
  };
  const save = async () => {
    if (!pend) return; setBusy(true);
    const up = Date.now(), N = 400, parts = Math.ceil(pend.items.length / N), ids: string[] = [];
    try {
      for (let i = 0; i < parts; i++) { const id = "p" + i; ids.push(id); await mu.putDoc("stock", id, { part: i, parts, file: pend.file, date: date || today(), uploadedAt: up, total: pend.items.length, items: pend.items.slice(i * N, (i + 1) * N) }); }
      for (const o of c.stockParts) if (!ids.includes(o.id)) { try { await mu.delDoc("stock", o.id); } catch { /* старая часть не критична */ } }
      setMsg({ t: `Склад сохранён: ${fmt(pend.items.length)} позиций.` }); setPend(null); toast.success("Склад сохранён");
    } catch { setMsg({ t: "Не удалось сохранить склад. Попробуйте ещё раз.", bad: true }); } finally { setBusy(false); }
  };

  const importPanel = (
    <Box title="Загрузить склад" note="Excel или CSV (например, выгрузка из Billz): модель или артикул, наименование, группа или категория, количество, цена покупки, цена продажи. Столбцы найдутся по названиям. Если есть столбец «Место» (склад или точка), остатки разделятся по местам. Новая загрузка заменяет предыдущую.">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Дата остатков<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px]" /></label>
        <input ref={file} type="file" hidden accept=".xlsx,.xls,.xlsm,.csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="secondary" size="lg" onClick={() => file.current?.click()}><Upload />Выбрать Excel</Button>
      </div>
      {pend && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] text-muted-foreground">Файл «{pend.file}», лист «{pend.sheet}»: <b className="text-foreground">{fmt(pend.items.length)} позиций, {fmt(pend.items.reduce((a, i) => a + (+i.q || 0), 0))} шт</b>{pend.raw > pend.items.length ? ` (${fmt(pend.raw)} строк, повторы по точкам сложены)` : ""}. Цена покупки есть у {fmt(pend.items.filter((i) => +(i.cp || 0) > 0).length)} позиций.</p>
          <Tbl><thead><tr><Th>Модель / наименование</Th><Th>Артикул</Th><Th>Группа</Th><Th r>Кол-во</Th><Th r>Цена покупки</Th><Th r>Цена продажи</Th></tr></thead>
            <tbody>{pend.items.slice(0, 6).map((i, k) => <tr key={k}><Td>{i.m || i.n || i.s}</Td><Td>{i.s || ""}</Td><Td>{i.g || i.c || ""}</Td><Td r>{fmt(+i.q || 0)}</Td><Td r>{i.cp ? fmt(i.cp) : "—"}</Td><Td r>{i.p ? fmt(i.p) : "—"}</Td></tr>)}</tbody></Tbl>
          <div className="mt-3 flex gap-2"><Button onClick={save} disabled={busy}>Сохранить склад</Button><Button variant="secondary" onClick={() => { setPend(null); setMsg({ t: "" }); }}>Отмена</Button></div>
        </div>
      )}
      {msg.t && <p role="status" className={cn("mt-3 text-[13px]", msg.bad ? "text-minus" : "text-plus")}>{msg.t}</p>}
    </Box>
  );

  if (!v) return <><Empty>Склад ещё не загружен. Загрузите Excel ниже или отправьте файл Claude в чат.</Empty>{importPanel}</>;
  const list = stockSearch(v.sorted, q), showPt = pl0 === "all";
  return (
    <>
      <div className="glass flex gap-3 rounded-[22px] p-4 text-[13px] leading-snug"><span aria-hidden>ℹ️</span><span>Остатки взяты из файла как есть: {v.places.map((p, i) => <span key={p}>{i ? "; " : ""}<b>{p}</b>{v.src[p] ? ` — ${v.src[p]}` : ""}</span>)}. Продажи после этих дат в файле не вычтены, поэтому рядом показано, сколько продано с {dShort(v.from)}, и примерный остаток сейчас. После инвентаризации загрузите точные остатки.</span></div>
      <Seg label="Место" value={pl0} onChange={(p) => { setPlace(p); setLim(SHOW); }} items={[["all", "Все места"], ...v.places.map((p) => [p, p] as [string, string])]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{v.cards.map((k, i) => <Tile key={k.label} c={k} i={i} hintsOn={null} />)}</div>
      <Box title="По местам" note="Склад и каждая точка отдельно. Нажмите место сверху, чтобы видеть только его товары.">
        <Tbl>
          <thead><tr><Th>Место</Th><Th>Источник</Th><Th r>Позиций</Th><Th r>Штук</Th><Th r>Доля</Th><Th r>Сумма закупки</Th><Th r>Сумма продажи</Th><Th r>Наценка</Th><Th r>Продано с {dShort(v.from)}</Th></tr></thead>
          <tbody>{v.pr.map((o) => <tr key={o.p} className={pl0 === o.p ? "bg-primary/5" : ""}><Td b>{o.p}</Td><Td className="text-[12px] text-muted-foreground">{o.src}</Td><Td r>{fmt(o.pos)}</Td><Td r>{fmt(o.n)}</Td><Td r>{pctF(v.QA ? o.n / v.QA : 0)}</Td><Td r>{fmt(o.c)}</Td><Td r>{fmt(o.v)}</Td><Td r>{pctF(o.mk)}</Td><Td r>{o.s ? fmt(o.s) : <Dim />}</Td></tr>)}</tbody>
          <tfoot>{(() => { const sc = v.pr.reduce((a, o) => a + o.c, 0), sv = v.pr.reduce((a, o) => a + o.v, 0); return <tr><Td colSpan={2} b>Итого</Td><Td r b>{fmt(v.all.length)}</Td><Td r b>{fmt(v.QA)}</Td><Td r b>100%</Td><Td r b>{fmt(sc)}</Td><Td r b>{fmt(sv)}</Td><Td r b>{pctF(sc ? (sv - sc) / sc : null)}</Td><Td r b>{fmt(v.pr.reduce((a, o) => a + o.s, 0))}</Td></tr>; })()}</tfoot>
        </Tbl>
      </Box>
      <Box title="Категории по местам, шт">
        <Tbl>
          <thead><tr><Th>Категория</Th>{v.places.map((p) => <Th key={p} r>{p}, шт</Th>)}<Th r>Всего, шт</Th><Th r>Сумма продажи</Th></tr></thead>
          <tbody>{v.cats.map((cat) => <tr key={cat}><Td>{cat}</Td>{v.places.map((p) => { const x = v.cell(cat, p); return <Td key={p} r>{x ? fmt(x) : <Dim />}</Td>; })}<Td r b>{fmt(v.cell(cat))}</Td><Td r>{fmt(v.all.filter((i) => (i.c || "Без категории") === cat).reduce((a, i) => a + (+i.q || 0) * (+(i.p || 0)), 0))}</Td></tr>)}</tbody>
          <tfoot><tr><Td b>Итого</Td>{v.places.map((p) => <Td key={p} r b>{fmt(v.all.filter((i) => (i.pt || "Без места") === p).reduce((a, i) => a + (+i.q || 0), 0))}</Td>)}<Td r b>{fmt(v.QA)}</Td><Td r b>{fmt(v.all.reduce((a, i) => a + (+i.q || 0) * (+(i.p || 0)), 0))}</Td></tr></tfoot>
        </Tbl>
      </Box>
      <Box title={"По группам" + (pl0 === "all" ? "" : " · " + pl0)}>
        <Tbl>
          <thead><tr><Th>Группа</Th><Th r>Позиций</Th><Th r>Штук</Th><Th r>Сумма закупки</Th><Th r>Сумма продажи</Th><Th r>Маржа в цене</Th><Th r>Продано с {dShort(v.from)}</Th></tr></thead>
          <tbody>{v.groups.map((o) => <tr key={o.k}><Td>{o.k}</Td><Td r>{fmt(o.n)}</Td><Td r>{fmt(o.q)}</Td><Td r>{fmt(o.vc)}</Td><Td r>{fmt(o.vp)}</Td><Td r>{o.vp && o.vc ? pctF((o.vp - o.vc) / o.vp) : "—"}</Td><Td r>{o.s ? fmt(o.s) : <Dim />}</Td></tr>)}</tbody>
          <tfoot><tr><Td b>Итого</Td><Td r b>{fmt(v.items.length)}</Td><Td r b>{fmt(v.Q)}</Td><Td r b>{fmt(v.vC)}</Td><Td r b>{fmt(v.vP)}</Td><Td r b>{v.vP && v.vC ? pctF((v.vP - v.vC) / v.vP) : "—"}</Td><Td r b>{fmt(v.soldQ)}</Td></tr></tfoot>
        </Tbl>
      </Box>
      <Box title="Все товары" note={`${fmt(list.length)} из ${fmt(v.items.length)} позиций. Сначала — те, что продавались с ${dShort(v.from)}.`}
        action={<label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Поиск<Input value={q} onChange={(e) => { setQ(e.target.value); setLim(SHOW); }} placeholder="Модель, артикул, группа" className="w-[240px] max-sm:w-full" /></label>}>
        <Tbl>
          <thead><tr>{showPt && <Th>Место</Th>}<Th>Модель / наименование</Th><Th>Артикул</Th><Th>Группа</Th><Th r>Кол-во по файлу</Th><Th r>Продано с {dShort(v.from)}</Th><Th r>≈ Сейчас</Th><Th r>Цена покупки</Th><Th r>Цена продажи</Th><Th r>Маржа в цене</Th></tr></thead>
          <tbody>{list.slice(0, lim).map((i, k) => { const sd = v.sold.get(i) || 0, qn = +i.q || 0; return (
            <tr key={k}>{showPt && <Td>{i.pt || ""}</Td>}<Td>{[i.m || i.n || i.s, i.col].filter(Boolean).join(" · ")}{i.note && <small className="block text-[12px] text-muted-foreground">{i.note}</small>}</Td><Td className="text-[12px] text-muted-foreground">{i.s && i.s !== i.m ? i.s : ""}</Td><Td>{i.g || i.c || ""}</Td><Td r>{fmt(qn)}</Td><Td r>{sd ? <b>{fmt(sd)}</b> : <Dim />}</Td><Td r>{qn - sd < 0 ? <span className="text-minus">{fmt(qn - sd)}</span> : fmt(qn - sd)}</Td><Td r>{+(i.cp || 0) ? fmt(i.cp as number) : "—"}</Td><Td r>{+(i.p || 0) ? fmt(i.p as number) : "—"}</Td><Td r>{+(i.cp || 0) && +(i.p || 0) ? pctF(((i.p as number) - (i.cp as number)) / (i.p as number)) : "—"}</Td></tr>); })}</tbody>
        </Tbl>
        {list.length > lim && <div className="mt-3 text-center"><Button variant="secondary" onClick={() => setLim((x) => x + MORE)}>Показать ещё</Button></div>}
      </Box>
      {importPanel}
    </>
  );
}
