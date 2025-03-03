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
import { Match } from '@shared/schema';
import { getMatches, createMatch, updateMatch, deleteMatch, getReferees } from '@/lib/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '@/lib/useNotifications';

export default function Matches() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const { data: matches = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches
  });

  const { data: referees = [], isLoading: isLoadingReferees } = useQuery({
    queryKey: ['referees'],
    queryFn: getReferees
  });

  const handleSubmit = async (data: Omit<Match, 'id'>) => {
    try {
      if (selectedMatch) {
        await updateMatch(selectedMatch.id!, data);
        toast({ title: 'Match updated successfully' });
        await addNotification(`Match ${data.homeTeam} vs ${data.awayTeam} has been updated`);
      } else {
        await createMatch(data);
        toast({ title: 'Match created successfully' });
        await addNotification(`New match added: ${data.homeTeam} vs ${data.awayTeam}`);
      }
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setIsDialogOpen(false);
      setSelectedMatch(null);
    } catch (error) {
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
      await addNotification(`Match ${matchToDelete.homeTeam} vs ${matchToDelete.awayTeam} has been deleted`);
      setMatchToDelete(null);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: 'Failed to delete match',
        description: 'Please try again' 
      });
    }
  };

  const handleEdit = (match: Match) => {
    setSelectedMatch(match);
    setIsDialogOpen(true);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onEdit={handleEdit}
              onDelete={() => setMatchToDelete(match)}
            />
          ))}
          {matches.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400">
              No matches found. Add your first match by clicking the "Add Match" button.
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-[#212121] text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 bg-[#212121] pb-4 z-10">
              <DialogTitle>
                {selectedMatch ? 'Edit Match' : 'Add New Match'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-1">
              <MatchForm
                onSubmit={handleSubmit}
                defaultValues={selectedMatch || undefined}
                referees={referees}
              />
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
          <AlertDialogContent className="bg-[#212121] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete the match between {matchToDelete?.homeTeam} and {matchToDelete?.awayTeam}? This action cannot be undone.
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