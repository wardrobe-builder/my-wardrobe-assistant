"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat"); // 👈 Redirects to your assistant page
  }, [router]);

  return null;
}