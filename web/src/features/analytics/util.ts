// Мелкие помощники для Аналитики, Линз и Склада: даты, числа, подписи. Один в один с рабочим сайтом (dev/base.html).
// Даты — строки «ГГГГ-ММ-ДД»; календарь считаем в UTC, чтобы не зависеть от часового пояса компьютера.

export const fmt = (n: number) => (n < 0 ? "−" : "") + Math.round(Math.abs(n || 0)).toLocaleString("ru-RU").replace(/[\s  ,]/g, " ");
export const fmtM = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " млн";
  if (a >= 1e3) return Math.round(n / 1e3) + " тыс";
  return String(Math.round(n));
};
export const pctF = (x: number | null | undefined) => (x == null || !isFinite(x) ? "—" : Math.round(x * 100) + "%");
export const pl = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
  return c;
};
export const parseAmt = (s: unknown) => { const v = String(s ?? "").replace(/[^\d]/g, ""); return v ? parseInt(v, 10) : NaN; };
export const normS = (s: unknown) => String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const T0 = (s: string) => Date.parse(s + "T00:00:00Z");
export const addD = (s: string, n: number) => new Date(T0(s) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((T0(b) - T0(a)) / 864e5) + 1;
export const weekStart = (s: string) => addD(s, -wdIdx(s));
/** день недели: 0 — понедельник … 6 — воскресенье */
export const wdIdx = (s: string) => (new Date(T0(s)).getUTCDay() + 6) % 7;
/** день недели «как в JS»: 0 — воскресенье */
export const dow = (s: string) => new Date(T0(s)).getUTCDay();
export const monthEnd = (m: string) => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)); return m + "-" + String(d.getUTCDate()).padStart(2, "0"); };
export const dShort = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—");
export const dLong = (s?: string) => (s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "");
export const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const MONTHS_FULL = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const niceStep = (x: number) => { if (x <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))); const n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
export const sum = <T,>(l: T[], f: (x: T) => number) => l.reduce((a, x) => a + f(x), 0);
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
