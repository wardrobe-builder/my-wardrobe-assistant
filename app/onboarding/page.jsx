"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

export default function OnboardingPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const onboardingSteps = [
    {
      assistant:
        "Hi, I’m your assistant. But I’m not finished yet… You’re the one who’ll teach me what matters to you. 🌱",
      user: "Let’s begin",
    },
    {
      assistant:
        "Everything you tell me — thoughts, plans, emotions — I remember them for you.\nYou can tell me:\n→ What happened today\n→ What to do next\n→ How you feel",
      user: "Got it!",
    },
    {
      assistant:
        "You can teach me as we go.\nSay things like:\n→ “This is a task”\n→ “Remind me later”\n→ “That’s not quite right…”\nI’ll listen. I’ll adjust.",
      user: "I’ll try",
    },
    {
      assistant:
        "Now say anything.\nJust one thought, feeling, or thing to remember.\nI’ll save it.",
      user: "I want to call Mom tomorrow 💛",
      isInput: true,
    },
    {
      assistant:
        "You’ve planted your first seed 🌱\nJust be yourself — and I’ll grow with every message.",
      user: "Start Chatting",
    },
  ];

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!session) return;
    if (index < onboardingSteps.length) {
      const step = onboardingSteps[index];
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: step.assistant,
        },
      ]);
    }
  }, [index, session]);

  const handleNext = async () => {
    const step = onboardingSteps[index];
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: step.user,
      },
    ]);

    if (step.isInput) {
      setInput(step.user);
      setIndex((prev) => prev + 1);
      return;
    }

    if (index === onboardingSteps.length - 1) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: session.user.id, onboarding_done: true });

      router.push("/chat");
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="space-y-3 pb-28">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`w-fit max-w-[75%] px-4 py-2 rounded-2xl ${
              msg.sender === "assistant"
                ? "bg-gray-700 text-white"
                : "bg-blue-500 text-white self-end ml-auto"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black p-4">
        <button
          onClick={handleNext}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium"
        >
          {onboardingSteps[index]?.user || "Continue"}
        </button>
      </div>
    </div>
  );
}