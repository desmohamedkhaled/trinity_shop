"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const supabase = browserSupabase();

    if (!supabase) {
      setError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the project environment."
      );
      setLoading(false);
      return;
    }

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Confirm that Supabase has an authenticated user
    // before navigating to the protected admin area.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !data.session) {
      setError(
        "Login succeeded, but the authentication session was not ready. Please try again."
      );
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen pattern-bg grid place-items-center p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[32px] border border-black/10 bg-white/90 p-8 shadow-2xl backdrop-blur"
      >
        <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">
          Trinity Admin
        </p>

        <h1 className="display-font mt-2 text-5xl">
          Welcome back.
        </h1>

        <p className="mt-3 text-sm text-black/55">
          Sign in to manage the store.
        </p>

        <div className="mt-7 grid gap-4">
          <label className="text-sm font-bold">
            Email

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>

          <label className="text-sm font-bold">
            Password

            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}