// Раздел «Платежи»: месяц, плитки, список по неделям, боковые карточки, настройка и панель редактирования.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Data, PayItem } from "@/lib/types";
import { useMutations } from "@/lib/useData";
import { MN, MNg, addM, baseAmount, dLong, debtOf, fmt, isOn, list, mName, monthRows, pl, todayTash, totals, type MonthRow } from "./logic";
import { MonthList } from "./MonthList";
import { Kpi, Panel, Ring } from "./parts";
import { ByCat, Debts, Soon } from "./Side";
import { Settings } from "./Settings";
import { Editor } from "./Editor";

const ls = { get: (k: string, d: string) => { try { return localStorage.getItem("kassa-web.pay." + k) ?? d; } catch { return d; } }, set: (k: string, v: string) => { try { localStorage.setItem("kassa-web.pay." + k, v); } catch { /* нет хранилища */ } } };

export function PayPage({ d }: { d: Data }) {
  const T = todayTash();
  const [M, setM] = useState(() => ls.get("m", "") || T.slice(0, 7));
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null), [newKind, setNewKind] = useState<PayItem["kind"]>("fixed");
  const [tab, setTab] = useState<PayItem["kind"]>(() => (ls.get("tab", "fixed") as PayItem["kind"]));
  const mu = useMutations();
  const rows = useMemo(() => monthRows(d, M, T), [d, M, T]);
  const t = totals(rows), next = rows.find((r) => r.st !== "ok" && r.due >= T);
  const debts = useMemo(() => list(d).filter((it) => it.kind === "debt" && isOn(it)).map((it) => ({ it, ...debtOf(d, it, T) })), [d, T]);
  const dLeft = debts.reduce((s, x) => s + (x.left || 0), 0);
  const go = (k: number) => { const m = k ? addM(M, k) : T.slice(0, 7); setM(m); ls.set("m", m === T.slice(0, 7) ? "" : m); setOpen(null); };
  const err = (e: unknown): void => { toast.error("Не удалось сохранить: " + (e instanceof Error ? e.message : String(e))); };
  const run = (p: Promise<void>, ok?: string): Promise<void> => p.then(() => { if (ok) toast.success(ok); }).catch(err);

  const onPlan = (id: string, v: number | null) => { const it = d.items[id]; const base = baseAmount(d, it, M).a;
    run(mu.putMark(id, M, { plan: v == null || Math.round(v) === base ? null : Math.round(v) }), v == null ? "Сумма месяца сброшена" : `Сумма на ${MN[+M.slice(5, 7) - 1].toLowerCase()} сохранена`); };
  const onPaid = (r: MonthRow, v: number | null) => { const man = v == null ? null : Math.max(0, Math.round(v) - r.auto);
    run(mu.putMark(r.it.id, M, { amount: man || null, date: M === T.slice(0, 7) ? T : r.due }), "Оплата сохранена"); };
  const onToggle = (r: MonthRow) => {
    if (r.st === "ok" && r.auto && !r.man) { setOpen(r.it.id); return; }
    const un = r.st === "ok" && r.man > 0;
    run(mu.putMark(r.it.id, M, un ? { amount: null } : { amount: Math.max(0, r.am.a - r.auto) || r.am.a, date: M === T.slice(0, 7) ? T : r.due }), un ? "Отметка снята" : "Оплата отмечена");
  };
  const onChange = (it: PayItem, patch: Partial<PayItem>) => run(mu.putItem(it.id, { ...it, ...patch }));
  const addNew = (k: PayItem["kind"]) => { setNewKind(k); setEdit("new"); };
  // Excel грузится только по нажатию — сайт остаётся лёгким
  const xlsx = async () => {
    try {
      const X = await import("xlsx");
      const ST: Record<string, string> = { ok: "Оплачено", part: "Частично", late: "Просрочено", today: "Сегодня", soon: "Впереди" };
      const ws = X.utils.json_to_sheet(rows.map((r) => ({ "День": r.due, "Платёж": r.it.name, "Откуда": r.it.src, "Точка": r.it.point || "", "Сумма": r.am.a, "Оплачено": r.paid, "Осталось": r.left, "Статус": ST[r.st] })));
      const ws2 = X.utils.json_to_sheet(debts.map((x) => ({ "Долг": x.it.name, "Всего": x.total || null, "Погашено": x.paid, "Осталось": x.left })));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "Платежи " + M); X.utils.book_append_sheet(wb, ws2, "Долги");
      X.writeFile(wb, `Платежи ${mName(M)}.xlsx`); toast.success("Файл скачан");
    } catch (e) { toast.error("Не удалось выгрузить: " + String(e)); }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Saif-Optics · обязательные платежи</div>
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">Платежи</h1>
          <p className="text-[15px] text-muted-foreground">Кредит, аренда, налоги, зарплаты и долги — что уже оплачено и что впереди</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" size="lg" onClick={xlsx}><FileSpreadsheet />Выгрузить Excel</Button><Button size="lg" onClick={() => addNew(tab)}><Plus />Добавить платёж</Button></div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon-lg" className="rounded-full" onClick={() => go(-1)} aria-label="Прошлый месяц"><ChevronLeft /></Button>
          <b className="min-w-40 text-center text-xl font-semibold">{mName(M)}</b>
          <Button variant="secondary" size="icon-lg" className="rounded-full" onClick={() => go(1)} aria-label="Следующий месяц"><ChevronRight /></Button>
          {M !== T.slice(0, 7) && <Button variant="ghost" onClick={() => go(0)}>Сегодня</Button>}
        </div>
        <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[12.5px] text-warn">Новая версия · раздел в доработке: цифры можно менять, всё сохраняется</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label={"Платежи за " + MN[+M.slice(5, 7) - 1].toLowerCase()} value={fmt(t.tot) + " сум"} sub={`${rows.length} ${pl(rows.length, "платёж", "платежа", "платежей")}`} />
        <Kpi i={1} label="Оплачено" value={fmt(t.paid) + " сум"} tone="plus" sub={`${t.okN} из ${rows.length}`} extra={<Ring p={t.tot ? t.paid / t.tot : 0} />} />
        <Kpi i={2} label="Осталось оплатить" value={fmt(t.left) + " сум"} tone="primary" sub={t.late ? <b className="text-minus">просрочено: {t.late}</b> : next ? `ближайший — ${dLong(next.due)}, ${next.it.name}` : "всё оплачено"} />
        <Kpi i={3} label="Остаток долгов" value={dLeft ? fmt(dLeft) + " сум" : "—"} sub={debts.length ? `${debts.length} ${pl(debts.length, "долг", "долга", "долгов")}` : "долгов нет"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={`Платежи · ${MN[+M.slice(5, 7) - 1].toLowerCase()}`} note="Сумма — нажмите, чтобы поставить другую только на этот месяц. «Оплачено» — поправить, сколько уже заплатили. Статус — отметить оплату одним нажатием."
          action={<Button variant="secondary" onClick={() => addNew("fixed")}><Plus />Платёж</Button>}>
          {rows.length ? <MonthList d={d} M={M} T={T} rows={rows} open={open} setOpen={setOpen} onPlan={onPlan} onPaid={onPaid} onToggle={onToggle}
            onReset={(id) => run(mu.putMark(id, M, { plan: null }), "Вернула общую сумму")} onEdit={setEdit} />
            : <p className="glass-inner rounded-2xl p-5 text-[13.5px] text-muted-foreground">В {MNg[+M.slice(5, 7) - 1].replace(/я$/, "е").replace(/а$/, "е")} платежей нет. Добавьте кредит, аренду, налоги и зарплаты — они будут появляться каждый месяц сами.</p>}
        </Panel>
        <aside className="flex flex-col gap-4">
          {M === T.slice(0, 7) && <Soon rows={rows} T={T} onOpen={(id) => { setOpen(id); document.getElementById("pay-main")?.scrollIntoView({ behavior: "smooth" }); }} />}
          <Debts debts={debts} onEdit={setEdit} onAdd={() => addNew("debt")} />
          <ByCat rows={rows} />
        </aside>
      </div>

      <Settings d={d} tab={tab} setTab={(k) => { setTab(k); ls.set("tab", k); }} onChange={onChange} onEdit={setEdit} onAdd={addNew} />
      <Editor d={d} M={M} open={edit} newKind={newKind} onClose={() => setEdit(null)}
        onSave={(id, it) => mu.putItem(id, it).then(() => { toast.success("Сохранено"); }).catch((e) => { err(e); throw e; })}
        onDelete={(id) => mu.delItem(id).then(() => { toast.success("Платёж удалён"); }).catch(err)} />
    </div>
  );
}
