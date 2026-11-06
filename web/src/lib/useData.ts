// Данные Кассы через TanStack Query: загрузка, живые обновления и запись с мгновенным откликом на экране.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { delDoc, loadData, setDoc, subscribe } from "./source";
import type { Data, Entry, PayItem, PayMark, Template } from "./types";

const KEY = ["kassa-data"];

export function useData() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: loadData, staleTime: 60_000 });
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    // изменения с рабочего сайта и других устройств — перечитываем, но не чаще раза в секунду
    const off = subscribe(() => { clearTimeout(t); t = setTimeout(() => qc.invalidateQueries({ queryKey: KEY }), 800); });
    return () => { clearTimeout(t); off(); };
  }, [qc]);
  return q;
}

/** запись: сначала меняем данные на экране, потом в базе; при ошибке — перечитываем */
export function useMutations() {
  const qc = useQueryClient();
  const patch = (f: (d: Data) => Data) => qc.setQueryData<Data>(KEY, (d) => (d ? f(d) : d));
  const safe = async (p: Promise<void>) => { try { await p; } catch (e) { await qc.invalidateQueries({ queryKey: KEY }); throw e; } };
  const upsert = <T extends { id: string }>(arr: T[], x: T) => { const i = arr.findIndex((y) => y.id === x.id); const a = arr.slice(); if (i >= 0) a[i] = x; else a.push(x); return a; };
  const reload = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    /** любой документ docs: col/id. Для коллекций, у которых нет своих полей в Data, — данные в Data.rows; после записи перечитываем */
    async putDoc(col: string, id: string, data: object) {
      const clean = JSON.parse(JSON.stringify(data));
      patch((d) => ({ ...d, rows: { ...d.rows, [col]: { ...(d.rows[col] || {}), [id]: clean } }, ...(col === "sales" ? { sales: upsert(d.sales, { ...clean, id }) } : {}) }));
      await safe(setDoc(col, id, data)); await reload();
    },
    async delDoc(col: string, id: string) {
      patch((d) => { const c = { ...(d.rows[col] || {}) }; delete c[id]; return { ...d, rows: { ...d.rows, [col]: c }, ...(col === "sales" ? { sales: d.sales.filter((s) => s.id !== id) } : {}) }; });
      await safe(delDoc(col, id)); await reload();
    },
    /** entries/<id>: расход или приход Кассы */
    async putEntry(id: string, e: Omit<Entry, "id">) {
      const x: Record<string, unknown> = { ...e }; delete x.id; Object.keys(x).forEach((k) => x[k] === undefined && delete x[k]);
      patch((d) => ({ ...d, entries: upsert(d.entries, { ...(x as Omit<Entry, "id">), id } as Entry) }));
      await safe(setDoc("entries", id, x));
    },
    async delEntry(id: string) { patch((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })); await safe(delDoc("entries", id)); },
    async putTemplate(id: string, t: Omit<Template, "id">) { patch((d) => ({ ...d, templates: upsert(d.templates, { ...t, id }) })); await safe(setDoc("templates", id, t)); },
    async delTemplate(id: string) { patch((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) })); await safe(delDoc("templates", id)); },
    /** пересчёт кассы: cash/current + запись в журнал пересчётов cashlog (как на рабочем сайте) */
    async saveCash(amount: number, expected: number, month: string, logId: string) {
      const now = Date.now(), cash = { amount, updatedAt: now, month }, log = { amount, expected, at: now, month };
      patch((d) => ({ ...d, cash, cashlog: [...d.cashlog, log] }));
      await safe(setDoc("cash", "current", cash)); try { await setDoc("cashlog", logId, log); } catch { /* журнал не критичен, как и раньше */ }
    },
    async putItem(id: string, it: Omit<PayItem, "id">) {
      const x: Omit<PayItem, "id"> & { id?: string } = { ...it, updatedAt: Date.now() - 1000 }; delete x.id;
      patch((d) => ({ ...d, items: { ...d.items, [id]: { ...(x as PayItem), id } } }));
      await safe(setDoc("payments", id, x));
    },
    async delItem(id: string) {
      patch((d) => { const items = { ...d.items }; delete items[id]; return { ...d, items }; });
      await safe(delDoc("payments", id));
    },
    /** paymarks/<id>_<месяц>: amount — оплачено вручную, plan — своя сумма; null убирает поле */
    async putMark(id: string, M: string, p: Partial<Record<keyof PayMark, number | string | null>>) {
      const k = id + "_" + M, cur = qc.getQueryData<Data>(KEY)?.marks[k] || {};
      const next: Record<string, unknown> = { ...cur, ...p };
      Object.keys(next).forEach((x) => next[x] == null && delete next[x]);
      if (next.amount == null && next.plan == null) {
        patch((d) => { const marks = { ...d.marks }; delete marks[k]; return { ...d, marks }; });
        await safe(delDoc("paymarks", k)); return;
      }
      next.at = Date.now() - 1000;
      patch((d) => ({ ...d, marks: { ...d.marks, [k]: next as PayMark } }));
      await safe(setDoc("paymarks", k, next));
    },
  };
}
