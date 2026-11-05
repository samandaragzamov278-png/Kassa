# Касса Оптики — новая версия (React)

Новая версия сайта собирается здесь по разделам. Рабочий сайт (`index.html` в корне, исходники в `dev/`) не меняется, пока раздел не перенесён и не сверен.

- Стек: React + Vite + TypeScript, Tailwind CSS + shadcn/ui, Motion, Lucide, TanStack Query/Table, React Hook Form + Zod, Recharts, SheetJS, Supabase.
- Данные — та же база и тот же формат `docs`, что у рабочего сайта: обе версии видят одни платежи.
- Готово: «Платежи» (`src/features/pay`, расчёты из `dev/pay/pay.js`) и «Касса» (`src/features/kassa`, расчёты из скрипта Кассы в `dev/base.html`). Раздел выбирается адресом: `#kassa`, `#pay`.

## Команды
Node 24 на этом компьютере лежит в `C:\Users\user\.local\node` (в PATH не добавлен).

```
npm install
npm run dev            # http://localhost:5173 — настоящая база (нужен вход); с ?demo — тестовые данные
npm run build          # сборка в dist/
npx tsx scripts/parity.ts   # сверка «Платежей» со старым разделом: «совпало N из N»
npx tsx scripts/kassa-parity.ts rows; python scripts/kassa_old.py; npx tsx scripts/kassa-parity.ts cmp   # сверка Кассы (старая — собранный index.html в браузере)
```
