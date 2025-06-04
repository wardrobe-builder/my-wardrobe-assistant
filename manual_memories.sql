-- SQL to create manual_memories table
-- Run this in your Supabase SQL Editor

create table if not exists manual_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  content text not null,
  tags text[] default '{}',
  created_at timestamp with time zone default now()
);
