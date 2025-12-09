import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getMatches } from "@/lib/firestore";

export default function RefereeHeatmapCard() {
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
    staleTime: 60_000,
  });

  const { weeks, maxCount } = useMemo(() => {
    const today = new Date();
    const from = startOfWeek(subWeeks(today, 11), { weekStartsOn: 0 });
    const to = endOfWeek(today, { weekStartsOn: 0 });

    const counts = new Map<string, number>();
    (matches ?? []).forEach((m: any) => {
      const d = new Date(m.date);
      const key = format(d, "yyyy-MM-dd");
      let c = counts.get(key) ?? 0;
      if (m.mainReferee?.id) c += 1;
      if (m.assistantReferee1?.id) c += 1;
      if (m.assistantReferee2?.id) c += 1;
      counts.set(key, c);
    });

    const weeks: { days: { key: string; date: Date; count: number }[] }[] = [];
    let cursor = from;
    while (cursor <= to) {
      const weekStart = cursor;
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return { key, date: d, count: counts.get(key) ?? 0 };
      });
      weeks.push({ days });
      cursor = addDays(weekEnd, 1);
    }

    const maxCount = Array.from(counts.values()).reduce((m, v) => Math.max(m, v), 0) || 1;
    return { weeks, maxCount };
  }, [matches]);

  const shade = (n: number) => {
    if (n <= 0) return "rgba(106, 177, 0, 0.08)"; // light green
    const alpha = 0.2 + 0.8 * Math.min(1, n / (maxCount || 1));
    return `rgba(106, 177, 0, ${alpha})`;
  };

  return (
    <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">Assignments by Day (12 weeks)</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="text-gray-300">Loading…</div>
        ) : error ? (
          <div className="text-red-400">Failed to load.</div>
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto">
              {weeks.map((w, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {w.days.map((d) => (
                    <div
                      key={d.key}
                      title={`${format(d.date, "eee, MMM d")}: ${d.count} assignments`}
                      className="h-3.5 w-3.5 rounded-[3px]"
                      style={{ background: shade(d.count) }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <span>Less</span>
              <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: shade(0) }} />
              <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: shade(Math.ceil(maxCount * 0.33)) }} />
              <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: shade(Math.ceil(maxCount * 0.66)) }} />
              <span className="h-3.5 w-3.5 rounded-[3px]" style={{ background: shade(maxCount) }} />
              <span>More</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
