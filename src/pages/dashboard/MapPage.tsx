import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const FARM_TYPE_LABELS: Record<string, string> = {
  broiler: 'Ayam Broiler', layer: 'Ayam Petelur', ayam_kampung: 'Ayam Kampung',
  ayam_pejantan: 'Ayam Pejantan', bebek: 'Bebek', puyuh: 'Puyuh',
};

// Province center coordinates
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

interface ProvinceData {
  province: string;
  activeFarms: number;
  totalCapacity: number;
  totalPopulation: number;
}

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Fetch all farms
      const { data: farms } = await supabase
        .from('farms')
        .select('id, province, status, kapasitas_kandang, broiler_initial_population, farm_type');

      const allFarms = farms ?? [];
      const activeFarms = allFarms.filter((f: any) => f.status === 'active');
      const activeFarmIds = activeFarms.map((f: any) => f.id);

      // Fetch supply records for population calculation
      let supplyByFarm: Record<string, { input: number; sold: number; death: number }> = {};
      if (activeFarmIds.length > 0) {
        const { data: supplyData } = await supabase
          .from('supply_records')
          .select('farm_id, broiler_input, broiler_sold, broiler_death')
          .in('farm_id', activeFarmIds);

        (supplyData ?? []).forEach((s: any) => {
          if (!supplyByFarm[s.farm_id]) supplyByFarm[s.farm_id] = { input: 0, sold: 0, death: 0 };
          supplyByFarm[s.farm_id].input += s.broiler_input ?? 0;
          supplyByFarm[s.farm_id].sold += s.broiler_sold ?? 0;
          supplyByFarm[s.farm_id].death += s.broiler_death ?? 0;
        });
      }

      // Group by province
      const grouped: Record<string, ProvinceData> = {};
      allFarms.forEach((f: any) => {
        if (!grouped[f.province]) {
          grouped[f.province] = { province: f.province, activeFarms: 0, totalCapacity: 0, totalPopulation: 0 };
        }
        if (f.status === 'active') {
          grouped[f.province].activeFarms++;
          grouped[f.province].totalCapacity += f.kapasitas_kandang ?? 0;
          const initial = f.broiler_initial_population ?? 0;
          const supply = supplyByFarm[f.id] || { input: 0, sold: 0, death: 0 };
          grouped[f.province].totalPopulation += Math.max(0, initial + supply.input - supply.sold - supply.death);
        }
      });

      setProvinceData(Object.values(grouped));
      setLoading(false);
    })();
  }, []);

  const fmtNum = (n: number) => n.toLocaleString('id-ID');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Peta Peternakan</h1>
          <p className="text-sm text-muted-foreground">Visualisasi distribusi peternakan di Indonesia</p>
        </div>
        <div className="flex h-[500px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Peta Peternakan</h1>
        <p className="text-sm text-muted-foreground">Visualisasi distribusi peternakan di Indonesia</p>
      </div>
      <div className="h-[600px] rounded-xl border border-border overflow-hidden">
        <MapContainer
          center={[-2.5, 118]}
          zoom={5}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {provinceData.map((pd) => {
            const coords = PROVINCE_COORDS[pd.province];
            if (!coords) return null;
            const radius = Math.max(6, Math.min(25, 6 + pd.activeFarms * 2));
            return (
              <CircleMarker
                key={pd.province}
                center={coords}
                radius={radius}
                pathOptions={{
                  fillColor: pd.activeFarms > 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 0%, 60%)',
                  fillOpacity: 0.75,
                  color: 'hsl(var(--foreground))',
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-bold text-base mb-2">{pd.province}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Peternakan Aktif:</span><span className="font-semibold">{fmtNum(pd.activeFarms)}</span></div>
                      <div className="flex justify-between"><span>Kapasitas:</span><span className="font-semibold">{fmtNum(pd.totalCapacity)}</span></div>
                      <div className="flex justify-between"><span>Populasi:</span><span className="font-semibold">{fmtNum(pd.totalPopulation)}</span></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
