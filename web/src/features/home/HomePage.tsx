// Раздел «Главная»: итоги дня и месяца, быстрые действия, карточки разделов, точки и последние продажи.
import { useMemo } from "react";
import { motion } from "motion/react";
import { BarChart3, ChevronRight, Flame, Glasses, Plus, Receipt, ReceiptText, ShoppingBag, Tag, Target, Trophy, Wallet, Calculator, type LucideIcon } from "lucide-react";
import type { Data } from "@/lib/types";
import { Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { todayTash } from "../kassa/logic";
import { Bar as ProgressBar, Eyebrow, MiniRing, Spark, Tile } from "../plan/parts";
import { pointColor } from "../plan/Points";
import { fmt } from "../plan/logic";
import { homeData, dateTitle, partsText, type Part } from "./logic";
import { WeekChart } from "./WeekChart";

const GO = (id: string, field?: string) => () => {
  location.hash = id; window.scrollTo({ top: 0, behavior: "smooth" });
  // быстрые действия: после перехода — курсор в нужное поле раздела
  if (field) { let n = 0; const t = window.setInterval(() => { const el = document.querySelector<HTMLInputElement>(field); if (el || ++n > 40) { window.clearInterval(t); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } } }, 100); }
};
const F_SALE = 'input[aria-label="Товар"]', F_EXP = 'input[placeholder="Например: Премиум за такси"]', F_CASH = 'input[aria-label="Сколько наличных в кассе"]';

const SEC_ICON: Record<string, LucideIcon> = { cash: Wallet, receipt: ShoppingBag, chart: BarChart3, target: Target, glasses: Glasses, tag: Tag };
const SEC_COL: Record<string, string> = { kassa: "#0a84ff", sales: "#34c759", analytics: "#5e5ce6", plan: "#ff9f0a", lens: "#bf5af2", batch: "#ff375f" };
const BR_ICON: Record<string, [LucideIcon, string]> = { trophy: [Trophy, "#ff9f0a"], receipt: [Receipt, "#34c759"], flame: [Flame, "#ff375f"], bag: [ShoppingBag, "#5e5ce6"] };

function Sub({ parts, light }: { parts: Part[]; light?: boolean }) {
  return (
    <span className={cn("text-[12.5px] leading-snug", light ? "text-white/85" : "text-muted-foreground")}>
      {parts.map((p, i) => (
        <span key={i}>{i > 0 && " · "}{typeof p === "string" ? p : <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", p.good ? "bg-plus-soft text-plus" : "bg-minus-soft text-minus", light && "bg-white/20 text-white")}>{p.tag}</span>}</span>
      ))}
    </span>
  );
}

function IconBox({ icon: I, color }: { icon: LucideIcon; color: string }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: color + "26", color }}><I className="size-5" strokeWidth={1.9} /></span>;
}

