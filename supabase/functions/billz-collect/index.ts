// Ежедневная выгрузка из Billz по всем точкам: чеки (с товарами), остатки, перемещения.
// Только чтение из Billz; пишет в таблицы bz_check / bz_stock / bz_product / bz_transfer.
import { createClient } from "jsr:@supabase/supabase-js@2";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const HOST = "https://api-admin.billz.ai";
const SHOPS: Record<string, string> = {
  "4799bd94-20eb-4cc3-b415-b5b0da7e7f5d": "Премиум",
  "acbde9d9-1c60-4886-8131-95e678a39136": "Яшнабад",
  "06471084-7836-4a54-be9a-d0789f79a474": "Сергели",
  "41a96b8a-6049-4f9d-916e-4e61d4297534": "C1",
  "765e02ad-5047-4a13-a4b8-46d29639c3db": "Склад",
};
const SHOP_IDS = Object.keys(SHOPS).join(",");
const BUDGET_MS = 115000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tash = () => new Date(Date.now() + 5 * 3600e3);
const isoD = (d: Date) => d.toISOString().slice(0, 10);
const addD = (s: string, n: number) => isoD(new Date(Date.parse(s + "T00:00:00Z") + n * 864e5));
const tz = (s: string) => (s && !s.startsWith("0001") ? new Date(String(s).replace(" ", "T") + (/[zZ+]/.test(String(s).slice(10)) ? "" : "+05:00")).toISOString() : null);

let TOKEN = "";
async function login() {
  const r = await fetch(HOST + "/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret_token: Deno.env.get("BILLZ_SECRET_TOKEN") }) });
  if (!r.ok) throw new Error("Billz не принял ключ (" + r.status + ")");
  const j = await r.json();
  TOKEN = (j.data && j.data.access_token) || j.access_token;
}
async function bz(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  for (let a = 0; a < 6; a++) {
    const r = await fetch(HOST + path + (qs ? "?" + qs : ""), { headers: { Authorization: "Bearer " + TOKEN, Accept: "application/json" } });
    if (r.status === 401 && a === 0) { await login(); continue; }
    if (r.status === 429 || r.status >= 500) { await sleep(1200 * 2 ** a); continue; }
    const t = await r.text();
    if (!r.ok) throw new Error(`Billz ${path} ответил ${r.status}: ${t.slice(0, 160)}`);
    return JSON.parse(t);
  }
  throw new Error(`Billz ${path} не отвечает`);
}
async function upsert(table: string, rows: any[], conflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict: conflict });
    if (error) throw new Error(table + ": " + error.message);
  }
}
const catOf = (p: any) => (p && p.categories && p.categories[0] && p.categories[0].name) || "";

// ---------- чеки ----------
async function collectChecks(from: string, to: string, t0: number) {
  let day = from, fetched = 0, rowsN = 0;
  while (day <= to) {
    if (Date.now() - t0 > BUDGET_MS) return { done: false, next: day, fetched, rows: rowsN };
    const rows: any[] = [];
    for (let page = 1; page < 40; page++) {
      const j = await bz("/v1/transaction-report-table", { start_date: day, end_date: day, shop_ids: SHOP_IDS, currency: "UZS", limit: "100", page: String(page) });
      rows.push(...(j.rows || []).filter((r: any) => SHOPS[r.shop_id]));
      if ((j.rows || []).length < 100) break;
    }
    const { data: have } = await sb.from("bz_check").select("order_id,modified,items").eq("d", day);
    const haveMap = new Map((have || []).map((h: any) => [h.order_id, h]));
    const out: any[] = [];
    for (const r of rows) {
      if (Date.now() - t0 > BUDGET_MS) return { done: false, next: day, fetched, rows: rowsN };
      const h: any = haveMap.get(r.order_id);
      let items = h && h.items;
      if (!h || !items || (r.is_modified && !h.modified)) {
        const od = await bz("/v2/order/" + r.order_id);
        fetched++;
        items = ((od.order_detail && od.order_detail.order_items) || []).map((i: any) => {
          const p = i.product || {};
          const q = +i.measurement_value || 0, rq = +i.returned_measurement_value || 0;
          return { n: p.name || i.name || "", sku: p.sku || i.sku || "", c: catOf(p), q, rq, price: +i.sale_price || +i.price || 0,
            sum: +i.total_price || 0, disc: +i.discount_amount || 0, ret: !!i.is_returned };
        });
      }
      const pays = (r.payments || []).map((p: any) => ({ n: p.payment_type_name, s: +p.sum || 0 }));
      const paid = pays.reduce((a: number, p: any) => a + p.s, 0);
      const total = +r.total_price || +r.gross_sales || 0;
      out.push({
        order_id: r.order_id, point: SHOPS[r.shop_id], d: day, t: tz(r.date), num: String(r.external_id || ""), type: r.order_type,
        total, paid, debt: /продаж/i.test(r.order_type) && Math.abs(paid) < Math.abs(total) - 1 ? total - paid : 0,
        pays, items, seller: (r.seller_names || []).join(", ") || r.cashier_name || "", modified: !!r.is_modified, updated_at: new Date().toISOString(),
      });
    }
    await upsert("bz_check", out, "order_id");
    // удалённые в Billz чеки этого дня
    const ids = new Set(out.map((o) => o.order_id));
    const gone = (have || []).map((h: any) => h.order_id).filter((id: string) => !ids.has(id));
    if (gone.length) await sb.from("bz_check").delete().in("order_id", gone);
    rowsN += out.length;
    day = addD(day, 1);
  }
  return { done: true, next: null, fetched, rows: rowsN };
}

