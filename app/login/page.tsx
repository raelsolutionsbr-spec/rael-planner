"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Digite seu e-mail no campo acima antes de clicar em 'Esqueci minha senha'.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Enviamos um link de redefinição de senha para seu e-mail.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--azul-painel)] px-4">
      <form
        onSubmit={mode === "login" ? handleLogin : handleSignUp}
        className="w-full max-w-sm bg-[rgba(255,255,255,0.03)] border border-[rgba(0,200,255,0.15)] rounded-xl p-8"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--azul-neon)] to-[var(--laranja-vibrante)] bg-clip-text text-transparent mb-6 text-center">
          Rael Planner
        </h1>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}
        {message && (
          <p className="text-green-400 text-sm mb-4 text-center">{message}</p>
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
          className="w-full mb-2 p-2 rounded-lg bg-transparent border border-[rgba(0,200,255,0.2)] text-white outline-none focus:border-[var(--azul-neon)]"
        />

        {mode === "login" && (
          <button
            type="button"
            onClick={handleForgotPassword}
            className="block text-xs text-[var(--azul-neon)] hover:underline mb-4 text-right w-full"
          >
            Esqueci minha senha
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-[var(--azul-neon)] to-[var(--laranja-vibrante)] text-black font-semibold disabled:opacity-50 mt-2"
        >
          {loading
            ? "Aguarde..."
            : mode === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>

        <p className="text-center text-sm text-[var(--texto-secundario)] mt-4">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className="text-[var(--azul-neon)] hover:underline"
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
                className="text-[var(--azul-neon)] hover:underline"
              >
                Fazer login
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
