// Долги: возникшие в периоде и все ещё открытые старые — продажа, оплачено, долг, погашения и статус.
import { Panel } from "@/components/kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dShort, fmt, type Filter, type SaleX } from "./logic";
import { debtsOf } from "./debts";

const Dash = () => <span className="text-muted-foreground">—</span>;

export function Debts({ sales, F }: { sales: SaleX[]; F: Filter }) {
  const r = debtsOf(sales, F.from, F.to, F.point), empty = !r.rows.length && !r.orphans.length;
  return (
    <Panel title="Долги" note="Долги из пометок «долг … не записан» и их погашения. «Старый» — продажа раньше выбранного периода.">
      <p className="mb-2 text-[13px] text-muted-foreground">{empty ? "Долгов нет" : <>Открыто: <b className="num text-foreground">{r.openCount}</b> на сумму <b className="num text-foreground">{fmt(r.openSum)}</b> · Закрыто за период: <b className="num text-foreground">{r.closedCount}</b></>}</p>
      {!empty && <div className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Дата продажи</TableHead><TableHead>Точка</TableHead><TableHead>Товар</TableHead><TableHead className="text-right">Чек</TableHead><TableHead className="text-right">Оплачено при продаже</TableHead><TableHead className="text-right">Долг</TableHead><TableHead className="text-right">Погашено</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
        <TableBody>
          {r.rows.map((d) => (
            <TableRow key={d.key}>
              <TableCell className="num whitespace-nowrap">{dShort(d.date)}{d.old && <small className="ml-1 text-muted-foreground">старый</small>}</TableCell>
              <TableCell>{d.point}</TableCell><TableCell className="min-w-40">{d.product}</TableCell>
              <TableCell className="num text-right">{fmt(d.full)}</TableCell><TableCell className="num text-right">{fmt(d.paid)}</TableCell><TableCell className="num text-right font-semibold">{fmt(d.debt)}</TableCell>
              <TableCell className="num text-right">{d.pays.length ? <>{fmt(d.repaid)} <small className="text-muted-foreground">{d.pays.map((p) => dShort(p.date)).join(", ")}</small></> : <Dash />}</TableCell>
              <TableCell className="whitespace-nowrap font-semibold">{d.closedAt ? <span className="text-plus">закрыт {dShort(d.closedAt)}</span> : <span className="text-minus">остаток {fmt(d.rest)}</span>}</TableCell>
            </TableRow>))}
          {r.orphans.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="num whitespace-nowrap">{dShort(o.date)}</TableCell><TableCell>{o.point}</TableCell><TableCell className="min-w-40">{o.product}</TableCell>
              <TableCell className="text-right"><Dash /></TableCell><TableCell className="text-right"><Dash /></TableCell><TableCell className="text-right"><Dash /></TableCell>
              <TableCell className="num text-right">{fmt(o.sum)}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">погашение без продажи</TableCell>
            </TableRow>))}
        </TableBody>
      </Table></div>}
    </Panel>
  );
}
