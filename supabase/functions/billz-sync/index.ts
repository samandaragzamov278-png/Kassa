// Ежедневная загрузка Сергели из Billz в Кассу: продажи (чеки) + склад + сверка.
// Запуск: pg_cron (заголовок x-kassa-key) или кнопка в Кассе (токен участника).
import { createClient } from "jsr:@supabase/supabase-js@2";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const HOST = "https://api-admin.billz.ai";
const SHOP = "06471084-7836-4a54-be9a-d0789f79a474";
const POINT = "Сергели";
const OWN_PART = "pbz-sergeli";
const LOOKBACK = 7;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tashNow = () => new Date(Date.now() + 5 * 3600e3); // UTC+5, без перехода на летнее время
const isoD = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
const clean = (s: string) => String(s || "").replace(/[.\s]+$/g, "").replace(/\s+/g, " ").trim();

let TOKEN = "";
async function login() {
  const tok = Deno.env.get("BILLZ_SECRET_TOKEN");
  if (!tok) throw new Error("нет секрета BILLZ_SECRET_TOKEN");
  const r = await fetch(HOST + "/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret_token: tok }) });
  const t = await r.text();
  if (!r.ok) throw new Error("Billz не принял ключ (" + r.status + ")");
  const j = JSON.parse(t);
  TOKEN = (j.data && j.data.access_token) || j.access_token;
}
async function bz(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  for (let a = 0; a < 5; a++) {
    const r = await fetch(HOST + path + (qs ? "?" + qs : ""), { headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json" } });
    if (r.status === 401 && a === 0) { await login(); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(1500 * 2 ** a); continue; }
    const t = await r.text();
    if (!r.ok) throw new Error(`Billz ${path} ответил ${r.status}: ${t.slice(0, 200)}`);
    return JSON.parse(t);
  }
  throw new Error(`Billz ${path} не отвечает`);
}

function payKind(name: string): { pay: string; note?: string } {
  const n = String(name || "").toLowerCase();
  if (n.includes("налич")) return { pay: "Наличные" };
  if (n.includes("humo")) return { pay: "Терминал", note: "Оплата Humo" };
  if (/qr|payme|click|paynet|uzum|apelsin/.test(n)) return { pay: "QR/Payme" };
  if (/перечисл|банк|безнал|transfer/.test(n)) return { pay: "Перечисление" };
  if (/карт|uzcard|visa|master|terminal|терминал/.test(n)) return { pay: "Терминал" };
  return { pay: "Терминал", note: "Тип оплаты в Billz: " + name };
}
const STOCK_CAT: Record<string, string> = { "Оправы": "Оправы", "Детские оправы": "Детские оправы", "Очки С/З": "Солнцезащитные очки", "Аксессуары": "Аксессуары" };
function saleCat(bzCat: string, name: string, stockC?: string): string {
  if (stockC && STOCK_CAT[stockC]) return STOCK_CAT[stockC];
  const n = name.toLowerCase(), c = String(bzCat || "").toLowerCase();
  if (c.includes("линз") || n.startsWith("линз")) return "Очковые линзы";
  if (c.includes("футляр") || /futlyar|футляр|trenajor/.test(n)) return "Аксессуары";
  if (/s\/z|с\/з|солнц/.test(n)) return "Солнцезащитные очки";
  if (/detsk|kids|дет/.test(n)) return "Детские оправы";
  return "Оправы";
}
function saleName(cat: string, name: string): string {
  const c = clean(name);
  if (cat === "Очковые линзы") return "Линзы";
  if (/^(дет\.?\s*)?оправ[аы]?\.?$/i.test(c)) return cat === "Детские оправы" ? "Детская оправа" : "Оправа";
  if (/^(оправа|детская оправа|с\/з очки)\s/i.test(c)) return c;
  if (cat === "Оправы") return "Оправа " + c;
  if (cat === "Детские оправы") return "Детская оправа " + c;
  if (cat === "Солнцезащитные очки") return "С/з очки " + c;
  return c;
}
function stockCatFromSale(cat: string): string {
  return ({ "Солнцезащитные очки": "Очки С/З", "Очковые линзы": "Очковые линзы" } as Record<string, string>)[cat] || cat;
}

async function getAll(col: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("docs").select("id,data").eq("col", col).range(from, from + 999);
    if (error) throw new Error("База: " + error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function put(col: string, id: string, data: unknown) {
  const { error } = await sb.from("docs").upsert({ col, id, data, updated_at: new Date().toISOString() }, { onConflict: "col,id" });
  if (error) throw new Error("Запись " + col + "/" + id + ": " + error.message);
}

async function run(trigger: string) {
  const startedAt = Date.now();
  const now = tashNow(), today = isoD(now);
  const { data: cfgRows } = await sb.from("app_config").select("key,value");
  const cfg = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, r.value]));
  const from0 = cfg.billz_from || "2026-10-20";
  const fromD = new Date(now.getTime() - LOOKBACK * 864e5);
  const from = isoD(fromD) < from0 ? from0 : isoD(fromD);

  await login();

  // ---------- 1. Чеки ----------
  const rows: any[] = [];
  for (let page = 1; page < 50; page++) {
    const j = await bz("/v1/transaction-report-table", { start_date: from, end_date: today, shop_ids: SHOP, currency: "UZS", limit: "100", page: String(page) });
    const rs = (j.rows || []).filter((r: any) => r.shop_id === SHOP);
    rows.push(...rs);
    if ((j.rows || []).length < 100) break;
  }
  const sales = await getAll("sales");
  const have = new Set(sales.map((s: any) => s.data && s.data.billz).filter(Boolean));
  const stockDocs = await getAll("stock");
  const skuInfo = new Map<string, any>();
  stockDocs.forEach((d: any) => (d.data.items || []).forEach((i: any) => { if (i.s && !skuInfo.has(String(i.s))) skuInfo.set(String(i.s), i); }));

  const added: any[] = [], attention: string[] = [];
  for (const r of rows) {
    if (have.has(r.order_id)) continue;
    const type = String(r.order_type || "");
    const isReturn = /возврат|return/i.test(type);
    if (!isReturn && !/продаж|sale/i.test(type)) { attention.push(`${r.date.slice(0, 10)}: чек ${r.external_id} — тип «${type}», внесите вручную`); continue; }
    const od = await bz("/v2/order/" + r.order_id);
    const items = ((od.order_detail && od.order_detail.order_items) || []).filter((i: any) => isReturn ? true : !i.is_returned);
    if (!items.length) { attention.push(`${r.date.slice(0, 10)}: чек ${r.external_id} — нет товаров`); continue; }
    const sign = isReturn ? -1 : 1;
    const lineTot = items.map((i: any) => Math.abs(+i.total_price || (+i.sale_price || +i.price || 0) * (+i.measurement_value || +i.returned_measurement_value || 1)));
    const total = lineTot.reduce((a: number, b: number) => a + b, 0);
    const pays = (r.payments || []).map((p: any) => ({ ...payKind(p.payment_type_name), sum: Math.abs(+p.sum || 0) }));
    const paid = pays.reduce((a: number, p: any) => a + p.sum, 0);
    const debt = !isReturn && paid < total - 1 ? total - paid : 0;
    const k = total ? (debt ? paid / total : 1) : 1;
    const byPay: Record<string, number> = {};
    pays.forEach((p: any) => { byPay[p.pay] = (byPay[p.pay] || 0) + p.sum; });
    const payNames = Object.keys(byPay);
    const payNote = pays.map((p: any) => p.note).filter(Boolean);
    const date = String(r.date).slice(0, 10);
    const t = Date.parse(String(r.date).replace(" ", "T") + "+05:00") || Date.now();
    const chk = String(r.external_id || "").slice(-3);
    let rest = Math.round(paid || total), restPays: Record<string, number> = { ...byPay };
    items.forEach((it: any, idx: number) => {
      const p = it.product || {};
      const sku = String(p.sku || it.sku || "");
      const si = skuInfo.get(sku);
      const cat = saleCat(p.categories && p.categories[0] && p.categories[0].name, p.name || it.name || "", si && si.c);
      const lens = cat === "Очковые линзы";
      const qty = lens ? 1 : Math.abs(+it.measurement_value || +it.returned_measurement_value || 1);
      const last = idx === items.length - 1;
      const sum = last ? rest : Math.round(lineTot[idx] * k);
      rest -= sum;
      let linePays: Record<string, number> | null = null;
      if (payNames.length > 1) {
        linePays = {};
        const totPaid = paid || 1;
        payNames.forEach((pn, j) => {
          const v = last ? restPays[pn] : Math.round(sum * byPay[pn] / totPaid);
          linePays![pn] = sign * v; if (!last) restPays[pn] -= v;
        });
      }
      const notes = [`Из Billz, чек ${r.external_id}`];
      if (+it.discount_amount > 0) notes.push(`скидка ${fmt(+it.discount_amount)}`);
      if (debt && idx === 0) notes.push(`оплачено ${fmt(paid)} из ${fmt(total)} — долг ${fmt(debt)}`);
      if (isReturn) notes.push("возврат");
      notes.push(...payNote);
      const doc: any = {
        date, point: POINT, cat, product: saleName(cat, p.name || it.name || ""), qty: sign * qty,
        price: lens ? lineTot[idx] : (+it.sale_price || +it.price || 0), sum: sign * sum,
        pay: payNames.length > 1 ? "Смешанная" : (payNames[0] || "Наличные"), pays: linePays,
        check: chk, createdAt: t + idx, note: notes.join(" · "), billz: r.order_id, sku, src: "billz",
      };
      if (debt && idx === 0) doc.debt = debt;
      added.push({ id: `bz_${r.order_id.slice(0, 8)}_${idx}`, doc });
    });
  }
  for (const a of added) await put("sales", a.id, a.doc);

  // ---------- 2. Сверка выручки по дням (Billz ↔ Касса) ----------
  const rep = await bz("/v1/general-report-table", { start_date: from, end_date: today, shop_ids: SHOP, currency: "UZS", detalization: "day", limit: "100", page: "1" });
  const bzDay: Record<string, number> = {};
  (rep.shop_stats_by_date || []).filter((x: any) => x.shop_id === SHOP).forEach((x: any) => { bzDay[String(x.date).slice(0, 10)] = +x.net_gross_sales || 0; });
  const allSales = [...sales.map((s: any) => s.data), ...added.map((a) => a.doc)].filter((s: any) => s && s.point === POINT && s.date >= from && s.date <= today);
  const kDay: Record<string, number> = {};
  allSales.forEach((s: any) => { kDay[s.date] = (kDay[s.date] || 0) + (+s.sum || 0) + (+s.debt || 0); });
  const days = [...new Set([...Object.keys(bzDay), ...Object.keys(kDay)])].sort();
  const salesCheck = days.map((d) => ({ d, billz: bzDay[d] || 0, kassa: kDay[d] || 0 })).filter((x) => x.billz || x.kassa)
    .map((x) => ({ ...x, ok: Math.abs(x.billz - x.kassa) < 1 }));

  // ---------- 3. Склад ----------
  const prods: any[] = [];
  for (let page = 1; page < 30; page++) {
    const j = await bz("/v2/products", { limit: "500", page: String(page) });
    prods.push(...(j.products || []));
    if (!j.products || prods.length >= (+j.count || 0) || j.products.length < 500) break;
  }
  const newItems: any[] = [];
  prods.forEach((p: any) => {
    const mv = (p.shop_measurement_values || []).find((v: any) => v.shop_id === SHOP);
    const q = mv ? +mv.active_measurement_value || 0 : 0;
    if (!q) return;
    const sku = String(p.sku || "");
    const si = skuInfo.get(sku);
    const pr = (p.shop_prices || []).find((x: any) => x.shop_id === SHOP);
    const price = (pr && +pr.retail_price) || (si && +si.p) || 0;
    const cat = si ? si.c : stockCatFromSale(saleCat(p.categories && p.categories[0] && p.categories[0].name, p.name || ""));
    newItems.push({
      c: cat, g: (si && si.g) || (cat === "Очковые линзы" || cat === "Аксессуары" ? clean(p.name) : `${cat === "Детские оправы" ? "Детская оправа" : cat === "Очки С/З" ? "С/з очки" : "Оправа"} ${Math.round(price / 1000)}к`),
      m: p.name, s: sku, p: price > 1 ? price : 0, cp: (si && +si.cp) || +p.supply_price || 0, q, pt: POINT, bz: p.id,
    });
  });
  newItems.sort((a, b) => String(a.c).localeCompare(String(b.c)) || b.q - a.q);
  newItems.forEach((it, i) => { it.k = "bzs" + i; });

  const fileParts = stockDocs.filter((d: any) => d.id !== OWN_PART && d.id !== "postavki12" && typeof d.data.part === "number");
  const up = fileParts.length ? Math.max(...fileParts.map((d: any) => +d.data.uploadedAt || 0)) : Date.now();
  const group = fileParts.filter((d: any) => (+d.data.uploadedAt || 0) === up).sort((a: any, b: any) => a.data.part - b.data.part);
  const own = stockDocs.find((d: any) => d.id === OWN_PART);
  // сверка с прошлым снимком: было − продано по Кассе после снимка = должно быть; сравниваем с Billz сейчас
  const hasPrev = !!(own && own.data.uploadedAt === up && own.data.snapAt);
  const prevItems: any[] = hasPrev ? own.data.items || [] : [];
  const prevDate: string = hasPrev ? own.data.snapDate : "";
  const prevTs: number = hasPrev ? +own.data.snapAt : 0;
  const soldBySku: Record<string, number> = {};
  allSales.forEach((s: any) => {
    if (!s.sku || s.cat === "Очковые линзы" || (+s.createdAt || 0) <= prevTs) return;
    soldBySku[s.sku] = (soldBySku[s.sku] || 0) + (+s.qty || 0);
  });
  const prevBySku: Record<string, any> = {};
  prevItems.forEach((i: any) => { if (i.s) prevBySku[i.s] = i; });
  const nowBySku: Record<string, any> = {};
  newItems.forEach((i) => { if (i.s) nowBySku[i.s] = i; });
  const diffs: any[] = [];
  if (hasPrev) new Set([...Object.keys(prevBySku), ...Object.keys(nowBySku)]).forEach((sku) => {
    const pv = prevBySku[sku], nw = nowBySku[sku];
    if ((pv && pv.c === "Очковые линзы") || (nw && nw.c === "Очковые линзы")) return;
    const prev = pv ? +pv.q || 0 : 0, sold = soldBySku[sku] || 0, now2 = nw ? nw.q : 0;
    const exp = prev - sold, d = now2 - exp;
    if (d) diffs.push({ n: clean((nw || pv).m || (nw || pv).n || sku), s: sku, prev, sold, exp, now: now2, d });
  });
  diffs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

  // убрать строки Сергели из файловых частей (один раз) и записать нашу часть
  for (const d of group) {
    const items = d.data.items || [];
    const kept = items.filter((i: any) => i.pt !== POINT);
    const patch: any = { ...d.data };
    if (kept.length !== items.length) patch.items = kept;
    if (d.data.part === 0) {
      patch.src = { ...(d.data.src || {}), [POINT]: `Billz, ежедневно; последняя загрузка ${today.slice(8, 10)}.${today.slice(5, 7)} ${now.toISOString().slice(11, 16)}` };
      patch.soldFromPt = { ...(d.data.soldFromPt || {}), [POINT]: today };
      patch.soldFromTs = { ...(d.data.soldFromTs || {}), [POINT]: startedAt };
    }
    if (patch.items !== items || d.data.part === 0) await put("stock", d.id, patch);
  }
  await put("stock", OWN_PART, {
    part: 900, parts: group.length + 1, file: "Billz", date: today, uploadedAt: up, total: newItems.length,
    snapDate: today, snapAt: startedAt, items: newItems,
  });

  // ---------- 4. Итог ----------
  const qty = newItems.reduce((a, i) => a + i.q, 0);
  const summary = {
    ok: true, at: startedAt, trigger, from, to: today,
    sales: { checks: new Set(added.map((a) => a.doc.billz)).size, lines: added.length, sum: added.reduce((a, x) => a + x.doc.sum, 0), debts: added.filter((a) => a.doc.debt).map((a) => ({ d: a.doc.date, check: a.doc.check, debt: a.doc.debt })) },
    salesCheck, attention,
    stock: { items: newItems.length, qty, prevDate, baseline: !hasPrev, diffs: diffs.slice(0, 200), diffCount: diffs.length },
    ms: Date.now() - startedAt,
  };
  await put("sync", "billz-sergeli", summary);
  await put("sync", "billz-sergeli-" + today, summary);
  await sb.from("billz_log").insert({ kind: "sync", status: 200, params: { trigger, from, to: today }, payload: { ...summary, stock: { ...summary.stock, diffs: diffs.slice(0, 50) } } });
  return summary;
}

async function allowed(req: Request): Promise<string | null> {
  const key = req.headers.get("x-kassa-key") || "";
  if (key) {
    const { data } = await sb.from("app_config").select("value").eq("key", "probe_key").maybeSingle();
    return data && data.value === key ? "расписание" : null;
  }
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: u } = await sb.auth.getUser(jwt);
  const email = u && u.user && u.user.email;
  if (!email) return null;
  const { data: m } = await sb.from("members").select("email").ilike("email", email).maybeSingle();
  return m ? "вручную: " + email : null;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kassa-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const who = await allowed(req);
  if (!who) return new Response("forbidden", { status: 403, headers: CORS });
  const body = await req.json().catch(() => ({}));
  // повторный запуск по расписанию пропускается, если сегодня уже была удачная загрузка
  if (body.retry) {
    const { data } = await sb.from("docs").select("data").eq("col", "sync").eq("id", "billz-sergeli").maybeSingle();
    const last = data && data.data;
    if (last && last.ok && last.to === isoD(tashNow()) && +last.at >= Date.parse(isoD(tashNow()) + "T16:50:00+05:00")) return Response.json({ ok: true, skipped: true }, { headers: CORS });
  }
  try {
    const s = await run(who + (body.retry ? " (повтор)" : ""));
    return Response.json({ ok: true, sales: s.sales, stock: { items: s.stock.items, diffs: s.stock.diffCount } }, { headers: CORS });
  } catch (e) {
    const err = { ok: false, at: Date.now(), trigger: who, error: String((e as Error).message || e), to: isoD(tashNow()) };
    const { data } = await sb.from("docs").select("data").eq("col", "sync").eq("id", "billz-sergeli").maybeSingle();
    await put("sync", "billz-sergeli", { ...(data && data.data && data.data.ok ? { lastOk: data.data } : (data && data.data) || {}), ...err }).catch(() => {});
    await sb.from("billz_log").insert({ kind: "sync error", status: 0, params: { who }, payload: err });
    return Response.json(err, { status: 500, headers: CORS });
  }
});
