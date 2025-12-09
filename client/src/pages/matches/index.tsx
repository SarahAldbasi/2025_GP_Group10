import { useState } from "react";
import { Plus, ArrowUpDown, Calendar } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MatchCard from "@/components/matches/MatchCard";
import MinimizedMatchCard from "@/components/matches/MinimizedMatchCard";
import MatchForm from "@/components/matches/MatchForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { InsertMatch } from "@shared/schema";
import {
  getMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  getReferees,
  getBalls,
} from "@/lib/firestore";
import { log } from "console";

export default function Matches() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<(InsertMatch & { id?: string }) | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<(InsertMatch & { id?: string }) | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: matchesData = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
  });


  // Filter out empty leagues to prevent SelectItem value="" error
  const leagues = [
    "all",
    ...Array.from(new Set(matchesData.map((match) => match.league).filter(Boolean))),
  ];

  const currentTime = new Date().getTime();
  const threeDaysFromNow = currentTime + 3 * 24 * 60 * 60 * 1000;

  const matches = [...matchesData]
    .map((match) => {
      const matchCopy = { ...match };
      const matchTime = new Date(match.date).getTime();

      // Only auto-set "upcoming" status for matches that haven't started yet but are within 3 days
      // All other statuses (live, ended, not_started) must be manually set by the user
      if (match.status === "not_started" || !match.status) {
        if (
          matchTime > currentTime &&
          matchTime <= threeDaysFromNow
        ) {
          matchCopy.status = "upcoming";
        }
      }

      return matchCopy;
    })
    .filter((match) => {
      if (selectedLeague !== "all" && match.league !== selectedLeague) return false;
      if (selectedStatus !== "all" && match.status !== selectedStatus) return false;

      if (dateFilter.from || dateFilter.to) {
        const matchDate = new Date(match.date);
        const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
        const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
        if (fromDate && matchDate < fromDate) return false;
        if (toDate && matchDate > toDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  const { data: referees = [], isLoading: isLoadingReferees } = useQuery({
    queryKey: ["referees"],
    queryFn: getReferees,
  });

  const { data: balls = [], isLoading: isLoadingBalls } = useQuery({
    queryKey: ["balls"],
    queryFn: getBalls,
  });
  console.log(balls ,"ballsballsballs");
  
  const isLoading = isLoadingMatches || isLoadingReferees || isLoadingBalls;

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMatch(null);
  };

 const handleSubmit = async (data: InsertMatch) => {
      console.log(data, 'payload', 'match payload')
  try {
    // Helper function to remove undefined values
    const cleanObject = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined && obj[key] !== null) {
          cleaned[key] = obj[key];
        }
      });
      return cleaned;
    };

    const matchData: any = {
      venue: data.venue,
      date: data.date,
      league: data.league,
      status: data.status,
      homeTeam: { name: data.homeTeam.name, logo: data.homeTeam.logo || "" },
      awayTeam: { name: data.awayTeam.name, logo: data.awayTeam.logo || "" },
      mainReferee: { id: data.mainReferee.id, name: data.mainReferee.name, image: data.mainReferee.image || "" },
      balls: data.balls || []
    };

    // Only add matchCode if it exists
    if (data.matchCode) {
      matchData.matchCode = data.matchCode;
    }

    // Only add assistant referees if they exist
    if (data.assistantReferee1) {
      matchData.assistantReferee1 = { 
        id: data.assistantReferee1.id, 
        name: data.assistantReferee1.name, 
        image: data.assistantReferee1.image || "" 
      };
    }

    if (data.assistantReferee2) {
      matchData.assistantReferee2 = { 
        id: data.assistantReferee2.id, 
        name: data.assistantReferee2.name, 
        image: data.assistantReferee2.image || "" 
      };
    }

    if (selectedMatch) {
      await updateMatch(selectedMatch.id!, matchData);
      toast({ title: "Match updated successfully" });
    } else {
      await createMatch(matchData);
      toast({ title: "Match created successfully" });
    }

    queryClient.invalidateQueries({ queryKey: ["matches"] });
    handleCloseDialog();
  } catch (error: any) {
    console.error(error);
    let errorMessage = "Please try again";
    if (error?.code === "DUPLICATE_MATCH") {
      errorMessage = "Match already exists";
    } else if (error?.code === "DUPLICATE_MATCH_DIFFERENT_VENUE") {
      errorMessage = "A match with the same teams at the same time already exists at a different venue";
    } else if (error?.code === "DUPLICATE_MATCH_SAME_TEAM") {
      errorMessage = "A match with the same team at the same venue, date, and time already exists";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    toast({ 
      variant: "destructive", 
      title: "Operation failed", 
      description: errorMessage 
    });
  }
};

  const handleConfirmDelete = async () => {
    if (!matchToDelete?.id) return;
    try {
      await deleteMatch(matchToDelete.id);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Match deleted successfully" });
      setMatchToDelete(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete match", description: "Please try again" });
    }
  };

  const formatMatchForCard = (match: any & { id?: string }) => {
    return {
      ...match,
      homeTeam: typeof match.homeTeam === "string" ? { name: match.homeTeam, logo: "" } : match.homeTeam,
      awayTeam: typeof match.awayTeam === "string" ? { name: match.awayTeam, logo: "" } : match.awayTeam,
      mainReferee:
        typeof match.mainReferee === "string"
          ? { id: match.mainReferee, name: match.mainReferee, image: "" }
          : match.mainReferee,
      assistantReferee1: match.assistantReferee1 || undefined,
      assistantReferee2: match.assistantReferee2 || undefined,
      balls: match.balls || [],
    };
  };

  const handleEdit = (match: InsertMatch & { id?: string }) => {
    // Convert "live" status back to "started" for the form (form expects "started", not "live")
    // The form displays "started" as "Live" but uses "started" as the value
    const formStatus = match.status === "live" ? "started" : match.status;
    
    setSelectedMatch({
      ...match,
      date: new Date(match.date),
      balls: match.balls || [],
      homeTeam: match.homeTeam || { id: 0, name: '', logo: '' },
      awayTeam: match.awayTeam || { id: 0, name: '', logo: '' },
      status: formStatus // Convert "live" to "started" for form compatibility
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-lg text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-8 pt-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Matches</h1>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#6ab100] hover:bg-[#5a9700]">
            <Plus className="mr-2 h-4 w-4" />
            Add Match
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* League Filter */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="league-filter" className="text-white font-medium">League:</Label>
              <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                <SelectTrigger className="w-[180px] bg-[#2b2b2b] text-white border-[#3b3b3b]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league} value={league}>
                      {league === "all" ? "All Leagues" : league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Label className="text-white font-medium">Status:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px] bg-[#2b2b2b] text-white border-[#3b3b3b]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["all", "live", "upcoming", "not_started", "ended"].map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Status" : status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center space-x-2">
              <Label className="text-white font-medium">Sort by Date:</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="bg-[#2b2b2b] border-[#3b3b3b] text-white hover:bg-[#3b3b3b]"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {sortOrder === "asc" ? "Oldest First" : "Newest First"}
              </Button>
            </div>

            {/* Date Range */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="bg-[#2b2b2b] border-[#3b3b3b] text-white hover:bg-[#3b3b3b]">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range
                  {(dateFilter.from || dateFilter.to) && (
                    <span className="ml-2 px-2 py-0.5 bg-[#6ab100] text-white text-xs rounded">Active</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#2b2b2b] border-[#3b3b3b]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">From Date</Label>
                    <Input type="date" value={dateFilter.from} onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))} className="bg-[#212121] border-[#3b3b3b] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">To Date</Label>
                    <Input type="date" value={dateFilter.to} onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))} className="bg-[#212121] border-[#3b3b3b] text-white" />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => { setDateFilter({ from: "", to: "" }); setIsFilterOpen(false); }} variant="outline" size="sm" className="flex-1 bg-[#3b3b3b] border-[#4b4b4b] text-white hover:bg-[#4b4b4b]">Clear</Button>
                    <Button onClick={() => setIsFilterOpen(false)} size="sm" className="flex-1 bg-[#6ab100] hover:bg-[#5a9700]">Apply</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Matches List */}
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {selectedLeague === "all" && !dateFilter.from && !dateFilter.to
                ? 'No matches found. Add your first match by clicking the "Add Match" button.'
                : "No matches found with the current filters. Try adjusting your filters or add a new match."}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-400 mb-4">
                Showing {matches.length} match{matches.length !== 1 ? "es" : ""} sorted by date ({sortOrder === "desc" ? "newest first" : "oldest first"})
              </div>
              {matches.map(match => {
                const formattedMatch = formatMatchForCard(match);
                return (
                  <MinimizedMatchCard
                    key={match.id}
                    match={formattedMatch}
                    // balls={balls} 
                    onEdit={() => handleEdit(formattedMatch)}
                    onDelete={() => setMatchToDelete(formattedMatch)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="bg-[#212121] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-[#212121] pb-4 z-10">
              <DialogTitle>{selectedMatch ? "Edit Match" : "Add New Match"}</DialogTitle>
              <DialogDescription className="text-gray-400">{selectedMatch ? "Update the match details below." : "Fill in the match details below to create a new match."}</DialogDescription>
            </DialogHeader>
            <div className="px-1">
              <MatchForm onSubmit={handleSubmit} defaultValues={selectedMatch || undefined} referees={referees} balls={balls} key={selectedMatch ? selectedMatch.id : "new"} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Alert */}
        <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
          <AlertDialogContent className="bg-[#212121] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete the match between {matchToDelete?.homeTeam.name} and {matchToDelete?.awayTeam.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMatchToDelete(null)} className="bg-[#2b2b2b] text-white hover:bg-[#363636]">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
