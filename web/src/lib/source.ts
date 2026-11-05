// Источник данных: настоящая база Supabase или демо в памяти (адрес с ?demo).
// Пишем в те же документы docs, что и рабочий сайт, — обе версии видят одни данные.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { BankDay, BcDoc, CashRec, Data, Entry, PayItem, PayMark, Sale, Template } from "./types";
import { demoRows } from "./demo";

const URL = "https://qvblxhyftwivkzxucfak.supabase.co";
const KEY = "sb_publishable_-ceoJkpmAZ7Y8osbPHaOlg_3nqUsdB7"; // публичный ключ, доступ даёт только вход

export type Row = { col: string; id: string; data: Record<string, unknown> };
export const isDemo = typeof location !== "undefined" && new URLSearchParams(location.search).has("demo");

let sb: SupabaseClient | null = null;
export const client = () => (sb ??= createClient(URL, KEY, { auth: { persistSession: true, storageKey: "kassa-web-auth" } }));

// всё, что нужно Платежам и Кассе (продажи — целиком: Касса считает Б/Ч всех месяцев)
const COLS = ["payments", "paymarks", "report", "entries", "settings", "sales", "cash", "cashlog", "templates", "bc"];

async function loadRows(): Promise<Row[]> {
  if (isDemo) return demoRows();
  const c = client(), out: Row[] = [], N = 1000;
  for (let from = 0; ; from += N) {
    const { data, error } = await c.from("docs").select("col,id,data").in("col", COLS).order("col").order("id").range(from, from + N - 1);
    if (error) throw error; out.push(...(data as Row[])); if (data.length < N) break;
  }
  return out;
}

export function toData(rows: Row[]): Data {
  const d: Data = { cash: null, cashlog: [], templates: [], bc: [], items: {}, marks: {}, sales: [], entries: [], report: {}, points: ["Премиум", "Яшнабад", "Сергели", "C1"] };
  // одна запись на col+id (последняя побеждает) — как в базе и на рабочем сайте
  const uniq = new Map<string, Row>(); rows.forEach((r) => uniq.set(r.col + "/" + r.id, r));
  for (const r of uniq.values()) {
    const x = r.data as never;
    if (r.col === "payments") d.items[r.id] = { ...(x as PayItem), id: r.id };
    else if (r.col === "paymarks") d.marks[r.id] = x as PayMark;
    else if (r.col === "sales") d.sales.push({ ...(x as Sale), id: r.id });
    else if (r.col === "entries") d.entries.push({ ...(x as Entry), id: r.id });
    else if (r.col === "report" && /^\d{4}-\d\d-\d\d$/.test(r.id)) d.report[r.id] = { ...(x as BankDay), id: r.id };
    else if (r.col === "cash" && r.id === "current") d.cash = x as Data["cash"];
    else if (r.col === "cashlog") d.cashlog.push(x as CashRec);
    else if (r.col === "templates") d.templates.push({ ...(x as Template), id: r.id });
    else if (r.col === "bc") d.bc.push({ ...(x as BcDoc), id: r.id });
    else if (r.col === "settings" && r.id === "sales") { const p = (x as { points?: string[] }).points; if (Array.isArray(p) && p.length) d.points = p; }
  }
  return d;
}

// демо: таблица в памяти
let mem: Row[] | null = null;
const listeners = new Set<() => void>();
const memRows = async () => (mem ??= await loadRows());

export async function loadData(): Promise<Data> { return toData(isDemo ? await memRows() : await loadRows()); }

export async function setDoc(col: string, id: string, data: object) {
  const clean = JSON.parse(JSON.stringify(data));
  if (isDemo) { const m = await memRows(); const i = m.findIndex((r) => r.col === col && r.id === id); const row = { col, id, data: clean }; if (i >= 0) m[i] = row; else m.push(row); listeners.forEach((f) => f()); return; }
  const { error } = await client().from("docs").upsert({ col, id, data: clean }); if (error) throw error;
}
export async function delDoc(col: string, id: string) {
  if (isDemo) { const m = await memRows(); const i = m.findIndex((r) => r.col === col && r.id === id); if (i >= 0) m.splice(i, 1); listeners.forEach((f) => f()); return; }
  const { error } = await client().from("docs").delete().eq("col", col).eq("id", id); if (error) throw error;
}

/** живые обновления: изменения с рабочего сайта и других устройств */
export function subscribe(onChange: () => void): () => void {
  if (isDemo) { listeners.add(onChange); return () => listeners.delete(onChange); }
  const c = client();
  const ch = c.channel("kassa-web-live").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
    const col = ((p.new as Row)?.col || (p.old as Row)?.col) as string | undefined;
    if (!col || COLS.includes(col)) onChange();
  }).subscribe();
  return () => { c.removeChannel(ch); };
}

// вход
export async function getSession(): Promise<Session | null> { if (isDemo) return { user: { email: "demo@saif-optics" } } as unknown as Session; return (await client().auth.getSession()).data.session; }
export async function signIn(email: string, password: string) { const { error } = await client().auth.signInWithPassword({ email, password }); if (error) throw error; }
export async function signOut() { if (!isDemo) await client().auth.signOut(); }
export function onAuth(cb: (s: Session | null) => void) { if (isDemo) return () => {}; const { data } = client().auth.onAuthStateChange((_e, s) => cb(s)); return () => data.subscription.unsubscribe(); }
