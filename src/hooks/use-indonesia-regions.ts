import { useState, useEffect, useCallback } from 'react';

const BASE_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

interface Region {
  id: string;
  name: string;
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
    fetch(`${BASE_URL}/provinces.json`)
      .then(r => r.json())
      .then((data: Region[]) => {
        // Title case the names
        setProvinces(data.map(p => ({ ...p, name: titleCase(p.name) })));
      })
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProvinces(false));
  }, []);

  const fetchCities = useCallback((provinceId: string) => {
    setCities([]);
    setDistricts([]);
    setVillages([]);
    if (!provinceId) return;
    setLoadingCities(true);
    fetch(`${BASE_URL}/regencies/${provinceId}.json`)
      .then(r => r.json())
      .then((data: Region[]) => setCities(data.map(c => ({ ...c, name: titleCase(c.name) }))))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, []);

  const fetchDistricts = useCallback((cityId: string) => {
    setDistricts([]);
    setVillages([]);
    if (!cityId) return;
    setLoadingDistricts(true);
    fetch(`${BASE_URL}/districts/${cityId}.json`)
      .then(r => r.json())
      .then((data: Region[]) => setDistricts(data.map(d => ({ ...d, name: titleCase(d.name) }))))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false));
  }, []);

  const fetchVillages = useCallback((districtId: string) => {
    setVillages([]);
    if (!districtId) return;
    setLoadingVillages(true);
    fetch(`${BASE_URL}/villages/${districtId}.json`)
      .then(r => r.json())
      .then((data: Region[]) => setVillages(data.map(v => ({ ...v, name: titleCase(v.name) }))))
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
