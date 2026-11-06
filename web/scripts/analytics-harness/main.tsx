import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useData } from "@/lib/useData";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { LensPage } from "@/features/lens/LensPage";
import { MarginView } from "@/features/stock-margin/MarginView";
import "@/index.css";

const qs = new URLSearchParams(location.search), dark = qs.has("dark");
document.documentElement.classList.toggle("dark", dark);
const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 0 } } });
function Page() {
  const q = useData();
  if (!q.data) return <p className="p-6">Загрузка…</p>;
  const p = qs.get("p");
  return p === "lens" ? <LensPage d={q.data} /> : p === "stock" ? <MarginView d={q.data} /> : <AnalyticsPage d={q.data} />;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={qc}><TooltipProvider><div className="mx-auto max-w-[1360px] px-4 pt-5 pb-28 lg:pr-8 lg:pl-28"><Page /></div><Toaster theme={dark ? "dark" : "light"} richColors /></TooltipProvider></QueryClientProvider>,
);
