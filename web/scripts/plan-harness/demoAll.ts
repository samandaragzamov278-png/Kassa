import type { Row } from "@/lib/source";
import { demoRows } from "@/lib/demo";
import { demoExtra as home } from "@/features/home/demo";
import { demoExtra as plan } from "@/features/plan/demo";
export const demoAll = (): Row[] => [...demoRows(), ...home(), ...plan()];
