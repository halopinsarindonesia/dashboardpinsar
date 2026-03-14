
-- Fix permissive audit log insert policy - restrict to authenticated users only (already done via TO authenticated, but tighten the check)
DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
