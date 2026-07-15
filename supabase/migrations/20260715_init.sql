-- ====================================================================
-- PRICKLE (Only for Puchki and Puchu) - Supabase Database Schema
-- ====================================================================

-- 1. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender TEXT NOT NULL CHECK (sender IN ('puchki', 'puchu')),
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'file', 'voice', NULL)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at TIMESTAMPTZ,
    deleted BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ
);

-- 2. Create push_subscriptions table for background notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identity TEXT NOT NULL CHECK (user_identity IN ('puchki', 'puchu')),
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_subscription UNIQUE(user_identity, subscription)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for `messages`
-- Since application access is gated at the Next.js middleware & server level via shared PIN + httpOnly cookie,
-- we allow `anon` role (used by browser Supabase client for Realtime & queries) full read/insert/update access.
CREATE POLICY "Allow public read for realtime messages" 
ON public.messages FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert for messages" 
ON public.messages FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update for messages (edit, delete, read receipts)" 
ON public.messages FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete for messages" 
ON public.messages FOR DELETE 
USING (true);

-- 5. RLS Policies for `push_subscriptions`
CREATE POLICY "Allow all operations on push_subscriptions" 
ON public.push_subscriptions FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Enable Realtime on `messages` table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 7. Initialize Storage Bucket `media` for images, files, and voice notes (.webm)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

-- 8. Storage RLS Policies for `media` bucket
CREATE POLICY "Allow public read access to media bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Allow public uploads to media bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Allow public updates/deletes in media bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media');

CREATE POLICY "Allow public delete in media bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');

-- ====================================================================
-- 9. HIGH-PERFORMANCE INDEXES (Ensures lifetime lag-free queries)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_unread ON public.messages (sender, read_at) WHERE read_at IS NULL AND deleted = false;
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_identity);