// ---------- остатки ----------
async function collectStock() {
  const prods: any[] = [];
  for (let page = 1; page < 40; page++) {
    const j = await bz("/v2/products", { limit: "500", page: String(page) });
    prods.push(...(j.products || []));
    if (!j.products || j.products.length < 500 || prods.length >= (+j.count || 0)) break;
  }
  const today = isoD(tash()), now = new Date().toISOString();
  const stock: any[] = [], cat: any[] = [];
  for (const p of prods) {
    const sku = String(p.sku || p.id);
    const prices: Record<string, number> = {};
    (p.shop_prices || []).forEach((x: any) => { if (SHOPS[x.shop_id]) prices[SHOPS[x.shop_id]] = +x.retail_price || 0; });
    cat.push({ sku, pid: p.id, name: p.name, cat: catOf(p), prices, cp: +p.supply_price || null, updated_at: now });
    (p.shop_measurement_values || []).forEach((v: any) => {
      const pt = SHOPS[v.shop_id], q = +v.active_measurement_value || 0;
      if (pt && q) stock.push({ d: today, point: pt, sku, q, at: now });
    });
  }
  // дубли артикула в Billz — складываем
  const m = new Map<string, any>();
  stock.forEach((s) => { const k = s.point + "|" + s.sku; const o = m.get(k); if (o) o.q += s.q; else m.set(k, { ...s }); });
  const cm = new Map<string, any>(); cat.forEach((c) => { if (!cm.has(c.sku)) cm.set(c.sku, c); });
  // себестоимость не затираем нулём (ключ её не видит; берём из перемещений)
  const { data: oldCp } = await sb.from("bz_product").select("sku,cp");
  const cpMap = new Map((oldCp || []).map((r: any) => [r.sku, r.cp]));
  const catRows = [...cm.values()].map((c) => ({ ...c, cp: c.cp || cpMap.get(c.sku) || null }));
  await upsert("bz_product", catRows, "sku");
  await sb.from("bz_stock").delete().eq("d", today);
  await upsert("bz_stock", [...m.values()], "d,point,sku");
  const byPt: Record<string, number> = {};
  m.forEach((s) => { byPt[s.point] = (byPt[s.point] || 0) + s.q; });
  return { d: today, rows: m.size, byPt };
}

