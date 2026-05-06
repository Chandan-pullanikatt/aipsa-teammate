-- ============================================================
-- AIPSA Office Management System — Supabase Schema
-- Run this entire file in: Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. TABLES ────────────────────────────────────────────────

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email   TEXT NOT NULL,
  name    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schools / institutions
CREATE TABLE IF NOT EXISTS public.schools (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'Secondary',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School memberships (who belongs to which school, with what role)
CREATE TABLE IF NOT EXISTS public.memberships (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  school_id  UUID REFERENCES public.schools(id)   ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('Owner','Manager','Teacher','Staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

-- Invite codes (one per role per school, used to join)
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id  UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  role_key   TEXT NOT NULL CHECK (role_key IN ('teacher','staff','manager')),
  code       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, role_key)
);

-- Groups / departments (support nested via parent_id)
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id  UUID REFERENCES public.schools(id)  ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES public.groups(id)   ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group memberships (which users are in which groups)
CREATE TABLE IF NOT EXISTS public.group_members (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id)   ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, group_id)
);

-- Tasks (assigned within a group)
CREATE TABLE IF NOT EXISTS public.tasks (
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

-- Messages (chat inside a group, rich types stored in JSONB metadata)
CREATE TABLE IF NOT EXISTS public.messages (
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

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Schools (readable by members, writable by owners)
CREATE POLICY "schools_select" ON public.schools
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = id AND m.user_id = auth.uid())
  );

CREATE POLICY "schools_insert" ON public.schools
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "schools_update" ON public.schools
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

-- Memberships (users can see memberships of schools they belong to)
CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.memberships m2 WHERE m2.school_id = school_id AND m2.user_id = auth.uid())
  );

CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.memberships m2 WHERE m2.school_id = school_id AND m2.user_id = auth.uid() AND m2.role = 'Owner')
  );

-- Invite codes (readable by all authenticated to allow joining; writable by owners)
CREATE POLICY "invite_codes_select" ON public.invite_codes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invite_codes_insert" ON public.invite_codes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

CREATE POLICY "invite_codes_update" ON public.invite_codes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

-- Groups (school members can read; owners can write)
CREATE POLICY "groups_select" ON public.groups
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid())
  );

CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.school_id = school_id AND m.user_id = auth.uid() AND m.role = 'Owner')
  );

-- Group members (school members can read/write)
CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.memberships m ON m.school_id = g.school_id
      WHERE g.id = group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_insert" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "group_members_delete" ON public.group_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.memberships m ON m.school_id = g.school_id
      WHERE g.id = group_id AND m.user_id = auth.uid() AND m.role = 'Owner'
    )
  );

-- Tasks (group members can fully manage)
CREATE POLICY "tasks_all" ON public.tasks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

-- Messages (group members can fully manage)
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.memberships m ON m.school_id = g.school_id
      WHERE g.id = group_id AND m.user_id = auth.uid() AND m.role = 'Owner'
    )
  );

-- ── 3. TRIGGER: auto-create profile on signup ──────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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

-- ── 4. REALTIME: enable for live chat and task sync ────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- ── 5. STORAGE: bucket for chat images ────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  524288,                                    -- 512 KB max
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "chat_images_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'chat-images' AND owner = auth.uid());
