"use client";

import { useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { generateMemorySummary } from "@/lib/generateMemorySummary";

const getRandomMemoryMessage = () => {
  const memoryMessages = [
    "🧠 I’ve just updated your memory.",
    "Got it! I’ll remember that.",
    "Noted — I’ve saved this for next time.",
    "You mentioned this before — I remember it now.",
    "Thanks! That’s added to your memory."
  ];
  return memoryMessages[Math.floor(Math.random() * memoryMessages.length)];
};

const getGoalReply = (goal, type) => {
  const goalReplies = [
    `🎯 Cool goal: ‘${goal}’. Logged.`,
    `📝 Got it — ‘${goal}’ added to your goals.`,
    `Nice. ‘${goal}’ is on your list now.`,
    `Okay! I saved ‘${goal}’ as something to aim for.`,
    `🎯 ‘${goal}’ is in. Want me to check in about it later?`
  ];
  const habitReplies = [
    `🌀 Got it — I’ll keep track of ‘${goal}’.`,
    `🧠 Habit saved: ‘${goal}’.`,
    `Added to your habits: ‘${goal}’.`,
    `Cool — I’ll help you track ‘${goal}’ from now.`,
    `🌀 Noted. ‘${goal}’ is something I’ll nudge you about.`
  ];
  const replies = type === "habit" ? habitReplies : goalReplies;
  return replies[Math.floor(Math.random() * replies.length)];
};

const getReminderSetReply = (content, time) => {
  const replies = [
    `🔔 Got it — I’ll remind you to ‘${content}’ at ${time}.`,
    `Okay! Reminder for ‘${content}’ set for ${time}.`,
    `Done — ‘${content}’ is locked in. I’ll nudge you at ${time}.`,
    `🗓 Noted. I’ll ping you about ‘${content}’ at ${time}.`,
    `All set — you’ll get a nudge about ‘${content}’ on time.`
  ];
  return replies[Math.floor(Math.random() * replies.length)];
};

const getReminderFiredReply = (content) => {
  const replies = [
    `🔔 Just a nudge: ‘${content}’. Want to do it now or snooze?`,
    `⏰ It’s time for: ‘${content}’. Shall we do it?`,
    `Reminder time — ‘${content}’. You in?`,
    `👋 Hey! Remember ‘${content}’? Want to act on it or reschedule?`,
    `Time for ‘${content}’. Ready or need more time?`
  ];
  return replies[Math.floor(Math.random() * replies.length)];
};



export default function ChatPage() {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState(null);
  const [memorySummary, setMemorySummary] = useState(null);
  const [manualMemories, setManualMemories] = useState([]);
  const bottomRef = useRef(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: true });

      setMessages(msgs || []);

      const result = await generateMemorySummary(user.id);
      if (result?.summary) setMemorySummary(result.summary);

      const { data: manual } = await supabase
        .from("manual_memories")
        .select("content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setManualMemories(manual?.map((m) => m.content) || []);
    };

    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectGoalOrHabit = async (text) => {
    if (!userId) return null;

    const prompt = `
  You are a helpful assistant detecting goals or habits in messages.
  
  If the message expresses a habit or goal the user wants to track (e.g. "Remind me to exercise" or "My goal is to sleep more"), return a JSON object like:
  { "type": "goal", "content": "sleep more" }
  
  If the message is about a repeated behavior (e.g. "drink more water", "study every day"), use type "habit".
  
  If it's not a goal or habit, return: { "type": null, "content": "" }
  
  Message: "${text}"
  `;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content?.trim();

      const parsed = JSON.parse(raw);
      if (parsed?.type && parsed?.content) {
        await supabase.from("goals").insert([
          {
            user_id: userId,
            type: parsed.type,
            content: parsed.content,
          },
        ]);
        return parsed;
      }
    } catch (err) {
      console.error("Goal detection failed:", err);
    }

    return null;
  };

  const handleSaveEdit = async (idx) => {
    const updatedMessages = [...messages];
    const msg = updatedMessages[idx];
    const newText = editValue.trim();

    if (!newText || !msg || msg.sender !== "assistant") {
      setEditingIndex(null);
      return;
    }

    updatedMessages[idx].text = newText;
    setMessages(updatedMessages);
    setEditingIndex(null);

    await supabase
      .from("messages")
      .update({ text: newText })
      .eq("id", msg.id);

    const result = await generateMemorySummary(userId);
    if (result?.summary) setMemorySummary(result.summary);
  };
  const detectReminder = async (text) => {
    const prompt = `
  You are a helper that extracts reminder instructions from user messages.
  If the user asks for a reminder, return a JSON object like:
  { "remind_at": "2025-05-24T08:00:00Z", "content": "submit the form" }
  
  If no reminder is found, return:
  { "remind_at": null, "content": "" }
  
  User message: "${text}"
  `;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");

      if (parsed?.remind_at && parsed?.content) {
        await supabase.from("reminders").insert([
          {
            user_id: userId,
            content: parsed.content,
            remind_at: parsed.remind_at,
          },
        ]);
        return parsed;
      }
    } catch (err) {
      console.error("Reminder parsing failed:", err);
    }

    return null;
  };
  const classifyIntent = async (text) => {
    const prompt = `
  Classify the user's message as one of the following:
  - "conversation"
  - "goal"
  - "habit"
  - "reminder"
  - "recall"
  
  Respond with just the type (one word only).
  Message: "${text}"
  `;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 10,
        }),
      });

      const data = await res.json();
      const type = data?.choices?.[0]?.message?.content?.trim().toLowerCase();
      return type || "conversation";
    } catch (err) {
      console.error("Intent classification failed:", err);
      return "conversation";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;

    const userMsg = {
      sender: "user",
      text: input,
      timestamp: new Date().toISOString(),
      user_id: userId,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    await supabase.from("messages").insert([userMsg]);

    const intent = await classifyIntent(input);
    let newGoal = null;
    let newReminder = null;

    // 📌 RECALL INTENT — fetch and display saved memories
    if (intent === "recall") {
      let memorySummaryText = "🧠 Here's what I remember:";

      const { data: goalsData } = await supabase
        .from("goals")
        .select("type, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const { data: remindersData } = await supabase
        .from("reminders")
        .select("content, remind_at")
        .eq("user_id", userId)
        .order("remind_at", { ascending: true });

      const { data: manualMemoryData } = await supabase
        .from("manual_memories")
        .select("content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!goalsData?.length && !remindersData?.length && !manualMemoryData?.length && !memorySummary) {
        memorySummaryText = "I don’t have anything saved yet.";
      } else {
        if (goalsData?.length) {
          memorySummaryText += "\n\n🎯 Your Goals & Habits:";
          for (const goal of goalsData) {
            const label = goal.type === "habit" ? "🌀 Habit" : "📝 Goal";
            memorySummaryText += `\n${label}: ${goal.content}`;
          }
        }

        if (remindersData?.length) {
          memorySummaryText += "\n\n🔔 Upcoming Reminders:";
          for (const reminder of remindersData) {
            const time = new Date(reminder.remind_at).toLocaleString();
            memorySummaryText += `\n- ${reminder.content} at ${time}`;
          }
        }

        if (manualMemoryData?.length || memorySummary) {
          memorySummaryText += "\n\n📚 Other things you’ve shared:";
          if (memorySummary) {
            memorySummaryText += `\n🧠 Summary: ${memorySummary}`;
          }
          for (const item of manualMemoryData) {
            memorySummaryText += `\n- ${item.content}`;
          }
        }
      }

      const reply = {
        sender: "assistant",
        text: memorySummaryText,
        timestamp: new Date().toISOString(),
        user_id: userId,
      };

      setMessages((prev) => [...prev, reply]);
      await supabase.from("messages").insert([reply]);
      return;
    }

    // 🧠 DETECT GOAL / REMINDER
    if (intent === "goal" || intent === "habit") {
      newGoal = await detectGoalOrHabit(input);
    }
    if (intent === "reminder") {
      newReminder = await detectReminder(input);
    }

    // ✂️ GPT Reply (skip if only reminder and no goal)
    let assistantReply = "";
    if (!(newReminder && !newGoal)) {
      const prompt = `
  You are a casual, kind assistant. Reply in 1–2 short sentences.
  Avoid being poetic or overly verbose.
  User says: "${input}"
  Your reply:`;

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 80,
          }),
        });
        const data = await res.json();
        assistantReply = data?.choices?.[0]?.message?.content?.trim() || "";
      } catch (err) {
        console.error("GPT error:", err);
      }
    }

    // 🔄 Memory check
    let memoryChanged = false;
    let newSummary = memorySummary;

    try {
      if (userId) {
        const result = await generateMemorySummary(userId);
        if (result?.summary && result.summary !== memorySummary && result.summary.length > memorySummary?.length) {
          memoryChanged = Math.random() < 0.5;
          newSummary = result.summary;
        }
      }
    } catch (err) {
      console.error("Memory summary update failed:", err);
    }

    setMemorySummary(newSummary);

    // 🎯 Combine memory/goal/reminder confirmations
    let followUpText = "";

    if (memoryChanged) {
      followUpText += getRandomMemoryMessage();
    }
    if (newGoal) {
      if (followUpText) followUpText += " ";
      followUpText += getGoalReply(newGoal.content, newGoal.type);
    }
    if (newReminder) {
      if (followUpText) followUpText += " ";
      followUpText += getReminderSetReply(
        newReminder.content,
        new Date(newReminder.remind_at).toLocaleString()
      );
    }
    
    const finalReply = {
      sender: "assistant",
      text: followUpText ? `${assistantReply}\n\n${followUpText}`.trim() : assistantReply,
      timestamp: new Date().toISOString(),
      user_id: userId,
    };

    setMessages((prev) => [...prev, finalReply]);
    await supabase.from("messages").insert([finalReply]);
  };



  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`w-fit max-w-[75%] px-4 py-2 rounded-2xl break-words whitespace-pre-wrap relative group ${msg.sender === "user"
              ? "bg-blue-500 text-white self-end ml-auto"
              : "bg-gray-700 text-white self-start mr-auto"
              }`}
          >
            {editingIndex === idx ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-black p-2 rounded"
                />
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded"
                    onClick={() => handleSaveEdit(idx)}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-500 text-white px-3 py-1 rounded"
                    onClick={() => setEditingIndex(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {msg.text}
                {msg.sender === "assistant" && (
                  <button
                    className="text-sm text-gray-300 ml-2 underline hover:text-white mt-2 block"
                    onClick={() => {
                      setEditingIndex(idx);
                      setEditValue(msg.text);
                    }}
                  >
                    ✏️ Edit this
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black p-4 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-gray-800 text-white p-3 rounded-xl outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type something..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 px-4 rounded-xl text-white font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}