import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  isValid,
} from "date-fns";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import type { Match as FirestoreMatch } from "@/lib/firestore";

/** Firestore-friendly loose types */
type RefLike = { id?: string; name?: string; role?: "main" | "assistant1" | "assistant2" | string };
type Team = { name?: string; logo?: string };
type Match = FirestoreMatch | {
  id?: string;
  date: any; // Timestamp | string | number | Date
  homeTeam?: Team;
  awayTeam?: Team;
  mainReferee?: RefLike | null;
  assistantReferee1?: RefLike | null;
  assistantReferee2?: RefLike | null;
};

type ViewMode = "month" | "week";

function normalizeDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isValid(input) ? input : null;
  if (typeof input?.toDate === "function") {
    const d = input.toDate();
    return isValid(d) ? d : null;
  }
  if (typeof input === "object" && input?.seconds != null) {
    const ms = input.seconds * 1000 + Math.floor((input.nanoseconds ?? 0) / 1e6);
    const d = new Date(ms);
    return isValid(d) ? d : null;
  }
  if (typeof input === "string") {
    const iso = parseISO(input);
    if (isValid(iso)) return iso;
    const d = new Date(input);
    return isValid(d) ? d : null;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isValid(d) ? d : null;
  }
  return null;
}

interface RefereeRosterCalendarProps {
  matches?: Match[];
}

