// lib/generateMemorySummary.js
'use client';

import supabase from './supabaseClient';

export async function generateMemorySummary(userId) {
  try {
    if (!userId) {
      console.error("🛑 No user ID provided to generateMemorySummary");
      return null;
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("text, timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error || !messages || messages.length === 0) {
      console.error("🛑 No messages found:", error?.message);
      return null;
    }

    const flattened = messages.map((m) => m.text).join("\n");

    const gptPrompt = `
The user shared these thoughts and logs. Create a short memory summary (1-2 sentences) and 3–5 lowercase tags that describe recurring themes or concerns.

Messages:
${flattened}

Return ONLY valid JSON like this (no commentary or markdown):
{
  "summary": "You’ve been feeling drained but hopeful about upcoming changes.",
  "tags": ["stress", "planning", "hope"]
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: gptPrompt }],
        temperature: 0.5,
      }),
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";

    const parsed = JSON.parse(content);
    const { summary, tags } = parsed;

    // ✅ INSERT instead of UPSERT for snapshot
    const { error: insertError } = await supabase.from("memory_summaries").insert({
      user_id: userId,
      summary,
      tags,
    });

    if (insertError) {
      console.error("❌ Failed to save memory summary:", insertError.message);
    } else {
      console.log("✅ Memory snapshot saved.");
    }

    return { summary, tags };
  } catch (err) {
    console.error("❌ Error generating summary:", err);
    return null;
  }
}