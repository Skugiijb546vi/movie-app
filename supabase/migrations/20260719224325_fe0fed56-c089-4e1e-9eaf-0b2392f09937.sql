
-- Restrict VIP visibility to own row only
DROP POLICY IF EXISTS "Authenticated can view VIP roles" ON public.user_roles;

-- (The existing "Users can view their own roles" policy already covers self-reads.)

-- Helper: return the subset of provided user ids that hold the vip role.
CREATE OR REPLACE FUNCTION public.get_vip_ids(_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'vip'::app_role
    AND user_id = ANY(_ids)
$$;

REVOKE EXECUTE ON FUNCTION public.get_vip_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vip_ids(uuid[]) TO authenticated;
