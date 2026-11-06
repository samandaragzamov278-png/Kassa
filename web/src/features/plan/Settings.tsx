// «Настроить план»: сумма месяца, доли точек, продавцы. Сохраняет settings/plan в том же формате, что рабочий сайт.
import { useState } from "react";
import { ChevronDown, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Data } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { buildPlanDoc, fmt, parseAmt, plPrevShares, type PlanCalc, type PlanCfg, type PlanEnv } from "./logic";

const comma = (v: number | undefined) => String(v ?? 0).replace(".", ",");

export function PlanSettings({ d, env, cfg, month, K, open, setOpen }: { d: Data; env: PlanEnv; cfg: PlanCfg; month: string; K: PlanCalc; open: boolean; setOpen: (f: (o: boolean) => boolean) => void }) {
  const mu = useMutations();
  const [total, setTotal] = useState(K.c.total ? fmt(K.c.total) : "");
  const [sh, setSh] = useState<Record<string, string>>(() => Object.fromEntries(env.points.map((p) => [p, comma(K.shares[p])])));
  const [sel, setSel] = useState<Record<string, string>>(() => Object.fromEntries(env.points.map((p) => [p, cfg.sellers[p] || ""])));
  const [msg, setMsg] = useState<{ t: string; bad?: boolean }>({ t: "" });
  const [busy, setBusy] = useState(false);

  const fillAuto = () => { const a = plPrevShares(env, month); setSh(Object.fromEntries(env.points.map((p) => [p, comma(a[p])]))); setMsg({ t: "Доли подставлены — нажмите «Сохранить план»" }); };
  const sumShares = env.points.reduce((a, p) => a + (parseFloat(String(sh[p] ?? "").replace(",", ".")) || 0), 0);
  const save = async () => {
    const r = buildPlanDoc((d.rows.settings || {}).plan as Record<string, unknown> | undefined, cfg, month, total, sh, sel);
    if (!r.ok) { setMsg({ t: r.msg, bad: true }); return; }
    setBusy(true);
    try { await mu.putDoc("settings", "plan", r.doc); setMsg({ t: "Сохранено" }); toast.success("План сохранён"); }
    catch { setMsg({ t: "Не удалось сохранить", bad: true }); toast.error("Не удалось сохранить план"); }
    finally { setBusy(false); }
  };

  return (
    <section className="glass rounded-[26px]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 rounded-[26px] p-5 text-left">
        <span className="min-w-0"><b className="text-[17px] tracking-tight">Настроить план</b><span className="block text-[13px] text-muted-foreground sm:ml-2 sm:inline">· сумма месяца, доли точек, продавцы</span></span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <form className="flex flex-col gap-4 px-5 pb-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
              <div className="grid gap-1.5 sm:max-w-sm">
                <Label htmlFor="plTotal">План месяца, сум</Label>
                <Input id="plTotal" value={total} inputMode="numeric" autoComplete="off" className="num" onChange={(e) => { const v = parseAmt(e.target.value); setTotal(isNaN(v) ? "" : fmt(v)); }} />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {env.points.map((p) => (
                  <div key={p} className="glass-inner grid grid-cols-[minmax(0,1fr)_96px] gap-2 rounded-2xl p-3">
                    <div className="grid gap-1.5"><Label htmlFor={"ps-" + p} className="truncate">{p} · продавец</Label><Input id={"ps-" + p} value={sel[p] ?? ""} placeholder="Имя" onChange={(e) => setSel((s) => ({ ...s, [p]: e.target.value }))} /></div>
                    <div className="grid gap-1.5"><Label htmlFor={"psh-" + p}>Доля, %</Label><Input id={"psh-" + p} value={sh[p] ?? ""} inputMode="decimal" className="num" onChange={(e) => setSh((s) => ({ ...s, [p]: e.target.value }))} /></div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={busy}><Save />Сохранить план</Button>
                <Button type="button" variant="secondary" onClick={fillAuto}><Wand2 />Доли по прошлому месяцу</Button>
                <span className="num text-[13px] text-muted-foreground">сумма долей {String(Math.round(sumShares * 10) / 10).replace(".", ",")}%</span>
                <span role="status" className={cn("text-[13px]", msg.bad ? "text-minus" : "text-plus")}>{msg.t}</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
