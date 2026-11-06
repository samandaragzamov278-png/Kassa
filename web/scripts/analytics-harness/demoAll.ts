import type { Row } from "@/lib/source";
import { demoRows } from "@/lib/demo";
import { demoExtra } from "@/features/analytics/demo";
export const demoAll = (): Row[] => [...demoRows(), ...demoExtra()];
