
CREATE POLICY "Anyone can view VIP roles"
ON public.user_roles
FOR SELECT
TO authenticated, anon
USING (role = 'vip'::app_role);
