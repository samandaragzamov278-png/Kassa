// «Billz → Касса»: каждый день в 20:00 чеки и остатки Сергели и C1 загружаются сами. Статус, сверка по дням, склад и кнопка «Обновить сейчас».
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { Seg, Tbl, Td, Tr, TONES } from "../report/ui";
import { BZP, bzNext, bzOf, bzRun, bzState, dS, fmt, pl } from "./logic";

export function BillzPanel({ d }: { d: Data }) {
  const qc = useQueryClient();
  const [p, setP] = useState("Сергели"), [busy, setBusy] = useState<Record<string, boolean>>({});
  const s = bzOf(d, p), st = bzState(d, p), last = s && (s.ok ? s : s.lastOk), b = !!busy[p];
  const sc = last?.salesCheck || [], att = last?.attention || [], sk = last?.stock || null, sl = last?.sales || null;
  const run = async () => {
    setBusy((x) => ({ ...x, [p]: true }));
    const r = await bzRun(p);
    setBusy((x) => ({ ...x, [p]: false }));
    if (r && r.ok === false) toast.error(`Billz ${p}: ${r.error}`); else toast.success(`Billz ${p}: загрузка выполнена`);
    qc.invalidateQueries({ queryKey: ["bz"] }); qc.invalidateQueries({ queryKey: ["kassa-data"] });
  };
  return (
    <Panel title="Billz → Касса" note={`Каждый день в 20:00 сами загружаются чеки и остатки Сергели и C1. Следующая загрузка ${p}: ${bzNext(p)}.`}
      action={<Button disabled={b} onClick={run}><RefreshCw className={cn(b && "animate-spin")} />{b ? "Загружаю…" : "Обновить сейчас"}</Button>}>
      <div className="flex flex-col gap-3">
        <Seg value={p} onChange={setP} label="Точка" options={Object.keys(BZP).map((k) => [k, <span key={k} className="flex items-center"><i className={cn("mr-2 inline-block size-2 rounded-full", { ok: "bg-plus", warn: "bg-warn", err: "bg-minus", wait: "bg-muted-foreground/60" }[bzState(d, k).cls])} />{k}</span>])} />
        <div className={cn("rounded-xl px-3 py-2 text-[13px] font-semibold", TONES[st.cls === "err" ? "bad" : st.cls === "wait" ? "wait" : st.cls])}>{st.t}</div>
        {last && (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <b>Продажи</b>
              <p className="text-[13px] text-muted-foreground">{sl && sl.checks ? `добавлено ${sl.checks} ${pl(sl.checks, "чек", "чека", "чеков")}, оплачено ${fmt(sl.sum)} сум` : "новых чеков не было"}{sl?.debts?.length ? ` · долги: ${sl.debts.map((x) => dS(x.d) + " " + fmt(x.debt)).join(", ")}` : ""}</p>
              <div className="mt-2"><Tbl head={["День", ["Billz", "r"], ["Касса", "r"], ""]}>
                {sc.slice(-7).reverse().map((x) => <Tr key={x.d}><Td h>{dS(x.d)}</Td><Td r l="Billz">{fmt(x.billz)}</Td><Td r l="Касса">{fmt(x.kassa)}</Td><Td l="">{x.ok ? <span className="text-plus">✓</span> : <span className="text-minus">≠ {fmt(x.kassa - x.billz)}</span>}</Td></Tr>)}
                {!sc.length && <Tr><Td colSpan={4} className="text-muted-foreground">Продаж за неделю нет</Td></Tr>}
              </Tbl></div>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">В «Кассе» учитываются продажи вместе с отмеченными долгами.</p>
            </div>
            <div>
              <b>Склад</b>
              <p className="text-[13px] text-muted-foreground">{sk ? `${fmt(sk.items)} позиций, ${fmt(sk.qty)} шт по Billz` : "—"}{sk?.baseline ? " · первый снимок, сверка начнётся со следующей загрузки" : sk ? ` · расхождений: ${sk.diffCount || 0}` : ""}</p>
              {sk?.diffs?.length ? <>
                <div className="mt-2"><Tbl head={["Товар", ["Было", "r"], ["Продано", "r"], ["Должно", "r"], ["В Billz", "r"], ["Разница", "r"]]}>
                  {sk.diffs.slice(0, 30).map((x, i) => <Tr key={i}><Td h>{x.n}<br /><span className="text-[12px] font-normal text-muted-foreground">{x.s}</span></Td><Td r l="Было">{fmt(x.prev)}</Td><Td r l="Продано">{fmt(x.sold)}</Td><Td r l="Должно">{fmt(x.exp)}</Td><Td r l="В Billz">{fmt(x.now)}</Td>
                    <Td r l="Разница"><b className={x.d > 0 ? "text-plus" : "text-minus"}>{x.d > 0 ? "+" : ""}{fmt(x.d)}</b></Td></Tr>)}
                </Tbl></div>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">Плюс — товар пришёл (перемещение, поставка). Минус — ушёл без продажи в Кассе (перемещение, списание, недостача).</p></>
                : sk && !sk.baseline ? <p className="mt-2 text-[13px] text-muted-foreground">Остатки сходятся с продажами ✓</p> : null}
            </div>
          </div>)}
        {att.length > 0 && <div className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-semibold text-warn">Требует внимания: {att.join("; ")}</div>}
      </div>
    </Panel>
  );
}
