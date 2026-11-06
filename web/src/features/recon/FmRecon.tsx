// «Фискальные модули ↔ Касса»: сколько нала и безнала пробито через модули и сходится ли это с продажами Кассы.
import { useState } from "react";
import { Kpi, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import type { Data } from "@/lib/types";
import { PrepBanner } from "../report/FiscalView";
import { fmMod, fmReconRows, type FmStatus } from "../report/logic";
import { Dash, Pill, Tbl, Td, Tr, ptColor, saveBook, usePaging, type Tone } from "../report/ui";
import { Controls, type Filters } from "./Controls";
import { dL, dS, fmt, pl, sgn, wd } from "./logic";

const ST: Record<FmStatus, [Tone, string]> = { ok: ["ok", "Сходится"], short: ["bad", "Не пробито"], over: ["warn", "В ФМ больше"], nofm: ["warn", "Нет отчёта ФМ"], off: ["off", "Модуль не подключён"] };

export async function fmRcExport(d: Data, F: Filters) {
  const rows = fmReconRows(d, F.f, F.t, F.pt);
  await saveBook(`Сверка фискальных модулей ${F.f}—${F.t}`, [["Сверка ФМ", rows.map((o) => ({ "День": o.d, "Точка": o.p, "Нал Касса": o.k.c, "Нал ФМ": o.x ? o.x.c : null, "Разница нал": o.dc, "Безнал Касса": o.k.n, "Безнал ФМ": o.x ? o.x.n : null, "Разница безнал": o.dn, "Статус": ST[o.st][1] }))]]);
}

/** перейти в «Отчёт р/с → Фискальные модули» на нужный день и точку */
function jump(day: string, p: string, on: boolean) {
  try { localStorage.setItem("kassa-web.report.view", "fm"); sessionStorage.setItem("kassa-web.report.go", JSON.stringify({ d: day, p, edit: on ? "day" : "mod" })); } catch { /* нет хранилища */ }
  location.hash = "report"; window.scrollTo({ top: 0, behavior: "smooth" });
}

export function FmRecon({ d, F }: { d: Data; F: Filters }) {
  const [sel, setSel] = useState<string | null>(null);
  const rows = fmReconRows(d, F.f, F.t, F.pt), bad = rows.filter((o) => o.st !== "ok" && o.st !== "off"), list = F.only ? bad : rows;
  const A = { kc: 0, kn: 0, fc: 0, fn: 0 }; rows.forEach((o) => { if (!o.on) return; A.kc += o.k.c; A.kn += o.k.n; if (o.x) { A.fc += o.x.c; A.fn += o.x.n; } });
  const dc = A.fc - A.kc, dn = A.fn - A.kn, idx = list.findIndex((o) => o.d + "|" + o.p === sel), pg = usePaging(list.length, "recon-fm", idx, F.f + F.t + F.pt + F.only);
  const cell = (v: number | undefined, miss: boolean) => (miss ? <Dash /> : fmt(v || 0));
  const dcell = (v: number | null) => (v == null ? <Dash /> : Math.abs(v) < 1 ? <span className="text-plus">0</span> : <b className="text-minus">{sgn(v)}</b>);
  return (
    <>
      <PrepBanner d={d} />
      <Controls F={F} points={d.points} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label="Нал · Касса / ФМ" value={`${fmt(A.kc)} / ${fmt(A.fc)}`} sub={<>разница <b className={Math.abs(dc) < 1 ? "text-plus" : "text-minus"}>{sgn(dc)}</b></>} />
        <Kpi i={1} label="Безнал · Касса / ФМ" value={`${fmt(A.kn)} / ${fmt(A.fn)}`} sub={<>разница <b className={Math.abs(dn) < 1 ? "text-plus" : "text-minus"}>{sgn(dn)}</b></>} />
        <Kpi i={2} label="Не пробито через ФМ" value={fmt(Math.max(0, -dc) + Math.max(0, -dn)) + " сум"} sub={`нал ${fmt(Math.max(0, -dc))} · безнал ${fmt(Math.max(0, -dn))}`} />
        <Kpi i={3} label="Дни с расхождением" value={String(bad.length)} tone={bad.length ? undefined : "plus"} sub={bad.length ? "отмечены цветом в таблице" : "всё сходится ✓"} />
      </div>
      <Panel title="По дням и точкам" note="Касса: нал — «Наличные», безнал — терминал и QR. Перечисления на р/с в сверку не входят. Нажмите строку, чтобы увидеть продажи Кассы за день рядом с цифрами модуля.">
        <Tbl head={["День", "Точка", ["Нал · Касса", "r"], ["Нал · ФМ", "r"], ["Разница", "r"], ["Безнал · Касса", "r"], ["Безнал · ФМ", "r"], ["Разница", "r"], ""]}>
          {list.slice(pg.from, pg.to).map((o) => {
            const k = o.d + "|" + o.p, on = sel === k, [tone, lab] = ST[o.st];
            return [
              <Tr key={k} tap tone={o.st === "short" ? "bad" : o.st === "nofm" || o.st === "over" ? "warn" : o.st === "off" ? "dim" : undefined} selected={on} onClick={() => setSel(on ? null : k)}>
                <Td h>{dS(o.d)} <span className="ml-1 text-[12px] font-normal text-muted-foreground">{wd(o.d)}</span></Td>
                <Td l="Точка"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: ptColor(o.p) }} />{o.p}</Td>
                <Td r l="Нал · Касса">{fmt(o.k.c)}</Td><Td r l="Нал · ФМ">{cell(o.x?.c, !o.x)}</Td><Td r l="Разница нал">{dcell(o.dc)}</Td>
                <Td r l="Безнал · Касса">{fmt(o.k.n)}</Td><Td r l="Безнал · ФМ">{cell(o.x?.n, !o.x)}</Td><Td r l="Разница безнал">{dcell(o.dn)}</Td><Td><Pill tone={tone}>{lab}</Pill></Td></Tr>,
              on && <tr key={k + "-d"} className="max-md:block"><td colSpan={9} className="bg-muted/30 px-3 py-3 max-md:block"><Det d={d} o={o} /></td></tr>,
            ];
          })}
          {!list.length && <Tr><Td colSpan={9} className="py-4 text-center text-muted-foreground">{F.only ? "Расхождений нет ✓" : "Продаж за период нет"}</Td></Tr>}
        </Tbl>
        {pg.bar}
      </Panel>
    </>
  );
}

