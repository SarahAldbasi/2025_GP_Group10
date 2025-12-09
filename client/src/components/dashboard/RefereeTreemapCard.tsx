import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, subDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getMatches } from "@/lib/firestore";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

type Node = {
  name: string;
  value: number;     // activeness score (size)
  matches30: number; // number of assignments in last 30d
  fill: string;      // color by activity
  image?: string;
};

/** brand-friendly scale: gray -> brand green */
const SCALE = ["#374151", "#4b5563", "#6ab100", "#5a9a00"] as const;
const LOOKBACK_DAYS = 30;
const HALFLIFE_DAYS = 30;

export default function RefereeTreemapCard() {
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
  });

  const data: Node[] = useMemo(() => {
    if (!matches?.length) return [];

    const now = new Date();
    const since = subDays(now, LOOKBACK_DAYS);
    const byId = new Map<string, Node>();

    // Track best name version (proper case) for each normalized name
    const bestNames = new Map<string, string>(); // normalized name -> best name (proper case)

    const bump = (ref: any, when: Date) => {
      if (!ref?.name) return; // Skip if no name
      
      const normalizedName = ref.name.toLowerCase().trim();
      const trimmedName = ref.name.trim();
      
      // Track best name version (prefer proper case)
      if (!bestNames.has(normalizedName) || 
          (trimmedName && trimmedName[0] === trimmedName[0].toUpperCase() && 
           bestNames.get(normalizedName)![0] !== bestNames.get(normalizedName)![0].toUpperCase())) {
        bestNames.set(normalizedName, trimmedName);
      }
      
      // Calculate days difference more accurately using milliseconds
      const timeDiff = now.getTime() - when.getTime();
      const days = Math.max(0, timeDiff / (24 * 60 * 60 * 1000)); // Convert to days with decimals
      const weight = Math.pow(0.5, days / HALFLIFE_DAYS); // decay by recency
      
      // Use normalized name as key to group all variations of the same referee
      const key = normalizedName;
      const existing = byId.get(key);
      
      if (existing) {
        // Prefer proper case name
        const bestName = bestNames.get(key) || trimmedName;
        if (bestName && bestName[0] === bestName[0].toUpperCase()) {
          existing.name = bestName;
        }
        existing.value += weight;
        existing.matches30 += 1;
        if (ref.image && !existing.image) {
          existing.image = ref.image;
        }
      } else {
        byId.set(key, {
          name: trimmedName,
          value: weight,
          matches30: 1,
          fill: SCALE[0],
          image: ref.image
        });
      }
    };

    for (const m of matches) {
      if (!m.date) continue; // Skip matches without dates
      
      // Handle date conversion safely
      let d: Date;
      if (m.date instanceof Date) {
        d = m.date;
      } else if (m.date && typeof m.date === 'object' && 'toDate' in m.date) {
        d = (m.date as any).toDate();
      } else {
        d = new Date(m.date);
      }
      
      // Skip invalid dates or dates outside the lookback period (last 30 days)
      // Include matches from 'since' (30 days ago) up to now
      if (isNaN(d.getTime()) || d < since || d > now) continue;
      
      // Only bump referees that exist
      if (m.mainReferee) bump(m.mainReferee, d);
      if (m.assistantReferee1) bump(m.assistantReferee1, d);
      if (m.assistantReferee2) bump(m.assistantReferee2, d);
    }

    // Update names to use the best version (proper case) from bestNames map
    for (const [key, node] of byId.entries()) {
      const bestName = bestNames.get(key);
      if (bestName && bestName[0] === bestName[0].toUpperCase()) {
        node.name = bestName;
      }
    }

    const arr = [...byId.values()];
    if (!arr.length) return [];

    // color by quantiles of score (value)
    const scores = arr.map((n) => n.value).sort((a, b) => a - b);
    
    // Improved quantile calculation using linear interpolation
    const getQuantile = (p: number): number => {
      if (scores.length === 0) return 0;
      if (scores.length === 1) return scores[0];
      
      const index = p * (scores.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      
      if (lower === upper) return scores[lower];
      return scores[lower] * (1 - weight) + scores[upper] * weight;
    };
    
    const q1 = getQuantile(0.33);
    const q2 = getQuantile(0.66);

    arr.forEach((n) => {
      n.fill =
        n.value <= q1 ? SCALE[0] :
        n.value <= q2 ? SCALE[1] :
        SCALE[3];
    });

    // keep top 24 most active to keep the card readable
    return arr.sort((a, b) => b.value - a.value).slice(0, 24);
  }, [matches]);

  return (
    <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">
          Referees by Activeness (30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-gray-300">Loading…</div>
        ) : error ? (
          <div className="text-red-400">Failed to load.</div>
        ) : data.length === 0 ? (
          <div className="text-gray-300">No recent activity.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="value"
                nameKey="name"
                stroke="#1f1f1f"
                fill={SCALE[1]}
                content={<CustomNode />}
              >
                <Tooltip
                  content={({ payload }) => {
                    const p: any = payload?.[0]?.payload;
                    if (!p) return null;
                    return (
                      <div className="text-sm bg-[#2b2b2b] border border-[#3b3b3b] text-white px-3 py-2 rounded">
                        <div className="font-medium">{p.name}</div>
                        <div>Activeness score: {p.value.toFixed(2)}</div>
                        <div>Assignments (30d): {p.matches30}</div>
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {/* legend */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-300">
          <Legend color={SCALE[0]} label="Lightly active" />
          <Legend color={SCALE[1]} label="Moderately Active" />
          <Legend color={SCALE[3]} label="Highly active" />
        </div>
      </CardContent>
    </Card>
  );
}

function CustomNode(props: any) {
  const { x, y, width, height, name, fill, value } = props;
  if (width < 48 || height < 26) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#1f1f1f" rx={6} />;
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#1f1f1f" rx={5} />
      {/* Shadow layer */}
      <text x={x + 11} y={y + 19} fill="rgba(0, 0, 0, 0.5)" stroke="none" strokeWidth={0} fontSize={12} fontWeight={700} className="truncate">{name}</text>
      <text x={x + 11} y={y + 34} fill="rgba(0, 0, 0, 0.5)" stroke="none" strokeWidth={0} fontSize={11} fontWeight={700}>{value.toFixed(2)}</text>
      {/* Main text */}
      <text x={x + 10} y={y + 18} fill="#ffffff" stroke="none" strokeWidth={0} fontSize={12} fontWeight={700} className="truncate">{name}</text>
      <text x={x + 10} y={y + 33} fill="#ffffff" stroke="none" strokeWidth={0} fontSize={11} fontWeight={700}>{value.toFixed(2)}</text>
    </g>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
