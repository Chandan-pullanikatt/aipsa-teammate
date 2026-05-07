-- ============================================================
-- AIPSA Office Management System — Supabase Schema v3
-- Safe to run multiple times — drops everything first
-- ============================================================

-- ── 0. CLEAN SLATE ───────────────────────────────────────────

DROP TABLE IF EXISTS public.messages      CASCADE;
DROP TABLE IF EXISTS public.tasks         CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups        CASCADE;
DROP TABLE IF EXISTS public.invite_codes  CASCADE;
DROP TABLE IF EXISTS public.memberships   CASCADE;
DROP TABLE IF EXISTS public.schools       CASCADE;
DROP TABLE IF EXISTS public.profiles      CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user()       CASCADE;
DROP FUNCTION IF EXISTS public.get_my_school_ids()     CASCADE;
DROP FUNCTION IF EXISTS public.is_school_member(UUID)  CASCADE;
DROP FUNCTION IF EXISTS public.is_school_owner(UUID)   CASCADE;

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

-- ── 2. SECURITY DEFINER HELPERS ───────────────────────────────
-- These functions bypass RLS to avoid infinite recursion in policies.

CREATE OR REPLACE FUNCTION public.get_my_school_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_school_member(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE school_id = p_school_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_school_owner(p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE school_id = p_school_id AND user_id = auth.uid() AND role = 'Owner'
  );
$$;

-- ── 3. ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Schools: all authenticated can INSERT (owner membership added right after in app code)
CREATE POLICY "schools_select" ON public.schools FOR SELECT TO authenticated USING (
  public.is_school_member(id)
);
CREATE POLICY "schools_insert" ON public.schools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schools_update" ON public.schools FOR UPDATE TO authenticated USING (
  public.is_school_owner(id)
);
CREATE POLICY "schools_delete" ON public.schools FOR DELETE TO authenticated USING (
  public.is_school_owner(id)
);

-- Memberships: uses helper function — NO self-referential subquery (prevents recursion)
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR school_id IN (SELECT public.get_my_school_ids())
);
CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "memberships_delete" ON public.memberships FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_school_owner(school_id)
);

-- Invite codes: anyone can read (needed to validate join codes); any authenticated can insert/update
-- (App logic in registerSchool/regenerateCode ensures only owners do this)
CREATE POLICY "invite_codes_select" ON public.invite_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "invite_codes_insert" ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invite_codes_update" ON public.invite_codes FOR UPDATE TO authenticated USING (true);

-- Groups
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (
  public.is_school_member(school_id)
);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (
  public.is_school_member(school_id)
);
CREATE POLICY "groups_update" ON public.groups FOR UPDATE TO authenticated USING (
  public.is_school_owner(school_id)
);
CREATE POLICY "groups_delete" ON public.groups FOR DELETE TO authenticated USING (
  public.is_school_owner(school_id)
);

-- Group members
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND public.is_school_member(g.school_id)
  )
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND public.is_school_owner(g.school_id)
  )
);

-- Tasks
CREATE POLICY "tasks_all" ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()));

-- Messages
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
    WHERE g.id = group_id AND public.is_school_owner(g.school_id)
  )
);

-- ── 4. TRIGGER: auto-create profile on signup ──────────────────

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

-- Backfill profiles for any existing auth users
INSERT INTO public.profiles (id, email, name)
SELECT id, email, ''
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── 5. REALTIME ───────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- ── 6. STORAGE ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', true, 524288, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "chat_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "chat_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND owner = auth.uid());
