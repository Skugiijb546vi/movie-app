
-- Helper to check membership without cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.watch_room_members
    WHERE room_id = _room_id AND user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_room_member(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(text, uuid) TO authenticated;

-- Rewrite watch_rooms SELECT: no cross-reference to watch_room_members RLS
DROP POLICY IF EXISTS "read active or own rooms" ON public.watch_rooms;
CREATE POLICY "read active or own rooms"
ON public.watch_rooms FOR SELECT
TO authenticated
USING (
  is_active = true
  OR host_id = auth.uid()
  OR public.is_room_member(id, auth.uid())
);

-- Rewrite watch_room_members SELECT using the helper to avoid recursion
DROP POLICY IF EXISTS "members read own rooms members" ON public.watch_room_members;
CREATE POLICY "members read own rooms members"
ON public.watch_room_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_room_member(room_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.watch_rooms r
    WHERE r.id = watch_room_members.room_id AND r.host_id = auth.uid()
  )
);
