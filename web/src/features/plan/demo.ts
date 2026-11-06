// Тестовые данные раздела «План» (выдуманные): планы двух месяцев и продавцы. Подхватываются сами в режиме ?demo.
import type { Row } from "@/lib/source";

export function demoExtra(): Row[] {
  const t = new Date(Date.now() + 5 * 3600e3), y = t.getUTCFullYear(), mo = t.getUTCMonth();
  const key = (k: number) => { const x = new Date(Date.UTC(y, mo + k, 1)); return x.toISOString().slice(0, 7); };
  return [{
    col: "settings", id: "plan",
    data: {
      months: {
        [key(-1)]: { total: 240000000, shares: { "Премиум": 40, "Яшнабад": 33, "Сергели": 27, "C1": 0 } },
        [key(0)]: { total: 260000000, shares: { "Премиум": 38, "Яшнабад": 34, "Сергели": 28, "C1": 0 } },
      },
      sellers: { "Премиум": "Нодира", "Яшнабад": "Севара", "Сергели": "Зарнигор", "C1": "Дилноза" },
      off: [0],
    },
  }];
}
