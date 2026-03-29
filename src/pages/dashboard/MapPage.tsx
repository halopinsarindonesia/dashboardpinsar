import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', mixed: 'Ayam Kampung',
  other_cut: 'Ayam Pejantan', other_egg: 'Bebek', other_mixed: 'Puyuh',
};
const FARM_TYPES = Object.keys(FARM_TYPE_LABELS);
const LAYER_TYPES = ['layer', 'other_egg'];

const PROVINCE_COORDS: Record<string, [number, number]> = {
  'Aceh': [4.695, 96.749], 'Sumatera Utara': [2.116, 99.545],
  'Sumatera Barat': [-0.739, 100.800], 'Riau': [1.585, 102.288],
  'Jambi': [-1.610, 103.607], 'Sumatera Selatan': [-3.319, 104.914],
  'Bengkulu': [-3.793, 102.260], 'Lampung': [-4.859, 105.025],
  'Kep. Bangka Belitung': [-2.741, 106.440], 'Kep. Riau': [3.946, 108.143],
  'DKI Jakarta': [-6.208, 106.846], 'Jawa Barat': [-6.921, 107.607],
  'Jawa Tengah': [-7.150, 110.140], 'DI Yogyakarta': [-7.797, 110.370],
  'Jawa Timur': [-7.536, 112.238], 'Banten': [-6.405, 106.064],
  'Bali': [-8.409, 115.189], 'Nusa Tenggara Barat': [-8.652, 117.361],
  'Nusa Tenggara Timur': [-8.657, 121.079], 'Kalimantan Barat': [-0.263, 109.356],
  'Kalimantan Tengah': [-1.681, 113.383], 'Kalimantan Selatan': [-3.092, 115.283],
  'Kalimantan Timur': [1.693, 116.419], 'Kalimantan Utara': [3.073, 116.041],
  'Sulawesi Utara': [0.625, 123.975], 'Sulawesi Tengah': [-1.430, 121.446],
  'Sulawesi Selatan': [-3.669, 119.974], 'Sulawesi Tenggara': [-4.145, 122.175],
  'Gorontalo': [0.697, 122.455], 'Sulawesi Barat': [-2.844, 119.232],
  'Maluku': [-3.239, 130.145], 'Maluku Utara': [1.570, 127.808],
  'Papua': [-4.269, 138.080], 'Papua Barat': [-1.336, 133.174],
  'Papua Selatan': [-6.874, 139.490], 'Papua Tengah': [-3.590, 136.270],
  'Papua Pegunungan': [-4.100, 138.950], 'Papua Barat Daya': [-1.950, 132.300],
};

interface FarmRow {
  id: string; province: string; status: string; farm_type: string;
  kapasitas_kandang: number; broiler_initial_population: number; layer_initial_population: number;
}

