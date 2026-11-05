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
}

export interface Entry {
  id: string;
  date: string;
  name: string;
  type: "exp" | "inc";
  kind?: string;
  fund?: string;
  amount?: number;
  fact?: number;
  branch?: string;
}

export interface BankDay {
  id: string;
  bank?: { a: number; n: string }[];
}

export interface Data {
  items: Record<string, PayItem>;
  marks: Record<string, PayMark>;
  sales: Sale[];
  entries: Entry[];
  report: Record<string, BankDay>;
  points: string[];
}