// ---------- перемещения ----------
async function collectTransfers(t0: number) {
  const list: any[] = [];
  for (let page = 1; page < 40; page++) {
    const j = await bz("/v2/transfer", { limit: "100", page: String(page) });
    list.push(...(j.transfer || j.transfers || []));
    if ((j.transfer || j.transfers || []).length < 100) break;
  }
  const { data: have } = await sb.from("bz_transfer").select("id,status,arrived,items");
  const hm = new Map((have || []).map((h: any) => [h.id, h]));
  const cps: any[] = [];
  let fetched = 0;
  const rows: any[] = [];
  for (const t of list) {
    if (Date.now() - t0 > BUDGET_MS + 20000) break;
    const acc = t.accepted_at && !String(t.accepted_at).startsWith("0001") ? t.accepted_at : "";
    const status = acc ? "принят" : (+t.total_loaded_measurement_value > 0 ? "в пути" : "черновик");
    const h: any = hm.get(t.id);
    let items = h && h.items;
    if (!h || !items || h.status !== status || +h.arrived !== +t.total_arrived_measurement_value) {
      items = [];
      for (let page = 1; page < 20; page++) {
        const j = await bz("/v2/transfer-items/" + t.id, { limit: "100", page: String(page) });
        fetched++;
        (j.items || []).forEach((i: any) => {
          const p = i.product || i.product_info || {};
          const cp = +p.departure_shop_supply_price || 0;
          items.push({ n: p.name || "", sku: p.sku || "", sent: +i.transfer_measurement_value || 0, arr: +i.arrived_measurement_value || 0, price: +p.departure_shop_retail_price || 0, cp });
          if (cp && p.sku) cps.push({ sku: p.sku, cp });
        });
        if ((j.items || []).length < 100) break;
      }
    }
    rows.push({
      id: t.id, num: String(t.external_id || ""), name: t.name, created: tz(t.created_at), accepted: acc ? tz(acc) : null,
      d: String(acc || t.created_at).slice(0, 10), from_point: SHOPS[t.departure_shop_id] || (t.departure_shop && t.departure_shop.name) || "",
      to_point: SHOPS[t.arrival_shop_id] || (t.arrival_shop && t.arrival_shop.name) || "", status,
      sent: +t.total_loaded_measurement_value || 0, arrived: +t.total_arrived_measurement_value || 0, retail: +t.total_retail_price || 0,
      items, by_name: (t.created_by && t.created_by.name || "").replace(/\s+/g, " "), updated_at: new Date().toISOString(),
    });
  }
  await upsert("bz_transfer", rows, "id");
  // себестоимость из перемещений → в каталог
  for (const c of cps) await sb.from("bz_product").update({ cp: c.cp }).eq("sku", c.sku);
  return { count: rows.length, fetched };
}

async function allowed(req: Request) {
  const key = req.headers.get("x-kassa-key") || "";
  if (key) {
    const { data } = await sb.from("app_config").select("value").eq("key", "probe_key").maybeSingle();
    return data && data.value === key ? "расписание" : null;
  }
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: u } = await sb.auth.getUser(jwt);
  const email = u && u.user && u.user.email;
  if (!email) return null;
  const { data: m } = await sb.from("members").select("email").ilike("email", email).maybeSingle();
  return m ? "вручную: " + email : null;
}
async function putDoc(id: string, data: unknown) {
  await sb.from("docs").upsert({ col: "sync", id, data, updated_at: new Date().toISOString() }, { onConflict: "col,id" });
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kassa-key", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const who = await allowed(req);
  if (!who) return new Response("forbidden", { status: 403, headers: CORS });
  const body = await req.json().catch(() => ({}));
  const t0 = Date.now();
  const today = isoD(tash());
  const from = body.from || addD(today, -3), to = body.to || today;
  const parts = body.parts || ["checks", "stock", "transfers"];
  try {
    await login();
    const res: any = { ok: true, at: t0, trigger: who, from, to };
    if (parts.includes("stock")) res.stock = await collectStock();
    if (parts.includes("transfers")) res.transfers = await collectTransfers(t0);
    if (parts.includes("checks")) res.checks = await collectChecks(from, to, t0);
    res.ms = Date.now() - t0;
    if (!body.from) await putDoc("billz-collect", res);
    await sb.from("billz_log").insert({ kind: "collect", status: 200, params: body, payload: res });
    return Response.json(res, { headers: CORS });
  } catch (e) {
    const err = { ok: false, at: t0, trigger: who, error: String((e as Error).message || e) };
    if (!body.from) {
      const { data } = await sb.from("docs").select("data").eq("col", "sync").eq("id", "billz-collect").maybeSingle();
      await putDoc("billz-collect", { ...((data && data.data && (data.data.ok ? { lastOk: data.data } : data.data)) || {}), ...err });
    }
    await sb.from("billz_log").insert({ kind: "collect error", status: 0, params: body, payload: err });
    return Response.json(err, { status: 500, headers: CORS });
  }
});
