import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MatchCard from '@/components/matches/MatchCard';
import MatchForm from '@/components/matches/MatchForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { InsertMatch } from '@shared/schema';
import { getMatches, createMatch, updateMatch, deleteMatch, getReferees } from '@/lib/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/lib/useNotifications';

export default function Matches() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<InsertMatch & { id?: string } | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<InsertMatch & { id?: string } | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const { data: matchesData = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches
  });

  // Get unique leagues from matches data
  const leagues = ['all', ...new Set(matchesData.map(match => match.league))];

  // Update match status based on date
  const currentTime = new Date().getTime();

  // Calculate upcoming window (3 days from now)
  const threeDaysFromNow = currentTime + (3 * 24 * 60 * 60 * 1000);

  // Define status priority for sorting with appropriate type
  const statusPriority: Record<string, number> = {
    live: 0,
    upcoming: 1,
    not_started: 2,
    ended: 3
  };

  // Update statuses and filter by league
  const matches = [...matchesData]
    .map(match => {
      // Create a deep copy to avoid modifying the original data
      const matchCopy = { ...match };
      const matchDate = new Date(match.date);
      const matchTime = matchDate.getTime();

      // If the match date is in the past and status is not already "ended" or "live", update to "ended"
      if (matchTime < currentTime && match.status !== 'ended' && match.status !== 'live') {
        matchCopy.status = 'ended';
      } 
      // Mark matches within 3 days as upcoming if they're not already ended or live
      else if (matchTime > currentTime && matchTime <= threeDaysFromNow && match.status !== 'ended' && match.status !== 'live') {
        matchCopy.status = 'upcoming';
      }

      return matchCopy;
    })
    .filter(match => selectedLeague === 'all' || match.league === selectedLeague)
    .sort((a, b) => {
      // First sort by status priority
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then sort by date within the same status
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

  // Group matches by status for divider rendering
  const matchGroups = matches.reduce<Record<string, (InsertMatch & { id?: string })[]>>((groups, match) => {
    if (!groups[match.status]) {
      groups[match.status] = [];
    }
    groups[match.status].push(match as (InsertMatch & { id?: string }));
    return groups;
  }, {});

  const { data: referees = [], isLoading: isLoadingReferees } = useQuery({
    queryKey: ['referees'],
    queryFn: getReferees
  });

  const handleSubmit = async (data: InsertMatch) => {
    try {
      // Format the match data properly
      const matchData = {
        venue: data.venue,
        date: data.date,
        league: data.league,
        status: data.status,
        homeTeam: {
          name: typeof data.homeTeam === 'string' ? data.homeTeam : data.homeTeam.name,
          logo: typeof data.homeTeam === 'string' ? undefined : data.homeTeam.logo
        },
        awayTeam: {
          name: typeof data.awayTeam === 'string' ? data.awayTeam : data.awayTeam.name,
          logo: typeof data.awayTeam === 'string' ? undefined : data.awayTeam.logo
        },
        mainReferee: {
          id: typeof data.mainReferee === 'string' ? data.mainReferee : data.mainReferee.id,
          name: typeof data.mainReferee === 'string' ? data.mainReferee : data.mainReferee.name,
          image: '' // Add default empty string for image property
        },
        assistantReferee1: data.assistantReferee1 ? {
          id: typeof data.assistantReferee1 === 'string' ? data.assistantReferee1 : data.assistantReferee1.id,
          name: typeof data.assistantReferee1 === 'string' ? data.assistantReferee1 : data.assistantReferee1.name,
          image: '' // Add default empty string for image property
        } : undefined,
        assistantReferee2: data.assistantReferee2 ? {
          id: typeof data.assistantReferee2 === 'string' ? data.assistantReferee2 : data.assistantReferee2.id,
          name: typeof data.assistantReferee2 === 'string' ? data.assistantReferee2 : data.assistantReferee2.name,
          image: '' // Add default empty string for image property
        } : undefined
      };

      if (selectedMatch) {
        // Update existing match
        await updateMatch(selectedMatch.id!, matchData);
        toast({ title: 'Match updated successfully' });
        // Removed duplicate notification here as it's handled in firestore.ts
      } else {
        // Create new match
        await createMatch(matchData);
        toast({ title: 'Match created successfully' });
        // Removed duplicate notification here as it's handled in firestore.ts
      }

      queryClient.invalidateQueries({ queryKey: ['matches'] });
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving match:', error);
      toast({ 
        variant: "destructive", 
        title: 'Operation failed',
        description: 'Please try again' 
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete?.id) return;

    try {
      await deleteMatch(matchToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast({ title: 'Match deleted successfully' });
      await addNotification(`Match ${matchToDelete.homeTeam.name} vs ${matchToDelete.awayTeam.name} has been deleted`);
      setMatchToDelete(null);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: 'Failed to delete match',
        description: 'Please try again' 
      });
    }
  };

  // Helper function to format match data for MatchCard component
  const formatMatchForCard = (match: any & { id?: string }) => {
    return {
      ...match,
      // Ensure homeTeam and awayTeam are objects with name and logo properties
      homeTeam: typeof match.homeTeam === 'string' 
        ? { name: match.homeTeam, logo: '' } 
        : match.homeTeam,
      awayTeam: typeof match.awayTeam === 'string' 
        ? { name: match.awayTeam, logo: '' } 
        : match.awayTeam,
      // Ensure mainReferee is an object with id, name, and image properties
      mainReferee: typeof match.mainReferee === 'string'
        ? { id: match.mainReferee, name: match.mainReferee, image: '' }
        : match.mainReferee,
      // Ensure assistantReferee1 and assistantReferee2 are objects or undefined
      assistantReferee1: match.assistantReferee1 
        ? (typeof match.assistantReferee1 === 'string'
          ? { id: match.assistantReferee1, name: match.assistantReferee1, image: '' }
          : match.assistantReferee1)
        : undefined,
      assistantReferee2: match.assistantReferee2
        ? (typeof match.assistantReferee2 === 'string'
          ? { id: match.assistantReferee2, name: match.assistantReferee2, image: '' }
          : match.assistantReferee2)
        : undefined,
    };
  };

  const handleEdit = (match: InsertMatch & { id?: string }) => {
    // Format the match data for the form component
    const formattedMatch = {
      ...match,
      id: match.id
    };

    setSelectedMatch(formattedMatch);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMatch(null);
  };

  const isLoading = isLoadingMatches || isLoadingReferees;

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
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#6ab100] hover:bg-[#5a9700]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Match
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center">
            <label htmlFor="league-filter" className="mr-3 text-white font-medium">
              Filter by League:
            </label>
            <select
              id="league-filter"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-[#2b2b2b] text-white border border-[#3b3b3b] rounded-lg p-2 min-w-[180px]"
            >
              {leagues.map((league) => (
                <option key={league} value={league}>
                  {league === 'all' ? 'All Leagues' : league}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {matches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {selectedLeague === 'all' 
                ? "No matches found. Add your first match by clicking the \"Add Match\" button."
                : `No matches found in the ${selectedLeague} league. Try another league or add a new match.`}
            </div>
          ) : (
            <>
              {/* Live Matches */}
              {matchGroups.live && matchGroups.live.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Live</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchGroups.live.map((match) => {
                      const formattedMatch = formatMatchForCard(match);
                      return (
                        <MatchCard
                          key={match.id}
                          match={formattedMatch}
                          onEdit={handleEdit}
                          onDelete={() => setMatchToDelete(formattedMatch)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Matches */}
              {matchGroups.upcoming && matchGroups.upcoming.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Upcoming</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchGroups.upcoming.map((match) => {
                      const formattedMatch = formatMatchForCard(match);
                      return (
                        <MatchCard
                          key={match.id}
                          match={formattedMatch}
                          onEdit={handleEdit}
                          onDelete={() => setMatchToDelete(formattedMatch)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Not Started Matches */}
              {matchGroups.not_started && matchGroups.not_started.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Scheduled Matches</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchGroups.not_started.map((match) => {
                      const formattedMatch = formatMatchForCard(match);
                      return (
                        <MatchCard
                          key={match.id}
                          match={formattedMatch}
                          onEdit={handleEdit}
                          onDelete={() => setMatchToDelete(formattedMatch)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ended Matches */}
              {matchGroups.ended && matchGroups.ended.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-white">Ended</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchGroups.ended.map((match) => {
                      const formattedMatch = formatMatchForCard(match);
                      return (
                        <MatchCard
                          key={match.id}
                          match={formattedMatch}
                          onEdit={handleEdit}
                          onDelete={() => setMatchToDelete(formattedMatch)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="bg-[#212121] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-[#212121] pb-4 z-10">
              <DialogTitle>
                {selectedMatch ? 'Edit Match' : 'Add New Match'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedMatch 
                  ? 'Update the match details below.' 
                  : 'Fill in the match details below to create a new match.'}
              </DialogDescription>
            </DialogHeader>
            <div className="px-1">
              <MatchForm
                onSubmit={handleSubmit}
                defaultValues={selectedMatch || undefined}
                referees={referees}
                key={selectedMatch ? selectedMatch.id : 'new'}
              />
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
          <AlertDialogContent className="bg-[#212121] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete the match between {matchToDelete?.homeTeam.name} and {matchToDelete?.awayTeam.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setMatchToDelete(null)}
                className="bg-[#2b2b2b] text-white hover:bg-[#363636]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}