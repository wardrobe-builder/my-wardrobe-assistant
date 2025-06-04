"use client";

import { useState } from "react";
import ChatBox from "./ChatBox";
import { supabase } from "@/lib/supabaseClient";

export default function GlobalChatBox() {
  const [messages, setMessages] = useState([]);

  const handleGlobalMessage = async (text) => {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 🔹 Step 1: Get tags
    let tags = [];
    try {
      const tagPrompt = `
You are a helpful assistant that classifies the user's message into 3–5 lowercase tags.

User said: "${text}"

Return a JSON array like: ["task", "feeling", "family"]
`;

      const tagRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: tagPrompt }],
          temperature: 0.2,
        }),
      });

      const tagData = await tagRes.json();
      tags = JSON.parse(tagData?.choices?.[0]?.message?.content || "[]");
    } catch (e) {
      console.error("Tag parse failed:", e);
    }

    const userMessage = {
      id,
      sender: "user",
      text,
      timestamp,
      tags,
    };

    setMessages((prev) => [...prev, userMessage]);

    await supabase.from("messages").insert([userMessage]);

    // 🔹 Step 2: Generate assistant reply
    let assistantText = "";
    try {
      const replyPrompt = `
You are a warm, thoughtful assistant. The user sends short thoughts, emotions, tasks, or memories. Always reply with one kind sentence — never robotic.

Your style is calm, gentle, and emotionally aware. You can include one soft emoji.

User: "${text}"
Tags: ${JSON.stringify(tags)}

Reply in one warm, human sentence.
`;

      const replyRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: replyPrompt }],
          temperature: 0.6,
        }),
      });

      const replyData = await replyRes.json();
      assistantText = replyData?.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
      console.error("Assistant reply failed:", e);
    }

    if (assistantText) {
      const assistantMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: assistantText,
        timestamp: new Date().toISOString(),
        tags: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await supabase.from("messages").insert([assistantMessage]);
    }
  };

  return <ChatBox onSend={handleGlobalMessage} messages={messages} />;
}