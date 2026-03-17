import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Region {
  id: string;
  name: string;
}

async function fetchRegions(type: string, id?: string): Promise<Region[]> {
  const params = new URLSearchParams({ type });
  if (id) params.set('id', id);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/indonesia-regions?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!res.ok) return [];
  const raw: Region[] = await res.json();
  return raw.map(r => ({ ...r, name: titleCase(r.name) }));
}

export function useIndonesiaRegions() {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  useEffect(() => {
    setLoadingProvinces(true);
    fetchRegions('provinces')
      .then(setProvinces)
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProvinces(false));
  }, []);

  const fetchCities = useCallback((provinceId: string) => {
    setCities([]);
    setDistricts([]);
    setVillages([]);
    if (!provinceId) return;
    setLoadingCities(true);
    fetchRegions('regencies', provinceId)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, []);

  const fetchDistricts = useCallback((cityId: string) => {
    setDistricts([]);
    setVillages([]);
    if (!cityId) return;
    setLoadingDistricts(true);
    fetchRegions('districts', cityId)
      .then(setDistricts)
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false));
  }, []);

  const fetchVillages = useCallback((districtId: string) => {
    setVillages([]);
    if (!districtId) return;
    setLoadingVillages(true);
    fetchRegions('villages', districtId)
      .then(setVillages)
      .catch(() => setVillages([]))
      .finally(() => setLoadingVillages(false));
  }, []);

  return {
    provinces, cities, districts, villages,
    fetchCities, fetchDistricts, fetchVillages,
    loadingProvinces, loadingCities, loadingDistricts, loadingVillages,
  };
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
