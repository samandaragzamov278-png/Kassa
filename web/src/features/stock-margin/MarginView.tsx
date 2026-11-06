// Склад: маржа, склад из файла и проданные из новой партии (внутри страницы «Склад», под блоком Billz).
import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Data } from "@/lib/types";
import { pointColor } from "../analytics/base";
import { makeCtx } from "../analytics/cost";
import { fname, marginSheets, stockSheets } from "../analytics/exports";
import { saveXlsx } from "../analytics/xl";
import { FilterBar, useFlt } from "../analytics/filter";
import { HBars } from "../analytics/charts";
import { Box, Empty, MBar, Seg, Sw, Tbl, Td, Th, Tile } from "../analytics/parts";
import { dLong, fmt, pctF, pl } from "../analytics/util";
import { hasCosts, marginData } from "./logic";
import { StockFile } from "./StockFile";
import { BatchView } from "./BatchView";

type View = "margin" | "stock" | "batch";

export function MarginView({ d }: { d: Data }) {
  const c = useMemo(() => makeCtx(d), [d]);
  const [view, setView] = useState<View>("margin");
  const [F, setF] = useFlt();
  const [sort, setSort] = useState<"gp" | "low">("gp");
  const m = useMemo(() => marginData(c, F), [c, F]);
  const meta = c.stockMeta;
  const info = view === "stock"
    ? (meta ? `Склад загружен из «${meta.file || "файла"}»: ${fmt(c.stockItems.length)} позиций` : "Склад ещё не загружен")
    : meta ? `Склад загружен ${dLong(meta.date)}: ${fmt(c.stockItems.length)} позиций. Маржа считается за период фильтра.` : "Склад ещё не загружен — маржа считается только по ценам покупки из новой партии.";
  const xlsx = async () => {
    try {
      if (view === "stock") { const sh = stockSheets(c); if (!sh) { toast.error("Склад ещё не загружен."); return; } await saveXlsx(sh, "sklad_" + (meta?.date || "") + ".xlsx"); }
      else { const sh = marginSheets(c, F); if (!sh) { toast.error("Нет продаж за выбранный период."); return; } await saveXlsx(sh, fname(c, F, "marzha", "xlsx")); }
      toast.success("Файл скачан");
    } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · товары, цены покупки и маржа</div>
          <h2 className="text-[28px] leading-tight font-bold tracking-tight">Маржа и склад из файла</h2>
          <p className="text-[14px] text-muted-foreground">{view === "batch" ? "Сколько товаров из новой партии уже продано по каждой точке и что лежит без движения" : info}</p>
        </div>
        {view !== "batch" && <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>}
      </header>
      <Seg<View> label="Раздел склада" value={view} onChange={setView} items={[["margin", "Маржа"], ["stock", "Склад из файла"], ["batch", "Проданные из новой партии"]]} />

      {view === "margin" && (
        <>
          <FilterBar c={c} F={F} set={setF} cats />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile hintsOn={null} c={{ id: 0, main: true, label: "Валовая прибыль", v: fmt(m.tot.gp) + " сум", d: `выручка ${fmt(m.tot.revC)} − себестоимость ${fmt(m.tot.cogs)}` }} />
            <Tile hintsOn={null} i={1} c={{ id: 0, label: "Маржа", v: pctF(m.tot.mg), d: "по продажам с известной ценой покупки" }} />
            <Tile hintsOn={null} i={2} c={{ id: 0, label: "Покрытие", v: pctF(m.tot.cov), d: `посчитано ${fmt(m.tot.revC)} из ${fmt(m.tot.rev)} сум`, ring: { p: m.tot.cov } }} />
            <Tile hintsOn={null} i={3} c={{ id: 0, label: "Без цены покупки", v: fmt(m.miss.length) + " " + pl(m.miss.length, "товар", "товара", "товаров"), d: `${fmt(m.tot.rev - m.tot.revC)} сум выручки` + (m.nodet ? ` · без детализации ещё ${fmt(m.nodet)}` : "") }} />
          </div>
          {!hasCosts(c) ? <Empty>Чтобы посчитать маржу, нужны цены покупки. Загрузите склад в разделе «Склад из файла» — себестоимость каждой продажи найдётся по модели или артикулу.</Empty> : (
            <>
              <Box title="Маржинальность точек" note="Прибыль = выручка − цена покупки × количество. Считаются только продажи, для которых нашлась цена покупки; «покрытие» — какая доля выручки точки посчитана. Строки «без детализации» и погашения долгов в маржу не входят.">
                {m.pts.length ? <Tbl><MHead f="Точка" /><tbody>{m.pts.map((o) => <MRow key={o.k} o={o} label={<><Sw color={pointColor(c.points, o.k)} />{o.k}</>} />)}</tbody><MFoot t={m.tot} /></Tbl> : <p className="text-[13px] text-muted-foreground">Нет продаж за период</p>}
                {m.pts.some((o) => o.mg != null) && <div className="mt-4"><HBars dot items={m.pts.filter((o) => o.mg != null).map((o) => ({ label: o.k, value: o.gp, valTxt: fmt(o.gp) + " · " + pctF(o.mg), color: pointColor(c.points, o.k), sub: `покрытие ${pctF(o.cov)}` }))} /></div>}
              </Box>
              <Box title="Маржа по категориям">
                {m.cats.length ? <Tbl><MHead f="Категория" /><tbody>{m.cats.map((o) => <MRow key={o.k} o={o} label={o.k} />)}</tbody><MFoot t={m.tot} /></Tbl> : null}
              </Box>
              <Box title="Товары: прибыль и маржа" note="Продажи с найденной ценой покупки, сгруппированные по названию"
                action={<Seg<"gp" | "low"> label="Сортировка" value={sort} onChange={setSort} items={[["gp", "Самые прибыльные"], ["low", "Самая низкая маржа"]]} />}>
                {(() => {
                  const pr = [...m.prods].sort(sort === "low" ? (a, b) => (a.mg ?? 9) - (b.mg ?? 9) || b.rev - a.rev : (a, b) => b.gp - a.gp).slice(0, 25);
                  return pr.length ? <Tbl><thead><tr><Th>#</Th><Th>Товар</Th><Th r>Шт</Th><Th r>Выручка</Th><Th r>Цена покупки</Th><Th r>Прибыль</Th><Th r className="min-w-[130px]">Маржа</Th></tr></thead>
                    <tbody>{pr.map((o, i) => <tr key={o.k}><Td className="text-muted-foreground" num>{i + 1}</Td><Td>{o.k}</Td><Td r>{fmt(o.u)}</Td><Td r>{fmt(o.rev)}</Td><Td r>{fmt(o.cp || 0)}</Td><Td r b>{fmt(o.gp)}</Td><Td r><MBar v={o.mg} /></Td></tr>)}</tbody></Tbl>
                    : <p className="text-[13px] text-muted-foreground">Пока ни одна продажа не сопоставилась со складом</p>;
                })()}
              </Box>
              <Box title="Продажи без цены покупки" note={`Не нашлись на складе: ${m.miss.length} ${pl(m.miss.length, "товар", "товара", "товаров")} на ${fmt(m.tot.rev - m.tot.revC)} сум. Проверьте, совпадает ли модель или артикул в продаже с файлом склада. Показаны первые 30 по выручке.`}>
                {m.miss.length ? <Tbl><thead><tr><Th>Товар в продаже</Th><Th r>Продаж</Th><Th r>Шт</Th><Th r>Выручка</Th></tr></thead><tbody>{m.miss.slice(0, 30).map((o) => <tr key={o.k}><Td>{o.k}</Td><Td r>{o.n}</Td><Td r>{fmt(o.u)}</Td><Td r>{fmt(o.rev)}</Td></tr>)}</tbody></Tbl>
                  : <p className="text-[13px] text-muted-foreground">Все продажи периода нашлись на складе</p>}
              </Box>
            </>
          )}
        </>
      )}
      {view === "stock" && <StockFile c={c} />}
      {view === "batch" && <BatchView c={c} />}
    </div>
  );
}

