// src/components/dashboard/MatchesByStatusPie.tsx
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label
} from "recharts";
import { getMatches, getReferees, createMatch, type Match, getBalls } from "@/lib/firestore";
import type { InsertMatch } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MatchForm from "@/components/matches/MatchForm";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

// ⬇️ NEW: month helpers
import { startOfMonth, endOfMonth } from "date-fns";

/** Exact colors you requested */
const COLORS = {
  not_started: "#6ab100", // green
  upcoming: "#f59e0b",    // orange
  live: "#ef4444",        // red
  ended: "#9ca3af",       // grey
} as const;

const ORDER = ["not_started", "upcoming", "live", "ended"] as const;
type Canon = typeof ORDER[number];

const toCanon = (s?: string): Canon | "other" => {
  const t = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (t === "not_started") return "not_started";
  if (t === "upcoming" || t === "scheduled") return "upcoming";
  if (t === "live" || t === "in_progress" || t === "ongoing") return "live";
  if (t === "ended" || t === "completed" || t === "finished" || t === "played") return "ended";
  return "other";
};
const title = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Derive the *display* status - only auto-set "upcoming", all other statuses are manual */
function deriveStatus(m: Match): Canon {
  const canon = toCanon(m.status);
  const now = Date.now();
  const matchTime = new Date(m.date).getTime();
  const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;

  // If status is manually set (live, ended, not_started), use it as-is
  if (canon === "live" || canon === "ended" || canon === "not_started") {
    return canon;
  }
  
  // Only auto-derive "upcoming" for matches that haven't started yet but are within 3 days
  if (matchTime > now && matchTime <= threeDaysFromNow) {
    return "upcoming";
  }
  
  // Default to not_started if no status is set
  return "not_started";
}

interface MatchesByStatusPieProps {
  matches?: Match[];
}

export default function MatchesByStatusPie({ matches: propMatches }: MatchesByStatusPieProps = {}) {
  const { data: fetchedMatches, isLoading, error } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: getMatches,
    enabled: !propMatches, // Only fetch if matches not provided via props
  });

  // Use provided matches or fetched matches
  const matches = propMatches ?? fetchedMatches ?? [];

  // ⬇️ NEW: keep only matches in the current month
  const monthMatches = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return matches.filter((m) => {
      const d = new Date(m.date);
      // guard against invalid dates
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [matches]);

  // Use derived statuses (not raw) so donut matches your list page
  const { data, total } = useMemo(() => {
    const counts: Record<Canon, number> = {
      not_started: 0, upcoming: 0, live: 0, ended: 0,
    };
    monthMatches.forEach((m) => {
      const k = deriveStatus(m);
      counts[k] += 1;
    });
    const total = ORDER.reduce((s, k) => s + counts[k], 0);
    const data = ORDER
      .map((k) => ({ name: k, value: counts[k], color: COLORS[k] }))
      .filter((d) => d.value > 0);
    return { data, total };
  }, [monthMatches]);

  // Feature LIVE % if present; else largest slice
  const featured =
    data.find((d) => d.name === "live") ||
    data.reduce((max, d) => (d.value > (max?.value ?? -1) ? d : max), data[0] || { name: "ended", value: 0, color: COLORS.ended });
  const pct = total ? Math.round((featured.value / total) * 100) : 0;

  // Inline Add Match dialog (unchanged)
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: referees } = useQuery({ queryKey: ["referees"], queryFn: getReferees });
 const { data: balls = [] } = useQuery({
    queryKey: ["balls"],
    queryFn: getBalls,
  });
  const handleSubmit = async (form: InsertMatch) => {
    try {
      const matchData: any = {
        venue: form.venue,
        date: form.date,
        league: form.league,
        status: form.status,
        matchCode: form.matchCode,
        homeTeam: { name: form.homeTeam.name, logo: form.homeTeam.logo || "" },
        awayTeam: { name: form.awayTeam.name, logo: form.awayTeam.logo || "" },
        mainReferee: { id: form.mainReferee.id, name: form.mainReferee.name, image: form.mainReferee.image || "" },
        assistantReferee1: form.assistantReferee1
          ? { id: form.assistantReferee1.id, name: form.assistantReferee1.name, image: form.assistantReferee1.image || "" }
          : undefined,
        assistantReferee2: form.assistantReferee2
          ? { id: form.assistantReferee2.id, name: form.assistantReferee2.name, image: form.assistantReferee2.image || "" }
          : undefined,
      };
      await createMatch(matchData);
      toast({ title: "Match created successfully" });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      let errorMessage = "Failed to create match";
      if (e?.code === "DUPLICATE_MATCH_SAME_VENUE_TIME") {
        errorMessage = "A match already exists at this venue, date, and time";
      } else if (e?.code === "DUPLICATE_MATCH") {
        errorMessage = "Match already exists";
      } else if (e?.code === "DUPLICATE_MATCH_DIFFERENT_VENUE") {
        errorMessage = "A match with the same teams at the same time already exists at a different venue";
      } else if (e?.code === "DUPLICATE_MATCH_SAME_TEAM") {
        errorMessage = "A match with the same team at the same venue, date, and time already exists";
      } else if (e?.message) {
        errorMessage = e.message;
      }
      toast({ variant: "destructive", title: "Failed to create match", description: errorMessage });
    }
  };

  return (
    <Card className="bg-[#212121] border border-[#3b3b3b] rounded-xl shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">Matches by Status (This Month)</CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="w-full h-36 md:h-44">
          {isLoading ? (
            <div className="text-gray-300 flex items-center justify-center h-full">Loading...</div>
          ) : error ? (
            <div className="text-red-400 flex items-center justify-center h-full">Failed to load chart.</div>
          ) : total === 0 ? (
            <div className="text-gray-300 flex items-center justify-center h-full">No matches this month.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={2}
                  minAngle={3}
                  labelLine={false}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#1f1f1f" />
                  ))}
                  <Label
                    value={`${pct}%`}
                    position="center"
                    fill="#e5e7eb"
                    style={{ fontSize: 18, fontWeight: 700 }}
                  />
                </Pie>
                <Tooltip
                  formatter={(v: any, n: any) => [v, title(n as string)]}
                  contentStyle={{ background: "#2b2b2b", border: "1px solid #3b3b3b", color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {total > 0 && (
          <p className="mt-2 text-center text-xs text-gray-300">
            {title(featured.name)} • {featured.value} of {total}
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          {ORDER.map((k) => {
            const item = data.find((d) => d.name === k);
            if (!item) return null;
            return (
              <div
                key={k}
                className="flex items-center justify-between rounded-md bg-[#2b2b2b] border border-[#3b3b3b] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[k] }} />
                  <span className="text-xs text-gray-200">{title(k)}</span>
                </div>
                <span className="text-xs text-gray-300">{item.value}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <Button onClick={() => setOpen(true)} className="w-full bg-[#6ab100] hover:bg-[#5a9700]">
            <Plus className="mr-2 h-4 w-4" />
            Add Match
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[#212121] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-[#212121] pb-4 z-10">
              <DialogTitle>Add New Match</DialogTitle>
              <DialogDescription className="text-gray-400">
                Fill in the match details below.
              </DialogDescription>
            </DialogHeader>
            <div className="px-1">
              <MatchForm onSubmit={handleSubmit} defaultValues={undefined} referees={referees} balls={balls} />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
