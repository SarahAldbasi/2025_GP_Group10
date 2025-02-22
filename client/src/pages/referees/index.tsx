import { useState, useEffect } from 'react';
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
  subscribeToReferees,
  createReferee, 
  updateReferee, 
  deleteReferee,
  type Referee 
} from '@/lib/firestore';

export default function Referees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToReferees((updatedReferees) => {
      setReferees(updatedReferees);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClose = () => {
    setIsDialogOpen(false);
    setSelectedReferee(null);
    setIsSubmitting(false);
  };

  const showSuccessToast = (message: string) => {
    setTimeout(() => {
      toast({ title: message });
    }, 100);
  };

  const handleCreate = async (data: Omit<Referee, 'id'>) => {
    try {
      setIsSubmitting(true);
      await createReferee(data);
      handleClose();
      showSuccessToast('Referee added successfully');
    } catch (error) {
      console.error('Error creating referee:', error);
      toast({ 
        variant: "destructive",
        title: 'Error adding referee',
        description: 'Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Referee) => {
    try {
      setIsSubmitting(true);
      const { id, ...updateData } = data;
      await updateReferee(id!, updateData);
      handleClose();
      showSuccessToast('Referee updated successfully');
    } catch (error) {
      console.error('Error updating referee:', error);
      toast({ 
        variant: "destructive",
        title: 'Error updating referee',
        description: 'Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReferee(id);
      showSuccessToast('Referee deleted successfully');
    } catch (error) {
      console.error('Error deleting referee:', error);
      toast({ 
        variant: "destructive",
        title: 'Error deleting referee',
        description: 'Please try again later.'
      });
    }
  };

  const handleSubmit = async (data: Omit<Referee, 'id'>) => {
    if (selectedReferee) {
      await handleUpdate({ ...data, id: selectedReferee.id! });
    } else {
      await handleCreate(data);
    }
  };

  const handleEdit = (referee: Referee) => {
    setSelectedReferee(referee);
    setIsDialogOpen(true);
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
              onDelete={handleDelete}
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
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}