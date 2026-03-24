-- Allow public (anonymous) users to read farms for landing page stats and price ticker
CREATE POLICY "Public can read farms"
  ON public.farms
  FOR SELECT
  TO public
  USING (true);

-- Allow public (anonymous) users to read supply records for price ticker and harga page
CREATE POLICY "Public can read supply records"
  ON public.supply_records
  FOR SELECT
  TO public
  USING (true);

-- Allow public (anonymous) users to read profiles for member counts on landing page
CREATE POLICY "Public can read approved profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (status = 'approved');