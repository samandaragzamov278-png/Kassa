// Новая версия Кассы: вход, оболочка (панель разделов, верхняя строка, тема) и раздел «Платежи».
// Остальные разделы пока открываются на рабочем сайте — переносим по одному.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, CalendarCheck, FileText, Glasses, Home, LogOut, Moon, Package, Scale, ShoppingBag, Sun, Target, Wallet, type LucideIcon } from "lucide-react";
import { Toaster } from "sonner";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getSession, isDemo, onAuth, signOut } from "@/lib/source";
import { useData } from "@/lib/useData";
import { Login } from "@/components/Login";
import { PayPage } from "@/features/pay/PayPage";

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });
const OLD = "https://samandaragzamov278-png.github.io/Kassa/";
const NAV: { id: string; label: string; icon: LucideIcon; ready?: boolean }[] = [
  { id: "home", label: "Главная", icon: Home }, { id: "kassa", label: "Касса", icon: Wallet }, { id: "report", label: "Отчёт р/с", icon: FileText },
  { id: "pay", label: "Платежи", icon: CalendarCheck, ready: true }, { id: "sales", label: "Продажи", icon: ShoppingBag }, { id: "recon", label: "Сверка", icon: Scale },
  { id: "analytics", label: "Аналитика", icon: BarChart3 }, { id: "plan", label: "План", icon: Target }, { id: "lens", label: "Линзы", icon: Glasses }, { id: "batch", label: "Склад", icon: Package },
];

function useTheme() {
  const sys = () => matchMedia("(prefers-color-scheme: dark)").matches;
  const [dark, setDark] = useState(() => { try { const v = localStorage.getItem("kassa-web.theme"); return v ? v === "dark" : sys(); } catch { return sys(); } });
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return { dark, toggle: () => setDark((x) => { try { localStorage.setItem("kassa-web.theme", !x ? "dark" : "light"); } catch { /* нет хранилища */ } return !x; }) };
}
function Clock() {
  const [n, setN] = useState(Date.now()); useEffect(() => { const id = setInterval(() => setN(Date.now()), 15000); return () => clearInterval(id); }, []);
  const d = new Date(n + 5 * 3600e3), W = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"], M = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return <span className="glass hidden flex-col justify-center rounded-full px-4 py-1 leading-tight md:flex"><b className="num text-[13px]">{String(d.getUTCHours()).padStart(2, "0")}:{String(d.getUTCMinutes()).padStart(2, "0")}</b><small className="text-[10.5px] text-muted-foreground">{W[d.getUTCDay()]}, {d.getUTCDate()} {M[d.getUTCMonth()]}</small></span>;
}

function Shell({ email }: { email: string }) {
  const { dark, toggle } = useTheme();
  const q = useData();
  return (
    <div className="min-h-dvh">
      {/* панель разделов: на телефоне — снизу */}
      <nav aria-label="Разделы" className="glass fixed z-30 flex gap-1 rounded-[30px] p-2 max-lg:inset-x-3 max-lg:bottom-3 max-lg:justify-around max-lg:overflow-x-auto lg:top-1/2 lg:left-4 lg:-translate-y-1/2 lg:flex-col">
        <div className="mb-1.5 hidden size-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-primary text-[11px] font-black text-white shadow-lg lg:grid">SO</div>
        {NAV.map((n) => {
          const on = n.id === "pay";
          const inner = <span className={cn("grid size-11 shrink-0 place-items-center rounded-full transition", on ? "bg-popover text-primary shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><n.icon className="size-5" strokeWidth={1.8} /></span>;
          return (
            <Tooltip key={n.id}><TooltipTrigger asChild>{on ? <button type="button" aria-current="page" aria-label={n.label}>{inner}</button> : <a href={OLD + "#" + n.id} aria-label={n.label + " — на рабочем сайте"}>{inner}</a>}</TooltipTrigger>
              <TooltipContent side="right">{n.label}{!n.ready && " · пока на рабочем сайте"}</TooltipContent></Tooltip>
          );
        })}
      </nav>
      <div className="mx-auto max-w-[1360px] px-4 pt-5 pb-28 lg:pr-8 lg:pl-28">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px]"><b>Saif-Optics</b><span className="text-muted-foreground">›</span><span className="text-muted-foreground">Платежи</span></span>
          <div className="ml-auto flex items-center gap-2">
            <Clock />
            <Button variant="secondary" size="icon-lg" className="glass rounded-full" onClick={toggle} aria-label="Сменить тему">{dark ? <Sun /> : <Moon />}</Button>
            <span className="glass hidden items-center gap-2 rounded-full py-1 pr-1 pl-4 text-[13px] sm:flex"><i className="size-2 rounded-full bg-plus" />{email}
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { signOut(); qc.clear(); }}><LogOut />Выйти</Button></span>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {q.isLoading ? (
            <motion.div key="load" exit={{ opacity: 0 }} className="grid gap-4"><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></motion.div>
          ) : q.error ? (
            <motion.p key="err" className="glass rounded-3xl p-6 text-minus">Не удалось загрузить данные: {String((q.error as Error).message || q.error)}</motion.p>
          ) : q.data ? (
            <motion.div key="pay" initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.4 }}><PayPage d={q.data} /></motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <Toaster theme={dark ? "dark" : "light"} position="bottom-right" richColors />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => { getSession().then(setSession); return onAuth(setSession); }, []);
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={150}>
        {session === undefined ? null : session ? <Shell email={isDemo ? "демо-данные" : session.user.email || ""} /> : <Login />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
