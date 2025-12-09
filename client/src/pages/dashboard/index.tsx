"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/useAuth";

import MatchesByStatusPie from "@/components/dashboard/MatchesByStatusPie";
import MatchesList from "@/components/dashboard/MatchesList";
import RefereeTreemapCard from "@/components/dashboard/RefereeTreemapCard";
import VerificationRequests from "@/components/referees/VerificationRequests";
import RefereeRosterCalendar from "@/components/referees/RefereeRosterCalendar";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useQuery } from "@tanstack/react-query";
import { getMatches, type Match } from "@/lib/firestore";

// Import your UI components for Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalMatches: 0, upcomingMatches: 0, activeReferees: 0 });

  const { data: matches = [] } = useQuery<Match[]>({ queryKey: ["matches"], queryFn: getMatches });

  // ===== Filters =====
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedBall, setSelectedBall] = useState("all");
  const [leagueSearch, setLeagueSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [refereeSearch, setRefereeSearch] = useState("");

  // ===== Ball options =====
  const ballOptions = useMemo(() => {
    const allBallIds = matches.flatMap((m: any) => (m.balls?.map((b: any) => b.ballId) || []));
    return Array.from(new Set(allBallIds));
  }, [matches]);

  // ===== Filtered matches =====
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const statusMatch = selectedStatus === "all" ? true : m.status === selectedStatus;
      const teamMatch = teamSearch
        ? m.homeTeam?.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
          m.awayTeam?.name.toLowerCase().includes(teamSearch.toLowerCase())
        : true;
      const leagueMatch = leagueSearch ? m.league?.toLowerCase().includes(leagueSearch.toLowerCase()) : true;
      const ballMatch = selectedBall === "all" ? true : (m as any).balls?.some((b: any) => b.ballId === selectedBall);
      const refereeMatch = refereeSearch
        ? [m.mainReferee?.name, m.assistantReferee1?.name, m.assistantReferee2?.name].some((r) =>
            r?.toLowerCase().includes(refereeSearch.toLowerCase())
          )
        : true;

      return statusMatch && teamMatch && leagueMatch && ballMatch && refereeMatch;
    });
  }, [matches, selectedStatus, selectedBall, leagueSearch, teamSearch, refereeSearch]);
console.log(matches ,"matches");

  // ===== PDF Export =====
  const exportMatchesAsPDF = () => {
    if (!filteredMatches.length) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Matches & Referees Report", 14, 15);

    const rows = filteredMatches.map((m) => {
      const date = (m.date as any)?.toDate ? (m.date as any).toDate() : new Date(m.date || new Date());
      const ballIds = (m as any).balls?.map((b: any) => b.ballId).join(", ") || "-";
      return [
        m.league || "-",
        m.homeTeam?.name || "-",
        m.awayTeam?.name || "-",
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        m.status || "—",
        m.mainReferee?.name || "-",
        m.assistantReferee1?.name || "-",
        m.assistantReferee2?.name || "-",
        ballIds,
      ];
    });

    autoTable(doc, {
      head: [["League","Home Team","Away Team","Date","Time","Status","Main Referee","Assistant 1","Assistant 2","Ball IDs"]],
      body: rows,
      startY: 25,
      styles: { fontSize: 9 },
    });

    doc.save("matches_referees.pdf");
  };

  // ===== Stats fetch =====
  useEffect(() => {
    if (!user) return;

    const matchesUnsub = onSnapshot(collection(db, "matches"), (snapshot) => {
      const allMatches = snapshot.docs.map((doc) => doc.data());
      setStats(prev => ({ ...prev, totalMatches: allMatches.length, upcomingMatches: allMatches.filter((m: any) => m.status === "scheduled").length }));
    });

    const refereesUnsub = onSnapshot(query(collection(db, "users"), where("role", "==", "referee"), where("isAvailable", "==", true)), snapshot => {
      setStats(prev => ({ ...prev, activeReferees: snapshot.docs.length }));
    });

    return () => { matchesUnsub(); refereesUnsub(); };
  }, [user]);

  const row1Cell = "md:col-span-4 [&>*]:h-full [&>*]:min-h-[240px]";
  const treemapCell = "md:col-span-5 [&>*]:h-full [&>*]:min-h-[280px]";
  const calendarCell = "md:col-span-7 [&>*]:h-full [&>*]:min-h-[420px]";

  return (
    <DashboardLayout compact>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        
        </div>

    <div className="flex items-center justify-between">
          {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status */}
          <div className="flex items-center space-x-2">
            <Label className="text-white text-xl">Status:</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className=" text-xl w-[140px] bg-[#2b2b2b] text-white border-[#3b3b3b]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "not_started", "live", "ended" ].map((status) => (
                  <SelectItem key={status} value={status}>{status === "all" ? "All Status" : status.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balls */}
          {/* <div className="flex items-center space-x-2">
            <Label className="text-white text-xl">Ball:</Label>
            <Select value={selectedBall} onValueChange={setSelectedBall}>
              <SelectTrigger className="text-xl w-[140px] bg-[#2b2b2b] text-white border-[#3b3b3b]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balls</SelectItem>
                {ballOptions.map((ball) => <SelectItem key={ball} value={ball}>{ball}</SelectItem>)}
              </SelectContent>
            </Select>
          </div> */}

            {/* Team */}
          <div className="flex items-center space-x-2">
            <Label className="text-white text-xl">Team:</Label>
            <input  type="text" placeholder="Search Team" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} className="p-2 border rounded-xl bg-[#212121] text-white placeholder-gray-400 "/>
          </div>

          {/* Referee */}
          <div className="flex items-center space-x-2">
            <Label className="text-white text-xl">Referee:</Label>
            <input  type="text" placeholder="Search Referee" value={refereeSearch} onChange={e => setRefereeSearch(e.target.value)} className="p-2 border rounded-xl bg-[#212121] text-white placeholder-gray-400 "/>
          </div>

          {/* League */}
          <div className="flex items-center space-x-2">
            <Label className="text-white text-xl">League:</Label>
            <input  type="text" placeholder="Search League" value={leagueSearch} onChange={e => setLeagueSearch(e.target.value)} className="p-2 border rounded-xl bg-[#212121] text-white placeholder-gray-400 "/>
          </div>

        
        </div>
        <div>
            <button onClick={exportMatchesAsPDF} className="px-4 py-2 bg-[#6ab100] hover:bg-[#5a9700] rounded-xl">
            Download PDF
          </button>
        </div>
    </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className={row1Cell}>
            <MatchesList title="Next Week's Matches" range="nextWeek" matches={filteredMatches} />
          </div>

          <div className={row1Cell}>
            <MatchesList title="Past Week's Matches" range="pastWeek" matches={filteredMatches} />
          </div>

          <div className={`${row1Cell} [&>*]:h-full`}>
            <MatchesByStatusPie matches={filteredMatches} />
          </div>

          <div className={treemapCell}>
            <RefereeTreemapCard />
          </div>

          <div className={calendarCell}>
            <Card className="bg-[#212121] h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-white">Referees Calendar</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4"><RefereeRosterCalendar matches={filteredMatches} /></CardContent>
            </Card>
          </div>

          <Card className="md:col-span-12 bg-[#212121]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Pending Verification Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <VerificationRequests showOnlyPending />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
