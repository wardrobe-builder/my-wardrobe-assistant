"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ReminderPage() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const fetchReminders = async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("status", "active")
        .gt("remind_at", now)
        .order("remind_at", { ascending: true });

      if (error) {
        console.error("❌ Failed to load reminders:", error.message);
      } else {
        setReminders(data);
      }
    };

    fetchReminders();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchReminders, 10000);
    return () => clearInterval(interval);
  }, []);

  const markDone = async (id) => {
    const { error } = await supabase
      .from("messages")
      .update({ status: "done" })
      .eq("id", id);

    if (!error) {
      setReminders((prev) => prev.filter((msg) => msg.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-semibold mb-4">📅 Upcoming Reminders</h1>

      {reminders.length === 0 ? (
        <p className="text-gray-400">No reminders scheduled. You’re free! 🌈</p>
      ) : (
        <div className="space-y-4">
          {reminders.map((msg) => {
            const readableTime = new Date(msg.remind_at).toLocaleString();
            const today = new Date().toDateString();
            const isToday =
              new Date(msg.remind_at).toDateString() === today;

            return (
              <div
                key={msg.id}
                className="bg-gray-800 p-4 rounded-xl flex justify-between items-center"
              >
                <div>
                  <p>{msg.reminder_text || msg.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ⏰ {readableTime}
                    {isToday ? " (Today)" : ""}
                  </p>
                </div>
                <button
                  onClick={() => markDone(msg.id)}
                  className="text-sm text-blue-400 hover:text-blue-200"
                >
                  Done
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}