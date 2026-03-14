-- Allow peternak to insert farms
CREATE POLICY "Peternak can insert farms"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'peternak'::app_role));

-- Allow peternak to update own farms via farm_members
CREATE POLICY "Peternak can update own farms"
ON public.farms
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'peternak'::app_role) 
  AND EXISTS (
    SELECT 1 FROM farm_members WHERE farm_members.farm_id = farms.id AND farm_members.user_id = auth.uid()
  )
);

-- Allow peternak to insert own farm members
CREATE POLICY "Peternak can insert own farm members"
ON public.farm_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow peternak to insert supply for own farms  
CREATE POLICY "Peternak can insert own supply"
ON public.supply_records
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farm_members WHERE farm_members.farm_id = supply_records.farm_id AND farm_members.user_id = auth.uid()
  )
);