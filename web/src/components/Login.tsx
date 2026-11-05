// Вход: та же почта и пароль, что на рабочем сайте Кассы.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/source";

const schema = z.object({ email: z.string().email("Проверьте почту"), password: z.string().min(1, "Введите пароль") });

export function Login() {
  const [err, setErr] = useState("");
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const submit = f.handleSubmit(async (v) => { setErr(""); try { await signIn(v.email, v.password); } catch (e) { setErr(/invalid/i.test(String(e)) ? "Неверная почта или пароль" : "Не удалось войти: " + String(e)); } });
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 14, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} className="glass flex w-full max-w-sm flex-col gap-4 rounded-[28px] p-7">
        <div><h1 className="text-2xl font-bold tracking-tight">Касса Оптики</h1><p className="text-sm text-muted-foreground">Войдите, чтобы открыть кассу</p></div>
        <div className="grid gap-1.5"><Label htmlFor="em">Почта</Label><Input id="em" type="email" autoComplete="username" {...f.register("email")} /><small className="text-xs text-minus">{f.formState.errors.email?.message}</small></div>
        <div className="grid gap-1.5"><Label htmlFor="pw">Пароль</Label><Input id="pw" type="password" autoComplete="current-password" {...f.register("password")} /><small className="text-xs text-minus">{f.formState.errors.password?.message}</small></div>
        {err && <p className="rounded-xl bg-minus-soft px-3 py-2 text-sm text-minus">{err}</p>}
        <Button type="submit" size="lg" disabled={f.formState.isSubmitting}>Войти</Button>
      </motion.form>
    </div>
  );
}