interface ProvinceData {
  province: string;
  farmsByType: Record<string, number>;
  capacityByType: Record<string, number>;
  populationByType: Record<string, number>;
  totalFarms: number;
  totalCapacity: number;
  totalPopulation: number;
}

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: farmsRaw } = await supabase
        .from('farms')
        .select('id, province, status, farm_type, kapasitas_kandang, broiler_initial_population, layer_initial_population');

      const allFarms = (farmsRaw ?? []) as unknown as FarmRow[];
      const farmIds = allFarms.map(f => f.id);

      let supplyByFarm: Record<string, { bInput: number; bSold: number; bDeath: number; lInput: number; lSold: number; lDeath: number }> = {};
      if (farmIds.length > 0) {
        const { data: supplyData } = await supabase
          .from('supply_records')
          .select('farm_id, broiler_input, broiler_sold, broiler_death, layer_input, layer_sold, layer_death')
          .in('farm_id', farmIds);

        (supplyData ?? []).forEach((s: any) => {
          if (!supplyByFarm[s.farm_id]) supplyByFarm[s.farm_id] = { bInput: 0, bSold: 0, bDeath: 0, lInput: 0, lSold: 0, lDeath: 0 };
          supplyByFarm[s.farm_id].bInput += s.broiler_input ?? 0;
          supplyByFarm[s.farm_id].bSold += s.broiler_sold ?? 0;
          supplyByFarm[s.farm_id].bDeath += s.broiler_death ?? 0;
          supplyByFarm[s.farm_id].lInput += s.layer_input ?? 0;
          supplyByFarm[s.farm_id].lSold += s.layer_sold ?? 0;
          supplyByFarm[s.farm_id].lDeath += s.layer_death ?? 0;
        });
      }

      const grouped: Record<string, ProvinceData> = {};

      allFarms.forEach((f) => {
        if (!grouped[f.province]) {
          const farmsByType: Record<string, number> = {};
          const capacityByType: Record<string, number> = {};
          const populationByType: Record<string, number> = {};
          FARM_TYPES.forEach(t => { farmsByType[t] = 0; capacityByType[t] = 0; populationByType[t] = 0; });
          grouped[f.province] = { province: f.province, farmsByType, capacityByType, populationByType, totalFarms: 0, totalCapacity: 0, totalPopulation: 0 };
        }

        const pd = grouped[f.province];
        const ft = f.farm_type;
        pd.farmsByType[ft] = (pd.farmsByType[ft] || 0) + 1;
        pd.totalFarms++;

        const cap = f.kapasitas_kandang ?? 0;
        pd.capacityByType[ft] = (pd.capacityByType[ft] || 0) + cap;
        pd.totalCapacity += cap;

        const isLayer = LAYER_TYPES.includes(ft);
        const supply = supplyByFarm[f.id] || { bInput: 0, bSold: 0, bDeath: 0, lInput: 0, lSold: 0, lDeath: 0 };
        let pop: number;
        if (isLayer) {
          const initial = f.layer_initial_population ?? f.broiler_initial_population ?? 0;
          pop = Math.max(0, initial + supply.lInput - supply.lSold - supply.lDeath);
        } else {
          const initial = f.broiler_initial_population ?? 0;
          pop = Math.max(0, initial + supply.bInput - supply.bSold - supply.bDeath);
        }
        pd.populationByType[ft] = (pd.populationByType[ft] || 0) + pop;
        pd.totalPopulation += pop;
      });

      setProvinceData(Object.values(grouped));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current).setView([-2.5, 118], 5);
    (containerRef.current as HTMLElement).style.zIndex = '1';
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const fmtNum = (n: number) => n.toLocaleString('id-ID');

    provinceData.forEach((pd) => {
      const coords = PROVINCE_COORDS[pd.province];
      if (!coords) return;
      const radius = Math.max(6, Math.min(25, 6 + pd.totalFarms * 2));

      const breakdownRows = (label: string, data: Record<string, number>) =>
        FARM_TYPES.filter(t => data[t] > 0).map(t =>
          `<div style="display:flex;justify-content:space-between;gap:12px;padding-left:8px"><span style="color:#666">${FARM_TYPE_LABELS[t]}</span><strong>${fmtNum(data[t])}</strong></div>`
        ).join('');

      const farmBreakdown = breakdownRows('Peternakan', pd.farmsByType);
      const capBreakdown = breakdownRows('Kapasitas', pd.capacityByType);
      const popBreakdown = breakdownRows('Populasi', pd.populationByType);

      const popupHtml = `
        <div style="min-width:220px;font-size:13px;max-height:400px;overflow-y:auto">
          <p style="font-weight:bold;font-size:15px;margin-bottom:10px">${pd.province}</p>

          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-weight:600;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:4px">
              <span>Peternakan</span><strong>${fmtNum(pd.totalFarms)}</strong>
            </div>
            ${farmBreakdown}
          </div>

          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-weight:600;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:4px">
              <span>Kapasitas</span><strong>${fmtNum(pd.totalCapacity)}</strong>
            </div>
            ${capBreakdown}
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-weight:600;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:4px">
              <span>Populasi</span><strong>${fmtNum(pd.totalPopulation)}</strong>
            </div>
            ${popBreakdown}
          </div>
        </div>
      `;

      L.circleMarker(coords, {
        radius,
        fillColor: pd.totalFarms > 0 ? '#22c55e' : '#9ca3af',
        fillOpacity: 0.75,
        color: '#334155',
        weight: 1,
      })
        .bindPopup(popupHtml)
        .addTo(map);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [loading, provinceData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Peta Peternakan</h1>
        <p className="text-sm text-muted-foreground">Visualisasi distribusi peternakan di Indonesia</p>
      </div>
      {loading ? (
        <div className="flex h-[600px] items-center justify-center rounded-xl border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div ref={containerRef} className="h-[600px] rounded-xl border border-border overflow-hidden relative" style={{ zIndex: 1 }} />
      )}
    </div>
  );
}
