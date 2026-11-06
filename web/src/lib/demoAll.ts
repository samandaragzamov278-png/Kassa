// Тестовые данные всех разделов: общие (demo.ts) + свои у каждого раздела (features/<раздел>/demo.ts → demoExtra()).
import type { Row } from "./source";
import { demoRows } from "./demo";

const extras = import.meta.glob<{ demoExtra?: () => Row[] }>("../features/*/demo.ts", { eager: true });

export function demoAll(): Row[] {
  const out = demoRows();
  for (const m of Object.values(extras)) if (m.demoExtra) out.push(...m.demoExtra());
  return out;
}
