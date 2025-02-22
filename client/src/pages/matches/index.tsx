import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Match, InsertMatch } from '@shared/schema';

export default function Matches() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ['/api/matches']
  });

  const createMutation = useMutation({
    mutationFn: (match: InsertMatch) =>
      apiRequest('POST', '/api/matches', match),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      setIsDialogOpen(false);
      toast({ title: 'Match created successfully' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (match: Match) =>
      apiRequest('PATCH', `/api/matches/${match.id}`, match),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      setIsDialogOpen(false);
      setSelectedMatch(null);
      toast({ title: 'Match updated successfully' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/matches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({ title: 'Match deleted successfully' });
    }
  });

  const handleEdit = (match: Match) => {
    setSelectedMatch(match);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertMatch) => {
    if (selectedMatch) {
      updateMutation.mutate({ ...data, id: selectedMatch.id });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#6ab100]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Match
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches?.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#212121] text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedMatch ? 'Edit Match' : 'Add New Match'}
            </DialogTitle>
          </DialogHeader>
          <MatchForm
            onSubmit={handleSubmit}
            defaultValues={selectedMatch || undefined}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
