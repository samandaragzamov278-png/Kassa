// Формат данных тот же, что у рабочего сайта: таблица public.docs (col, id, data jsonb).

export type PayKind = "fixed" | "plan" | "debt";
export type PaySrc = "bank" | "cash" | "founder";
export type PayCat = "credit" | "rent" | "tax" | "salary" | "service" | "utility" | "debt" | "other";

/** payments/<id> — постоянный, разовый платёж или долг */
export interface PayItem {
  id: string;
  name: string;
  kind: PayKind;
  cat: PayCat;
  amount?: number;
  usd?: number;
  rate?: number;
  auto?: "tax";
  pct?: number;
  day?: number;
  freq?: "month" | "year";
  mon?: number;
  date?: string;
  from?: string;
  to?: string;
  src: PaySrc;
  point?: string;
  match?: string;
  total?: number;
  totalUsd?: number;
  paid0?: number;
  pays?: { date: string; amount: number; note?: string }[];
  note?: string;
  on?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/** paymarks/<id>_<YYYY-MM> — оплачено вручную (amount) и своя сумма на месяц (plan) */
export interface PayMark {
  amount?: number;
  plan?: number;
  date?: string;
  at?: number;
}

export interface Sale {
  id: string;
  date: string;
  point: string;
  sum: number;
  pay: string;
  pays?: Record<string, number> | null;
  createdAt?: number;
}

/** entries/<id> — расход или приход Кассы */
export interface Entry {
  id: string;
  date: string;
  name: string;
  type: "exp" | "inc";
  cat?: string;        // op — операционный, oth — прочий
  kind?: string;       // bc — остаток Б/Ч дня, rsv — пополнение резерва
  from?: string;       // для rsv: kassa — из кассы, out — со стороны
  fund?: string;       // reserve — оплачено из резерва
  tag?: string;
  amount?: number;
  fact?: number;
  branch?: string;
  source?: string;
  createdAt?: number;
}
export interface Template { id: string; type?: "exp" | "inc"; name: string; amount?: number; cat?: string; branch?: string; fund?: string; tag?: string; order?: number }
export interface CashRec { amount: number; at: number; month?: string; expected?: number }
export interface BcDoc { id: string; date: string; p?: number; y?: number }

export interface BankDay {
  id: string;
  bank?: { a: number; n: string }[];
}

export interface Data {
  cash: { amount: number; updatedAt: number; month?: string } | null;
  cashlog: CashRec[];
  templates: Template[];
  bc: BcDoc[];
  items: Record<string, PayItem>;
  marks: Record<string, PayMark>;
  sales: Sale[];
  entries: Entry[];
  report: Record<string, BankDay>;
  points: string[];
}