export function HomePage({ d }: { d: Data }) {
  const today = todayTash();
  const h = useMemo(() => homeData(d, today), [d, today]);
  const mx = Math.max(1, ...h.pts.map((o) => o.r));
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · Касса Оптики</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Главная</h1>
          <p className="text-[15px] text-muted-foreground">{dateTitle(today)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={GO("sales", F_SALE)}><Plus />Продажа</Button>
          <Button size="lg" variant="secondary" onClick={GO("kassa", F_EXP)}><Plus />Расход</Button>
          <Button size="lg" variant="secondary" onClick={GO("kassa", F_CASH)}><Calculator />Пересчитать кассу</Button>
        </div>
      </header>

      {/* итоги */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {h.hero.map((c, i) => (
          <Tile key={c.kind} i={i} hero={c.kind === "main"} className={cn(c.warn && "ring-2 ring-minus/50")}>
            <Eyebrow light={c.kind === "main"}>{c.label}</Eyebrow>
            <div className="flex items-center justify-between gap-2">
              <span className={cn("num truncate text-[26px] font-semibold tracking-tight", c.warn && "text-minus")}>{c.value}</span>
              {c.spark && <Spark data={c.spark} color="#fff" />}
              {c.ring && <MiniRing p={c.ring.p} color={c.ring.color} />}
            </div>
            <Sub parts={c.sub} light={c.kind === "main"} />
          </Tile>
        ))}
      </div>

      {/* коротко о месяце + 14 дней */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Коротко о месяце" note={h.briefNote}>
          {h.brief.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {h.brief.map((b, i) => {
                const [I, col] = BR_ICON[b.icon];
                return (
                  <motion.div key={b.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="glass-inner flex min-w-0 items-center gap-3 rounded-2xl p-3">
                    <IconBox icon={I} color={col} />
                    <div className="min-w-0"><span className="block truncate text-[11.5px] text-muted-foreground">{b.title}</span><b className="num block truncate text-[15px]">{b.value}</b><span className="block truncate text-[11.5px] text-muted-foreground">{b.sub}</span></div>
                  </motion.div>
                );
              })}
            </div>
          ) : <p className="py-6 text-center text-muted-foreground">Продаж в этом месяце пока нет</p>}
        </Panel>
        <Panel title="Выручка за 14 дней" note={undefined}>
          <p className="-mt-3 mb-2 text-[13px] text-muted-foreground">последние 7 дней {h.week.note.replace("последние 7 дней ", "")}
            {h.week.delta != null && <span className={cn("ml-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", h.week.delta >= 0 ? "bg-plus-soft text-plus" : "bg-minus-soft text-minus")}>{(h.week.delta >= 0 ? "+" : "−") + Math.abs(h.week.delta)}% к неделе раньше</span>}<span className="ml-1.5">· подписи в млн сум</span></p>
          <WeekChart bars={h.week.bars} />
        </Panel>
      </div>

      {/* разделы */}
      <section className="flex flex-col gap-3">
        <div><h2 className="text-[17px] font-semibold tracking-tight">Разделы</h2><p className="mt-0.5 text-[13px] text-muted-foreground">Нажмите на карточку, чтобы открыть раздел.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {h.cards.map((c, i) => (
            <motion.button key={c.id} type="button" onClick={GO(c.id)} initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.1 + i * 0.05, duration: 0.45 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
              className="glass flex min-w-0 flex-col gap-3 rounded-[24px] p-4 text-left">
              <div className="flex items-center gap-3"><IconBox icon={SEC_ICON[c.icon] ?? ReceiptText} color={SEC_COL[c.id]} /><span className="flex-1 truncate text-base font-semibold">{c.title}</span><ChevronRight className="size-5 text-muted-foreground" /></div>
              <p className="text-[12.5px] leading-snug text-muted-foreground">{c.hint}</p>
              <div className="grid grid-cols-2 gap-2">
                {c.nums.map(([v, l]) => <div key={l} className="glass-inner min-w-0 rounded-2xl px-3 py-2"><b className="num block truncate text-[16px]">{v}</b><span className="block text-[11px] leading-tight text-muted-foreground">{l}</span></div>)}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* точки + последние продажи */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Точки сегодня" note={h.ptNote}>
          {h.pts.length ? (
            <div className="flex flex-col gap-4">
              {h.pts.map((o) => (
                <div key={o.p} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: pointColor(d.points, o.p) }} /><b className="truncate">{o.p}</b><span className="truncate text-xs text-muted-foreground">{o.checks}{o.seller ? " · " + o.seller : ""}</span></span>
                    <b className="num shrink-0">{fmt(o.r)}</b>
                  </div>
                  <ProgressBar v={o.r / mx} color={pointColor(d.points, o.p)} h={8} />
                  <span className="text-xs text-muted-foreground">за месяц {fmt(o.month)}{o.planPct ? ` · ${o.planPct} плана точки` : ""}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3"><b>{h.ptTotalLabel}</b><b className="num">{fmt(h.dayRev)}</b></div>
            </div>
          ) : <p className="py-6 text-center text-muted-foreground">Продаж пока нет</p>}
        </Panel>
        <Panel title="Последние продажи" note="Последние записи в журнале продаж">
          {h.last.length ? (
            <div className="flex flex-col">
              {h.last.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                  <i className="size-2.5 shrink-0 rounded-full" style={{ background: pointColor(d.points, s.point) }} />
                  <div className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{s.product}</span><span className="block truncate text-xs text-muted-foreground">{s.when} · {s.point}</span></div>
                  <b className="num shrink-0 text-sm">{fmt(s.sum)}</b>
                </div>
              ))}
            </div>
          ) : <p className="py-6 text-center text-muted-foreground">Продаж пока нет</p>}
        </Panel>
      </div>
      <span className="sr-only">{h.hero.map((c) => c.label + " " + c.value + " " + partsText(c.sub)).join(". ")}</span>
    </div>
  );
}
