// ✅ FILE 1: /app/components/ChatBox.jsx

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChatBox({ onSend, messages }) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (onSend) onSend(text);
    setInput("");
  };

  const setReminder = async (messageId) => {
    const remindAt = new Date();
    remindAt.setSeconds(remindAt.getSeconds() + 10); // show up in reminder in 10s

    const { error } = await supabase
      .from("messages")
      .update({ remind_at: remindAt.toISOString(), status: "active" })
      .eq("id", messageId);

    if (error) {
      console.error("❌ Failed to set reminder:", error.message);
    } else {
      console.log("✅ Reminder set for message:", messageId);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black p-4 z-50 border-t border-gray-800">
      <div className="max-h-80 overflow-y-auto space-y-2 pb-2">
        {messages?.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col max-w-[75%] px-4 py-2 rounded-2xl break-words ${
              msg.sender === "user"
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-700 text-white self-start mr-auto"
            }`}
          >
            <span>{msg.text}</span>

            {msg.sender === "user" &&
              Array.isArray(msg.tags) &&
              msg.tags.some((tag) => ["task", "reminder"].includes(tag)) && (
                <button
                  onClick={() => setReminder(msg.id)}
                  className="text-xs text-blue-300 mt-1 underline"
                >
                  Remind me
                </button>
              )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          className="flex-1 bg-gray-800 text-white p-3 rounded-xl outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type something..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 px-4 rounded-xl text-white font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}