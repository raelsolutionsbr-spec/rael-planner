"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--azul-painel)] px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-[rgba(255,255,255,0.03)] border border-[rgba(0,200,255,0.15)] rounded-xl p-8"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--azul-neon)] to-[var(--laranja-vibrante)] bg-clip-text text-transparent mb-6 text-center">
          Rael Planner
        </h1>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <label className="block text-sm text-[var(--texto-secundario)] mb-1">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 p-2 rounded-lg bg-transparent border border-[rgba(0,200,255,0.2)] text-white outline-none focus:border-[var(--azul-neon)]"
        />

        <label className="block text-sm text-[var(--texto-secundario)] mb-1">
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 p-2 rounded-lg bg-transparent border border-[rgba(0,200,255,0.2)] text-white outline-none focus:border-[var(--azul-neon)]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-[var(--azul-neon)] to-[var(--laranja-vibrante)] text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
