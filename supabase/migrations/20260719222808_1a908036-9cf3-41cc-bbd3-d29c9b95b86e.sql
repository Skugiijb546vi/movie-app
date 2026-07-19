
CREATE TABLE public.watch_rooms (
  id text PRIMARY KEY,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_kind text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_rooms TO authenticated;
GRANT ALL ON public.watch_rooms TO service_role;
ALTER TABLE public.watch_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read rooms" ON public.watch_rooms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vip create rooms" ON public.watch_rooms
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id AND public.has_role(auth.uid(), 'vip'));
CREATE POLICY "host update rooms" ON public.watch_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "host delete rooms" ON public.watch_rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TABLE public.watch_room_members (
  room_id text NOT NULL REFERENCES public.watch_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_room_members TO authenticated;
GRANT ALL ON public.watch_room_members TO service_role;
ALTER TABLE public.watch_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read members" ON public.watch_room_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "self join room" ON public.watch_room_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "self leave room" ON public.watch_room_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
