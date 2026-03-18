
-- Add audit logging trigger for automatic farm status changes (prapasca and inactivation)

-- Update auto_prapasca_on_zero_pop to also log audit
CREATE OR REPLACE FUNCTION public.auto_prapasca_on_zero_pop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.broiler_population <= 0 THEN
    UPDATE public.farms
    SET status = 'prapasca',
        updated_at = now()
    WHERE id = NEW.farm_id
      AND status = 'active';
    
    -- Log audit for automatic status change
    IF FOUND THEN
      INSERT INTO public.audit_logs (user_id, user_name, action, module, old_value, new_value)
      VALUES (
        NULL,
        'System',
        'edit',
        'Farm',
        jsonb_build_object('status', 'active', 'farm_id', NEW.farm_id),
        jsonb_build_object('status', 'prapasca', 'farm_id', NEW.farm_id, 'reason', 'Population reached 0')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update auto_inactivate_farms to also log audit
CREATE OR REPLACE FUNCTION public.auto_inactivate_farms()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  farm_rec RECORD;
BEGIN
  FOR farm_rec IN
    SELECT id, status FROM public.farms
    WHERE status IN ('active', 'prapasca')
      AND id NOT IN (
        SELECT DISTINCT farm_id
        FROM public.supply_records
        WHERE record_date >= (CURRENT_DATE - INTERVAL '30 days')
      )
      AND created_at < (now() - INTERVAL '30 days')
  LOOP
    UPDATE public.farms
    SET status = 'inactive', updated_at = now()
    WHERE id = farm_rec.id;

    INSERT INTO public.audit_logs (user_id, user_name, action, module, old_value, new_value)
    VALUES (
      NULL,
      'System',
      'edit',
      'Farm',
      jsonb_build_object('status', farm_rec.status, 'farm_id', farm_rec.id),
      jsonb_build_object('status', 'inactive', 'farm_id', farm_rec.id, 'reason', 'No input for 30 days')
    );
  END LOOP;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_auto_prapasca ON public.supply_records;
CREATE TRIGGER trg_auto_prapasca
  AFTER INSERT OR UPDATE ON public.supply_records
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_prapasca_on_zero_pop();

-- Allow system (NULL user_id) to insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL);
