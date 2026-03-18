
-- Add explicit INSERT policies for DPP and DPW on farms table
-- The ALL policy requires both USING and WITH CHECK, but for INSERT only WITH CHECK is used
CREATE POLICY "DPP can insert farms"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'dpp'::app_role));

CREATE POLICY "DPW can insert farms"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'dpw'::app_role));
