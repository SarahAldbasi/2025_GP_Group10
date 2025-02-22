import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RefereeCard from '@/components/referees/RefereeCard';
import RefereeForm from '@/components/referees/RefereeForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getReferees, 
  createReferee, 
  updateReferee, 
  deleteReferee,
  type Referee 
} from '@/lib/firestore';

export default function Referees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: referees = [], isLoading } = useQuery({
    queryKey: ['referees'],
    queryFn: getReferees,
  });

  const createMutation = useMutation({
    mutationFn: createReferee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referees'] });
      setIsDialogOpen(false);
      toast({ title: 'Referee added successfully' });
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast({ 
        variant: "destructive",
        title: 'Error adding referee',
        description: 'Please try again later.'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Referee) => {
      const { id, ...updateData } = data;
      await updateReferee(id!, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referees'] });
      setIsDialogOpen(false);
      setSelectedReferee(null);
      toast({ title: 'Referee updated successfully' });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({ 
        variant: "destructive",
        title: 'Error updating referee',
        description: 'Please try again later.'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReferee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referees'] });
      toast({ title: 'Referee deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({ 
        variant: "destructive",
        title: 'Error deleting referee',
        description: 'Please try again later.'
      });
    }
  });

  const handleEdit = (referee: Referee) => {
    setSelectedReferee(referee);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: Omit<Referee, 'id'>) => {
    if (selectedReferee) {
      await updateMutation.mutateAsync({ ...data, id: selectedReferee.id! });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedReferee(null);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Referees</h1>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#6ab100]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Referee
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-lg text-gray-400">Loading referees...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {referees.map((referee) => (
            <RefereeCard
              key={referee.id}
              referee={referee}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
          {referees.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400">
              No referees found. Add your first referee by clicking the "Add Referee" button.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-[#212121] text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedReferee ? 'Edit Referee' : 'Add New Referee'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the referee's details below.
            </DialogDescription>
          </DialogHeader>
          <RefereeForm
            onSubmit={handleSubmit}
            defaultValues={selectedReferee || undefined}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}