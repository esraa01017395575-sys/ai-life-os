import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const { t } = usePrefs();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    // Already signed in
    nav({ to: "/dashboard" });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setLoading(false);
    if (r.error) {
      toast.error(r.error);
    } else {
      if (mode === "signup") toast.success("Welcome! Check your email if confirmation is required.");
      nav({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center accent-glow-strong">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">AI Life OS</h1>
            <p className="text-sm text-app-muted">Your conversational productivity OS</p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display text-xl mb-1">{mode === "signin" ? t("welcomeBack") : t("createAccount")}</h2>
          <p className="text-sm text-app-muted mb-6">{mode === "signin" ? "Sign in to continue your plan." : "Start chatting your way to a better day."}</p>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-app-muted">{t("name")}</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-lg bg-app-secondary border border-app text-app focus:outline-none focus:border-accent"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-app-muted">{t("email")}</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-app-secondary border border-app text-app focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-app-muted">{t("password")}</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-app-secondary border border-app text-app focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full h-10 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? t("signIn") : t("signUp")}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-app-muted">
            {mode === "signin" ? t("noAccount") : t("alreadyHaveAccount")}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-accent hover:underline">
              {mode === "signin" ? t("signUp") : t("signIn")}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-app-faint mt-6">
          <Link to="/" className="hover:text-app-muted">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
