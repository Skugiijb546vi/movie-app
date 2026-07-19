
-- 1. VIP roles: restrict to authenticated only (was anon+authenticated)
DROP POLICY IF EXISTS "Anyone can view VIP roles" ON public.user_roles;
CREATE POLICY "Authenticated can view VIP roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (role = 'vip'::app_role);

-- 2. Movie comments: authenticated only
DROP POLICY IF EXISTS "Comments are readable by everyone" ON public.movie_comments;
CREATE POLICY "Comments readable by authenticated"
ON public.movie_comments FOR SELECT
TO authenticated
USING (true);

-- 3. Watch room members: only host or fellow members can read
DROP POLICY IF EXISTS "auth read members" ON public.watch_room_members;
CREATE POLICY "members read own rooms members"
ON public.watch_room_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.watch_rooms r
    WHERE r.id = watch_room_members.room_id
      AND r.host_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.watch_room_members m
    WHERE m.room_id = watch_room_members.room_id
      AND m.user_id = auth.uid()
  )
);

-- 4. Watch rooms: active rooms discoverable, plus your own hosted/joined rooms
DROP POLICY IF EXISTS "auth read rooms" ON public.watch_rooms;
CREATE POLICY "read active or own rooms"
ON public.watch_rooms FOR SELECT
TO authenticated
USING (
  is_active = true
  OR host_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.watch_room_members m
    WHERE m.room_id = watch_rooms.id AND m.user_id = auth.uid()
  )
);

-- 5. has_role: switch to SECURITY INVOKER so anon/authenticated EXECUTE isn't a privilege bypass.
--    Policies call has_role(auth.uid(), ...) on the caller's own row, which the
--    "Users can view their own roles" policy already allows.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Lock down EXECUTE on SECURITY DEFINER helper from anonymous callers
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;

-- has_role can be called by authenticated (needed by RLS expressions run as caller)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
