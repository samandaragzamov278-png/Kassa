// «Склад»: остатки Billz и перемещения (stock-billz) + маржа, склад из файла, новая партия (stock-margin).
import type { Data } from "@/lib/types";
import { BzStockView } from "../stock-billz/BzStockView";
import { MarginView } from "../stock-margin/MarginView";

export function StockPage({ d }: { d: Data }) {
  return <div className="flex flex-col gap-5"><BzStockView d={d} /><MarginView d={d} /></div>;
}
