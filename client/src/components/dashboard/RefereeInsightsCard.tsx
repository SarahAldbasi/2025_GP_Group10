import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { getMatches } from "@/lib/firestore";
import { PieChart, Pie, Cell, ResponsiveContainer, Label, Tooltip } from "recharts";

type Referee = {
  id?: string;
  name?: string;
  image?: string;
  isAvailable?: boolean;
};

const COLORS = { available: "#6ab100", unavailable: "#4b5563" } as const;
const MAX_AVAIL_PREVIEW = 8;

export default function RefereeInsightsCard() {
  // LIVE referees feed
  const [referees, setReferees] = useState<Referee[] | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "referees"), (snap) => {
      setReferees(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  // Matches for last-30d leaderboard
  const { data: matches } = useQuery<any[]>({
    queryKey: ["matches"],
    queryFn: getMatches,
    staleTime: 60_000,
  });

  const {
    total,
    available,
    availableRefs,
    donutData,
    top5,
    assignments30d,
  } = useMemo(() => {
    const refs = referees ?? [];
    const total = refs.length;
    const availableRefs = refs.filter((r) => r.isAvailable);
    const available = availableRefs.length;

    const donutData =
      total === 0
        ? []
        : [
            { name: "Available", value: available, color: COLORS.available },
            { name: "Unavailable", value: total - available, color: COLORS.unavailable },
          ];

    // Leaderboard + total assignments in last 30 days
    const cutoff = subDays(new Date(), 30).getTime();
    const counts = new Map<string, { id: string; name: string; image?: string; count: number }>();
    (matches ?? []).forEach((m) => {
      const t = new Date(m.date).getTime();
      if (Number.isNaN(t) || t < cutoff) return;
      [m.mainReferee, m.assistantReferee1, m.assistantReferee2].forEach((ref: any) => {
        if (!ref?.id) return;
        const curr = counts.get(ref.id) ?? { id: ref.id, name: ref.name ?? "Referee", image: ref.image, count: 0 };
        curr.count += 1;
        counts.set(ref.id, curr);
      });
    });
    const top5 = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const assignments30d = [...counts.values()].reduce((s, r) => s + r.count, 0);

    return { total, available, availableRefs, donutData, top5, assignments30d };
  }, [referees, matches]);

  const loading = referees === null;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">Referees Overview</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <Kpi label="Total" value={loading ? "—" : String(total)} />
          <Kpi label="Available now" value={loading ? "—" : `${available} (${pct(available, total)}%)`} />
          <Kpi label="Assignments (30d)" value={loading ? "—" : String(assignments30d)} />
        </div>

        {/* Donut + Available grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Availability donut */}
          <div className="rounded-lg bg-[#1f1f1f] border border-[#2a2a2a] p-4">
            <div className="text-sm text-gray-200 mb-2">Availability</div>
            <div className="h-40">
              {total === 0 ? (
                <div className="text-gray-300 text-sm flex items-center justify-center h-full">
                  No referees yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      labelLine={false}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="#1f1f1f" />
                      ))}
                      <Label
                        value={`${pct(available, total)}%`}
                        position="center"
                        fill="#e5e7eb"
                        style={{ fontSize: 18, fontWeight: 700 }}
                      />
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [v, n as string]}
                      contentStyle={{ background: "#2b2b2b", border: "1px solid #3b3b3b", color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {available} available · {Math.max(total - available, 0)} unavailable
            </div>
          </div>

          {/* Available now mini-grid (LIVE) */}
          <div className="rounded-lg bg-[#1f1f1f] border border-[#2a2a2a] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-200">Available now</div>
              {!loading && <span className="text-xs text-gray-400">{available}/{total}</span>}
            </div>
            {loading ? (
              <div className="text-gray-300 text-sm">Loading…</div>
            ) : available === 0 ? (
              <div className="text-gray-300 text-sm">No one is available right now.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableRefs.slice(0, MAX_AVAIL_PREVIEW).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-md bg-[#232323] border border-[#2e2e2e] px-3 py-2">
                      {r.image ? (
                        <img src={r.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-[#2f2f2f]" />
                      )}
                      <span className="truncate text-sm text-white">{r.name}</span>
                    </div>
                  ))}
                </div>
                {availableRefs.length > MAX_AVAIL_PREVIEW && (
                  <div className="text-xs text-gray-400 mt-1">
                    +{availableRefs.length - MAX_AVAIL_PREVIEW} more available
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Top 5 (last 30d) */}
        <div>
          <div className="text-sm font-medium text-gray-200 mb-2">Top 5 by matches (last 30d)</div>
          {!matches ? (
            <div className="text-gray-300 text-sm">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {top5.length === 0 ? (
                <li className="text-gray-300 text-sm">No recent assignments.</li>
              ) : (
                top5.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-[#1f1f1f] border border-[#2e2e2e] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {r.image ? (
                        <img src={r.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-[#2f2f2f]" />
                      )}
                      <span className="truncate text-sm text-white max-w-[12rem]">{r.name}</span>
                    </div>
                    <span className="text-sm text-gray-300">{r.count}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full border-[#3b3b3b] text-gray-100 hover:bg-[#2a2a2a]"
          onClick={() => (window.location.href = "/referees")}
        >
          View all referees
        </Button>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#1f1f1f] border border-[#2a2a2a] p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-white mt-1">{value}</div>
    </div>
  );
}
