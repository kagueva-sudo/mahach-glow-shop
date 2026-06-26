import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Вход в админку — Nuri" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Добро пожаловать");
        await navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Аккаунт создан. Попросите назначить вам роль admin.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteShell>
      <section className="max-w-md mx-auto px-6 py-24">
        <Link to="/" className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary">
          ← На сайт
        </Link>
        <h1 className="font-serif text-4xl mb-2 mt-6">
          {mode === "signin" ? "Вход в админку" : "Регистрация"}
        </h1>
        <p className="text-muted-foreground text-sm mb-10">
          Доступ только для сотрудников мастерской.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
              Пароль
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 text-xs font-semibold uppercase tracking-[0.25em] hover:bg-foreground transition-colors disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Войти" : "Создать"}
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="text-xs text-muted-foreground hover:text-primary w-full text-center pt-2"
          >
            {mode === "signin" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
          </button>
        </form>
      </section>
    </SiteShell>
  );
}