const MHead = ({ f }: { f: string }) => <thead><tr><Th>{f}</Th><Th r>Выручка</Th><Th r>Посчитано</Th><Th r>Себестоимость</Th><Th r>Прибыль</Th><Th r className="min-w-[130px]">Маржа</Th><Th r>Покрытие</Th></tr></thead>;
const MRow = ({ o, label }: { o: { rev: number; revC: number; cogs: number; gp: number; mg: number | null; cov: number }; label: React.ReactNode }) => <tr><Td>{label}</Td><Td r>{fmt(o.rev)}</Td><Td r>{fmt(o.revC)}</Td><Td r>{fmt(o.cogs)}</Td><Td r b>{fmt(o.gp)}</Td><Td r><MBar v={o.mg} /></Td><Td r className="text-muted-foreground">{pctF(o.cov)}</Td></tr>;
const MFoot = ({ t }: { t: { rev: number; revC: number; cogs: number; gp: number; mg: number | null; cov: number } }) => <tfoot><tr><Td b>Итого</Td><Td r b>{fmt(t.rev)}</Td><Td r b>{fmt(t.revC)}</Td><Td r b>{fmt(t.cogs)}</Td><Td r b>{fmt(t.gp)}</Td><Td r b>{pctF(t.mg)}</Td><Td r b>{pctF(t.cov)}</Td></tr></tfoot>;
