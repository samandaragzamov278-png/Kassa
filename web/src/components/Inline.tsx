// Поля, которые правятся прямо на месте: выглядят как текст, по нажатию — поле ввода.
// Сохраняют по Enter или когда поле теряет фокус; Esc — отменить.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmt, num } from "@/features/pay/logic";

type NumProps = { value: number | null | undefined; onSave: (v: number | null) => void | Promise<void>; label: string; placeholder?: string; raw?: boolean; className?: string };

export function InlineNumber({ value, onSave, label, placeholder = "0", raw, className }: NumProps) {
  const show = value == null || (value === 0 && placeholder !== "0") ? "" : raw ? String(value) : fmt(value);
  const [txt, setTxt] = useState(show), [edit, setEdit] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!edit) setTxt(show); }, [show, edit]);
  const commit = async () => {
    setEdit(false); const v = num(txt);
    if (v === (value ?? null) || (v == null && show === "")) { setTxt(show); return; }
    await onSave(v);
  };
  return (
    <input ref={ref} aria-label={label} title="Нажмите, чтобы изменить" inputMode="decimal" autoComplete="off" placeholder={placeholder} value={txt}
      onFocus={() => { setEdit(true); setTxt(show.replace(/\s/g, "")); requestAnimationFrame(() => ref.current?.select()); }}
      onChange={(e) => setTxt(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") ref.current?.blur(); if (e.key === "Escape") { setTxt(show); setEdit(false); requestAnimationFrame(() => ref.current?.blur()); } }}
      className={cn("num w-full max-w-36 rounded-lg border border-transparent bg-transparent px-2 py-1 text-right text-[15px] font-semibold outline-none transition",
        "hover:border-border hover:bg-muted focus:border-primary focus:bg-popover focus:ring-3 focus:ring-primary/20 placeholder:font-normal placeholder:text-muted-foreground", className)} />
  );
}

export function InlineText({ value, onSave, label, className }: { value: string; onSave: (v: string) => void | Promise<void>; label: string; className?: string }) {
  const [txt, setTxt] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setTxt(value), [value]);
  const commit = async () => { const v = txt.trim(); if (!v || v === value) { setTxt(value); return; } await onSave(v); };
  return (
    <input ref={ref} aria-label={label} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") ref.current?.blur(); if (e.key === "Escape") { setTxt(value); requestAnimationFrame(() => ref.current?.blur()); } }}
      className={cn("w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold outline-none transition hover:border-border hover:bg-muted focus:border-primary focus:bg-popover focus:ring-3 focus:ring-primary/20", className)} />
  );
}
