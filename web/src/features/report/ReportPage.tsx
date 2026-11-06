// Раздел «Отчёт р/с»: отчёт по расчётному счёту (+ выписка за день и «Отчёт оптика») и фискальные модули.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { DayReport } from "./DayReport";
import { FiscalView, type FmState } from "./FiscalView";
import { RsView } from "./RsView";
import { Seg, saveBook } from "./ui";
import { CAT_NAMES, RP_MF, catOf, fmCfg, fmDays, fmIsOn, parseRahmat, pl, rsByMonth, rsDays, todayTash, type FmDay } from "./logic";

const HEAD = {
  rs: ["Saif-Optics · расчётный счёт", "Отчёт по расчётному счёту", "Остаток, поступления и расходы со счёта — по дням и месяцам"],
  fm: ["Saif-Optics · фискальные модули", "Фискальные модули", "Гросс нал и безнал по кассам точек — за день и за всё время"],
} as const;
const ls = { get: (k: string, d: string) => { try { return localStorage.getItem("kassa-web.report." + k) ?? d; } catch { return d; } }, set: (k: string, v: string) => { try { localStorage.setItem("kassa-web.report." + k, v); } catch { /* нет хранилища */ } } };

export function ReportPage({ d }: { d: Data }) {
  const [view, setView] = useState<"rs" | "fm">(() => (ls.get("view", "rs") === "fm" ? "fm" : "rs"));
  const [fm, setFm] = useState<FmState>({ m: "", d: "", open: null, edit: null });
  const [ed, setEd] = useState(false), [req, setReq] = useState<{ day: string; n: number } | null>(null);
  const file = useRef<HTMLInputElement>(null), mu = useMutations(), T = todayTash();
  // переход из «Сверки → Фискальные модули ↔ Касса»: открыть нужный день и точку
  useEffect(() => {
    try { const v = sessionStorage.getItem("kassa-web.report.go"); if (!v) return; sessionStorage.removeItem("kassa-web.report.go"); const g = JSON.parse(v) as { d: string; p: string; edit: "day" | "mod" };
      setView("fm"); setFm({ m: g.d.slice(0, 7), d: g.d, open: g.p, edit: g.edit }); } catch { /* нет хранилища */ }
  }, []);
  const [e1, t, p] = HEAD[view];
  const patchFm = (x: Partial<FmState>) => setFm((f) => ({ ...f, ...x }));
  const pickView = (v: "rs" | "fm") => { setView(v); ls.set("view", v); };

  const openEditor = (day: string | null) => {
    setEd(true); if (day) setReq({ day, n: Date.now() });
    setTimeout(() => document.getElementById("rs-old")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const addFm = () => {
    const P = d.points.filter((x) => fmIsOn(d, x)), days = fmDays(d);
    patchFm({ d: T, m: T.slice(0, 7), open: P.find((x) => !days[T]?.pts?.[x]) || P[0] || d.points[0], edit: null });
  };
  const importRahmat = async (f: File) => {
    try {
      const { acc, n, unknown } = await parseRahmat(await f.arrayBuffer(), f.name, fmCfg(d).mods);
      // модули, которые ещё не включены, не трогаем — раздел пока в подготовке
      const off = new Set<string>(), ds = Object.keys(acc).sort(); let saved = 0;
      for (const day of ds) {
        const pts: NonNullable<FmDay["pts"]> = {};
        Object.entries(acc[day]).forEach(([pt, v]) => { if (fmIsOn(d, pt)) { pts[pt] = v; saved += v.k; } else off.add(pt); });
        if (Object.keys(pts).length) { const cur = { date: day, pts: {}, ...(fmDays(d)[day] || {}) } as FmDay; cur.pts = { ...cur.pts, ...pts }; cur.updatedAt = Date.now(); await mu.putDoc("fiscal", day, cur); }
      }
      if (!n) { toast.error(unknown.length ? "Чеки есть, но модуль не привязан к точке: " + unknown.join(", ") : "В файле не нашлось чеков продаж"); return; }
      if (saved) toast.success(`Загружено ${saved} ${pl(saved, "чек", "чека", "чеков")}${off.size ? ` · выключенные модули пропущены: ${[...off].join(", ")}` : ""}`);
      else toast.error(`В файле ${n} ${pl(n, "чек", "чека", "чеков")} (${[...off].join(", ")}), но модули выключены — ничего не записано`);
      if (saved) patchFm({ d: ds[ds.length - 1], m: ds[ds.length - 1].slice(0, 7) });
    } catch (e) { toast.error("Не удалось прочитать файл: " + (e instanceof Error ? e.message : String(e))); }
  };
  const xlsx = async () => {
    try {
      const BM = rsByMonth(d), all = rsDays(d), cats = CAT_NAMES.filter((c) => BM.ms.some((m) => BM.rows[m].cat[c])), mn = (m: string) => RP_MF[+m.slice(5, 7) - 1];
      await saveBook("Отчёт по расчётному счёту", [
        ["По месяцам", [["Месяц", "Остаток на начало", "Поступило", "Списано", "Остаток на конец"], ...BM.ms.map((m) => { const r = BM.rows[m]; return [mn(m) + " " + m.slice(0, 4), r.start, Math.round(r.in), Math.round(r.out), r.end]; })]],
        ["Статьи", [["Статья", ...BM.ms.map(mn), "Итого"], ...cats.map((c) => [c, ...BM.ms.map((m) => Math.round(BM.rows[m].cat[c] || 0)), Math.round(BM.ms.reduce((s, m) => s + (BM.rows[m].cat[c] || 0), 0))])]],
        ["По дням", [["День", "Утром", "Поступило", "Списано", "Вечером"], ...all.map((x) => [x.d, x.s, x.in == null ? null : Math.round(x.in), Math.round(x.out), x.e])]],
        ["Расходы", [["День", "Расход", "Статья", "Сумма"], ...all.flatMap((x) => x.bank.map((b) => [x.d, b.n, catOf(b), +(b.a as number)]))]],
      ]);
      toast.success("Файл скачан");
    } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{e1}</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight max-sm:text-[28px]">{t}</h1>
          <p className="text-[15px] text-muted-foreground">{p}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {view === "rs" ? <>
            <Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button>
            <Button size="lg" onClick={() => openEditor(null)}><Plus />Внести выписку за день</Button></> : <>
            <Button variant="secondary" size="lg" onClick={() => file.current?.click()}><Upload />Загрузить отчёт Rahmat</Button>
            <Button size="lg" onClick={addFm}><Plus />Внести гросс за день</Button>
            <input ref={file} type="file" accept=".zip,.xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importRahmat(f); }} /></>}
        </div>
      </header>
      <Seg value={view} onChange={pickView} label="Вид" options={[["rs", "Расчётный счёт"], ["fm", "Фискальные модули"]]} />

      {view === "fm" ? <FiscalView d={d} F={fm} setF={patchFm} /> : <>
        <RsView d={d} onEdit={openEditor} />
        <div id="rs-old">
          <Panel title="Выписка за день и ежедневный отчёт оптика" note="Ввод остатков и расходов по р/с, выручка по точкам, гросс нал/безнал, расходы с Б/Ч и Excel «Отчёт оптика»"
            action={<Button variant="secondary" aria-expanded={ed} onClick={() => setEd((v) => !v)}>{ed ? "Свернуть" : "Развернуть"}<ChevronDown className={cn("transition-transform", ed && "rotate-180")} /></Button>}>
            {ed ? <DayReport d={d} open={req} /> : null}
          </Panel>
        </div>
      </>}
    </div>
  );
}