export default function RefereeRosterCalendar({ matches: propMatches }: RefereeRosterCalendarProps = {}) {
  const [fetchedMatches, setFetchedMatches] = useState<Match[]>([]);
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const today = new Date();

  // Use provided matches or fetch from Firestore
  const matches = propMatches ?? fetchedMatches;

  // Live matches (only fetch if matches not provided via props)
  useEffect(() => {
    if (propMatches) return; // Don't fetch if matches provided via props
    
    const unsub = onSnapshot(collection(db, "matches"), (snap) => {
      setFetchedMatches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [propMatches]);

  // Range of days to render
  const days = useMemo(() => {
    const rangeStart =
      view === "week"
        ? startOfWeek(anchor, { weekStartsOn: 0 })
        : startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const rangeEnd =
      view === "week"
        ? endOfWeek(anchor, { weekStartsOn: 0 })
        : endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });

    const arr: Date[] = [];
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [anchor, view]);

  // Break into weeks (for month grid)
  const weeks: Date[][] = useMemo(() => {
    const out: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [days]);

  // Aggregate per day -> refs & counts
  type DayEntry = {
    byRef: Map<string, { name: string; roles: Set<string>; count: number }>;
    total: number;
  };
  const dayAssignments = useMemo(() => {
    const map = new Map<string, DayEntry>();

    const addRef = (dayKey: string, ref?: RefLike | null, role?: string) => {
      if (!ref?.id && !ref?.name) return;
      const id = ref.id || ref.name || "unknown";
      const name = ref.name || "Unnamed";
      const entry = map.get(dayKey) ?? { byRef: new Map(), total: 0 };
      const refEntry = entry.byRef.get(id) ?? { name, roles: new Set<string>(), count: 0 };
      if (role) refEntry.roles.add(role);
      refEntry.count += 1;
      entry.byRef.set(id, refEntry);
      entry.total += 1;
      map.set(dayKey, entry);
    };

    for (const m of matches) {
      const when =
        normalizeDate(m.date) ??
        normalizeDate((m as any).start) ??
        normalizeDate((m as any).startTime);
      if (!when) continue;
      const key = format(when, "yyyy-MM-dd");
      addRef(key, m.mainReferee, "main");
      addRef(key, m.assistantReferee1, "assistant1");
      addRef(key, m.assistantReferee2, "assistant2");
    }
    return map;
  }, [matches]);

  const roleLabel = (x: string) =>
    x === "main" ? "Main" : x === "assistant1" ? "AR1" : x === "assistant2" ? "AR2" : x;

  /** ---------- MONTH CELL (hover details) ---------- */
  const renderMonthCell = (d: Date) => {
    const isToday = isSameDay(d, today);
    const inMonth = d.getMonth() === anchor.getMonth();
    const key = format(d, "yyyy-MM-dd");
    const entry = dayAssignments.get(key);
    const total = entry?.total ?? 0;

    const popText =
      total === 0
        ? "No assignments"
        : Array.from(entry!.byRef.values())
            .map((r) => `${r.name} (${Array.from(r.roles).map(roleLabel).join(", ")}) ×${r.count}`)
            .join("\n");

    return (
      <div
        key={key}
        className={`relative group border-r border-b border-[#2a2a2a] p-2 h-24 ${
          inMonth ? "bg-transparent" : "bg-black/20"
        }`}
      >
        <div className="flex items-start justify-between">
          <span className={`text-xs ${inMonth ? "text-gray-200" : "text-gray-500"} ${isToday ? "font-bold" : ""}`}>
            {format(d, "d")}
          </span>
        <span
            className={`text-[11px] rounded px-1.5 py-[2px] ${
              total > 0 ? "bg-lime-500/20 text-lime-300 border border-lime-500/50" : "text-gray-500"
            }`}
            title={popText}
          >
            {total > 0 ? `${total}` : "·"}
          </span>
        </div>

        {/* Hover panel */}
        <div className="hidden group-hover:block absolute z-20 left-2 top-7 min-w-[240px] max-w-[320px] rounded-md border border-[#2a2a2a] bg-[#101010] shadow-xl p-2">
          <div className="text-xs text-gray-300 mb-1">{format(d, "EEEE, MMM d")}</div>
          {total === 0 ? (
            <div className="text-xs text-gray-500">No assignments</div>
          ) : (
            <ul className="space-y-1">
              {Array.from(entry!.byRef.values()).map((r) => (
                <li key={r.name} className="text-xs text-gray-200">
                  {r.name}{" "}
                  <span className="text-[10px] text-gray-400">
                    ({Array.from(r.roles).map(roleLabel).join(", ")})
                  </span>
                  {r.count > 1 ? <span className="text-[10px] text-gray-400"> • {r.count} matches</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  /** ---------- WEEK ROWS (planner style with HORIZONTAL SCROLL) ---------- */
  const renderWeekRows = () => {
    const firstWeek = weeks[0]; // weekly mode has a single week
    return (
      <div className="divide-y divide-[#2a2a2a]">
        {firstWeek.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const entry = dayAssignments.get(key);
          const total = entry?.total ?? 0;

          return (
            <div key={key} className="grid grid-cols-[140px_1fr]">
              {/* Left label */}
              <div className="border-r border-[#2a2a2a] px-3 py-3 bg-[#151515]">
                <div className="text-sm text-gray-200 font-medium">{format(d, "EEEE")}</div>
                <div className="text-[11px] text-gray-400">{format(d, "MMM d")}</div>
              </div>

              {/* Right content: min-w-0 is CRITICAL so overflow-x works */}
              <div className="px-3 py-3 min-h-[84px] min-w-0">
                {total === 0 ? (
                  <div className="text-sm text-gray-500">No assignments</div>
                ) : (
                  <div className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden pr-2 scrollbar-fade-muted">
                    {Array.from(entry!.byRef.values()).map((r) => (
                      <span
                        key={r.name}
                        className="shrink-0 inline-flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#131313] px-3 py-1.5 text-[13px] leading-tight"
                        title={`${r.name} • ${Array.from(r.roles).map(roleLabel).join(", ")}${r.count > 1 ? ` • ${r.count} matches` : ""}`}
                      >
                        <span className="text-gray-200">{r.name}</span>
                        <span className="text-gray-400 text-[11px]">
                          {Array.from(r.roles).map(roleLabel).join(", ")}
                          {r.count > 1 ? ` • ${r.count}` : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-white/90 font-semibold">
          {view === "week" ? format(anchor, "MMMM d, yyyy") : format(anchor, "MMMM yyyy")}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            className="border-[#3b3b3b] text-gray-200 hover:bg-[#2a2a2a]"
            onClick={() => setAnchor(view === "week" ? addDays(anchor, -7) : subMonths(anchor, 1))}
          >
            ◀
          </Button>
          <Button
            variant="outline"
            className="border-[#3b3b3b] text-gray-200 hover:bg-[#2a2a2a]"
            onClick={() => setAnchor(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            className="border-[#3b3b3b] text-gray-200 hover:bg-[#2a2a2a]"
            onClick={() => setAnchor(view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1))}
          >
            ▶
          </Button>
          <div className="w-px bg-[#3b3b3b] mx-1" />
          <Button
            variant={view === "week" ? "default" : "outline"}
            className={view === "week" ? "bg-[#2a2a2a] text-white" : "border-[#3b3b3b] text-gray-200"}
            onClick={() => setView("week")}
          >
            Weekly
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            className={view === "month" ? "bg-[#2a2a2a] text-white" : "border-[#3b3b3b] text-gray-200"}
            onClick={() => setView("month")}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Calendar container */}
      <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
        {view === "month" ? (
          <>
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                <div key={w} className="px-3 py-2 text-xs font-medium text-gray-300 text-center">
                  {w}
                </div>
              ))}
            </div>

            {/* 6x7 month grid */}
            <div className="grid grid-rows-6">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map((d) => renderMonthCell(d))}
                </div>
              ))}
            </div>
          </>
        ) : (
          // WEEKLY: planner-style rows with horizontal-scroll chips
          renderWeekRows()
        )}
      </div>

      <div className="mt-2 text-xs text-gray-400">
        • Month: hover a day to see referees • Week: chips scroll horizontally
      </div>
    </div>
  );
}
