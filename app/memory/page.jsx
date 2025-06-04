// app/memory/page.jsx
"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

export default function MemoryPage() {
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    const fetchMemoryHistory = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("🔐 No logged-in user", authError);
        return;
      }

      const { data, error } = await supabase
        .from("memory_summaries")
        .select("summary, tags, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Failed to fetch memory summaries:", error.message);
      } else {
        setSummaries(data);
      }
    };

    fetchMemoryHistory();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">🧠 Memory History</h1>
      <ul className="space-y-4">
        {summaries.map((item, i) => (
          <li
            key={i}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700"
          >
            <div className="text-sm text-gray-400 mb-2">
              {new Date(item.created_at).toLocaleString()}
            </div>
            <p className="mb-2">{item.summary}</p>
            <div className="text-xs text-blue-400">
            {Array.isArray(item.tags) ? item.tags.join(", ") : "No tags"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}