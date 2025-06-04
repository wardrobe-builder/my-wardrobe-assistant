"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Sign in to your Assistant
      </h1>
      <button
        onClick={handleLogin}
        className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-white font-medium text-lg transition"
      >
        Continue with Google
      </button>
    </div>
  );
}