-- ============================================================
-- AIPSA Office Management System — Supabase Schema
-- Safe to run multiple times — drops everything first
-- ============================================================

-- ── 0. CLEAN SLATE ───────────────────────────────────────────

-- Drop tables in reverse dependency order (CASCADE removes policies + triggers automatically)
DROP TABLE IF EXISTS public.messages      CASCADE;
DROP TABLE IF EXISTS public.tasks         CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups        CASCADE;
DROP TABLE IF EXISTS public.invite_codes  CASCADE;
DROP TABLE IF EXISTS public.memberships   CASCADE;
DROP TABLE IF EXISTS public.schools       CASCADE;
DROP TABLE IF EXISTS public.profiles      CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop storage policies (safe if they don't exist)
DROP POLICY IF EXISTS "chat_images_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_delete" ON storage.objects;

-- ── 1. TABLES ────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.schools (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'Secondary',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.memberships (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  school_id  UUID REFERENCES public.schools(id)   ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('Owner','Manager','Teacher','Staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

CREATE TABLE public.invite_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id  UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  role_key   TEXT NOT NULL CHECK (role_key IN ('teacher','staff','manager')),
  code       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, role_key)
);

CREATE TABLE public.groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id  UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES public.groups(id)  ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.group_members (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id)   ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, group_id)
);

CREATE TABLE public.tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID REFERENCES public.groups(id)   ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date    DATE,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status      TEXT NOT NULL DEFAULT 'pending'   CHECK (status  IN ('pending','completed')),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID REFERENCES public.groups(id)   ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'text',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Profiles: all authenticated users can read; users manage their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Schools: members can read; owners can write
CREATE POLICY "schools_select" ON public.schools FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = id AND m.user_id = auth.uid())
);
CREATE POLICY "schools_insert" ON public.schools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schools_update" ON public.schools FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = id AND m.user_id = auth.uid() AND m.role = 'Owner')
);

-- Memberships
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.memberships m2 WHERE m2.school_id = school_id AND m2.user_id = auth.uid())
);
CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "memberships_delete" ON public.memberships FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.memberships m2 WHERE m2.school_id = school_id AND m2.user_id = auth.uid() AND m2.role = 'Owner')
);

-- Invite codes: all authenticated can read (needed to join); owners can write
CREATE POLICY "invite_codes_select" ON public.invite_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "invite_codes_insert" ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
);
CREATE POLICY "invite_codes_update" ON public.invite_codes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
);

-- Groups: school members read; owners write
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid())
);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
);
CREATE POLICY "groups_update" ON public.groups FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
);
CREATE POLICY "groups_delete" ON public.groups FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
);

-- Group members
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.memberships m ON m.school_id = g.school_id
    WHERE g.id = group_id AND m.user_id = auth.uid()
  )
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.memberships m ON m.school_id = g.school_id
    WHERE g.id = group_id AND m.user_id = auth.uid() AND m.role = 'Owner'
  )
);

-- Tasks: group members fully manage
CREATE POLICY "tasks_all" ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()));

-- Messages: group members fully manage
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated USING (
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.memberships m ON m.school_id = g.school_id
    WHERE g.id = group_id AND m.user_id = auth.uid() AND m.role = 'Owner'
  )
);

-- ── 3. TRIGGER: auto-create profile on signup ──────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. REALTIME ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- ── 5. STORAGE ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', true, 524288, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "chat_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "chat_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND owner = auth.uid());
