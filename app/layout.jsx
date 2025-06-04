"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { usePathname, useRouter } from "next/navigation";

export default function RootLayout({ children }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <html lang="en">
      <body className="bg-black text-white">
        <SessionContextProvider supabaseClient={supabase}>
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}