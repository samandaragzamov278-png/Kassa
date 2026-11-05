// Данные Кассы через TanStack Query: загрузка, живые обновления и запись с мгновенным откликом на экране.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { delDoc, loadData, setDoc, subscribe } from "./source";
import type { Data, PayItem, PayMark } from "./types";

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
  return {
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
