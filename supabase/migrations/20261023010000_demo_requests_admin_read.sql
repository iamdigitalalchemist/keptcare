-- Platform admins can read demo requests (Admin → Demo requests tab).
CREATE POLICY "Platform admins can view demo requests"
  ON public.demo_requests FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
