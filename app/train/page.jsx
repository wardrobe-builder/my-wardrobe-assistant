"use client";

import { useEffect, useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import supabase from "@/lib/supabaseClient";

export default function TrainPage() {
  const session = useSession();
  const user = session?.user;

  const [memories, setMemories] = useState([]);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTags, setEditingTags] = useState("");

  useEffect(() => {
    fetchMemories();
  }, [user]);

  async function fetchMemories() {
    if (!user) return;
    const { data, error } = await supabase
      .from("manual_memories")
      .select("id, content, tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("\u274C Failed to fetch memories:", error.message);
    } else {
      setMemories(data);
    }
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    const tagArray = tags.split(",").map((t) => t.trim().toLowerCase());
    const { error } = await supabase.from("manual_memories").insert({
      user_id: user.id,
      content,
      tags: tagArray,
    });

    if (error) {
      console.error("\u274C Failed to save:", error.message);
    } else {
      setContent("");
      setTags("");
      fetchMemories();
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("manual_memories").delete().eq("id", id);
    if (error) {
      console.error("\u274C Delete error:", error.message);
    } else {
      fetchMemories();
    }
  }

  async function handleEditSave(id) {
    const tagArray = editingTags.split(",").map((t) => t.trim().toLowerCase());
    const { error } = await supabase
      .from("manual_memories")
      .update({ content: editingContent, tags: tagArray })
      .eq("id", id);

    if (error) {
      console.error("\u274C Edit save failed:", error.message);
    } else {
      setEditingId(null);
      setEditingContent("");
      setEditingTags("");
      fetchMemories();
    }
  }

  const filtered = filterTag
    ? memories.filter((m) => m.tags?.includes(filterTag.toLowerCase()))
    : memories;

  return (
    <div className="p-6 text-white max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Train Your Assistant 🧠</h1>

      <div className="space-y-2 mb-6">
        <textarea
          placeholder="What do you want your assistant to remember?"
          className="w-full p-3 rounded-xl bg-gray-800"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          placeholder="Tags (comma separated)"
          className="w-full p-3 rounded-xl bg-gray-800"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <button
          className="bg-blue-500 px-4 py-2 rounded-xl"
          onClick={handleSubmit}
        >
          Save
        </button>
      </div>

      <input
        className="mb-4 w-full p-2 rounded bg-gray-700"
        placeholder="Filter by tag (e.g. family, work...)"
        value={filterTag}
        onChange={(e) => setFilterTag(e.target.value)}
      />

      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-gray-900 p-4 rounded-xl space-y-2 border border-gray-700"
          >
            {editingId === item.id ? (
              <>
                <textarea
                  className="w-full bg-gray-800 p-2 rounded"
                  value={editingContent || ""}
                  onChange={(e) => setEditingContent(e.target.value)}
                />
                <input
                  className="w-full bg-gray-800 p-2 rounded"
                  value={editingTags || ""}
                  onChange={(e) => setEditingTags(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="bg-green-500 px-3 py-1 rounded"
                    onClick={() => handleEditSave(item.id)}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-600 px-3 py-1 rounded"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{item.content}</p>
                <p className="text-sm text-gray-400">
                  Tags: {item.tags?.join(", ")}
                </p>
                <div className="flex gap-2">
                  <button
                    className="bg-yellow-500 px-3 py-1 rounded"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingContent(item.content);
                      setEditingTags(item.tags?.join(", "));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 px-3 py-1 rounded"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}