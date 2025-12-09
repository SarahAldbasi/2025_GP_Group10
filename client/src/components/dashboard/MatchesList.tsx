import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { getMatches, type Match } from "@/lib/firestore";
import DashboardMatchRow from "./DashboardMatchRow";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  range: "nextWeek" | "pastWeek";
  matches?: Match[]; // ✅ يسمح بتمرير بيانات مفلترة
};

export default function MatchesList({ title, range, matches }: Props) {
  const { data: fetchedMatches, isLoading, error } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: getMatches,
    enabled: !matches, // إذا تم تمرير matches خارجيًا، لا نعمل الاستعلام
  });

  const data = matches || fetchedMatches || [];

  const filteredByRange = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    const safeDate = (x: any) =>
      x?.toDate ? x.toDate() : new Date(x);

    if (range === "nextWeek") {
      const to = endOfDay(addDays(todayStart, 7));
      return data
        .filter((m) => {
          const d = safeDate(m.date);
          return d >= todayStart && d <= to;
        })
        .sort((a, b) => +safeDate(a.date) - +safeDate(b.date));
    } else {
      const from = startOfDay(addDays(todayStart, -7));
      const to = endOfDay(addDays(todayStart, -1));
      return data
        .filter((m) => {
          const d = safeDate(m.date);
          return d >= from && d <= to;
        })
        .sort((a, b) => +safeDate(b.date) - +safeDate(a.date));
    }
  }, [data, range]);

  return (
    <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="text-gray-300">Loading...</div>
        ) : error ? (
          <div className="text-red-400">Failed to load matches.</div>
        ) : filteredByRange.length === 0 ? (
          <div className="text-gray-300">No matches in this window.</div>
        ) : (
          filteredByRange.map((m) => (
            <DashboardMatchRow
              key={m.id || `${m.homeTeam?.name}-${m.awayTeam?.name}-${m.date}`}
              match={m}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