function Det({ d, o }: { d: Data; o: ReturnType<typeof fmReconRows>[number] }) {
  const by: Record<string, { s: (typeof o.k.rows)[number]; v: number }[]> = {};
  o.k.rows.forEach((s) => { const parts: [string, number][] = s.pay === "Смешанная" && s.pays ? Object.entries(s.pays) : [[s.pay, +s.sum || 0]]; parts.forEach(([pay, v]) => { (by[pay] ||= []).push({ s, v: +v || 0 }); }); });
  const m = fmMod(d, o.p), x = o.x;
  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <div><h3 className="mb-2 text-[14.5px] font-semibold">Касса · {o.p} · {dL(o.d)}</h3>
        {Object.entries(by).map(([pay, L]) => (
          <div key={pay} className="mb-2"><h4 className="text-[13px] font-semibold">{pay} <span className="font-normal text-muted-foreground">{L.length} {pl(L.length, "запись", "записи", "записей")} · {fmt(L.reduce((a, b) => a + b.v, 0))}</span></h4>
            {L.map(({ s, v }, i) => <div key={i} className="flex justify-between gap-3 py-0.5 text-[13px]"><span>{s.check ? <span className="text-muted-foreground">чек {s.check} </span> : null}{s.product || s.cat || ""}</span><b className="num font-medium">{fmt(v)}</b></div>)}</div>))}
        {!o.k.rows.length && <p className="text-[13px] text-muted-foreground">Продаж в Кассе нет.</p>}</div>
      <div><h3 className="mb-2 text-[14.5px] font-semibold">Фискальный модуль{m?.fm ? <span className="font-normal text-muted-foreground"> · {m.fm}</span> : null}</h3>
        {!o.on ? <p className="text-[13px] text-muted-foreground">Для этой точки модуль не подключён — добавьте его в «Отчёт р/с → Фискальные модули».</p>
          : x ? <>{([["Нал", fmt(x.c)], ["Безнал", fmt(x.n)], ["Чеков", x.k ? String(x.k) : "—"]] as const).map(([l, v]) => <div key={l} className="flex justify-between py-0.5 text-[13px]"><span>{l}</span><b className="num font-medium">{v}</b></div>)}</>
            : <p className="text-[13px] text-muted-foreground">Гросс за этот день ещё не внесён.</p>}
        <Button variant="secondary" className="mt-3 max-w-full whitespace-normal" onClick={() => jump(o.d, o.p, o.on)}>{x ? "Открыть день" : "Внести гросс"} в «Фискальных модулях»</Button></div>
    </div>
  );
}
