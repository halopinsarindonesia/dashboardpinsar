
-- Create a function to auto-set farms to inactive after 30 days without panen input
-- This can be called periodically (e.g., via cron or on each dashboard load)
CREATE OR REPLACE FUNCTION public.auto_inactivate_farms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set farms to inactive if no supply record in 30 days
  -- Only affects farms that are currently 'active' or 'prapasca'
  UPDATE public.farms
  SET status = 'inactive',
      updated_at = now()
  WHERE status IN ('active', 'prapasca')
    AND id NOT IN (
      SELECT DISTINCT farm_id
      FROM public.supply_records
      WHERE record_date >= (CURRENT_DATE - INTERVAL '30 days')
    )
    AND created_at < (now() - INTERVAL '30 days');
END;
$$;

-- Create a function to auto-set farms to prapasca when population reaches 0
-- This is called via trigger on supply_records insert/update
CREATE OR REPLACE FUNCTION public.auto_prapasca_on_zero_pop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the new population is 0 and farm is active, set to prapasca
  IF NEW.broiler_population <= 0 THEN
    UPDATE public.farms
    SET status = 'prapasca',
        updated_at = now()
    WHERE id = NEW.farm_id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on supply_records
CREATE TRIGGER trigger_auto_prapasca
AFTER INSERT OR UPDATE ON public.supply_records
FOR EACH ROW
EXECUTE FUNCTION public.auto_prapasca_on_zero_pop();
