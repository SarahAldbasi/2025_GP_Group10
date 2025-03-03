import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/useAuth'; 
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RefereeCard from '@/components/referees/RefereeCard';
import RefereeForm from '@/components/referees/RefereeForm';
import VerificationRequests from '@/components/referees/VerificationRequests';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { 
  subscribeToUsers,
  createUser, 
  updateUser, 
  deleteUser,
  type User 
} from '@/lib/firestore';

export default function Referees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<User | null>(null);
  const [refereeToDelete, setRefereeToDelete] = useState<User | null>(null);
  const [referees, setReferees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); 

  useEffect(() => {
    if (!user) {
      setReferees([]);
      setIsLoading(false);
      return;
    }

    console.log('Setting up referees subscription with auth user:', user.uid);
    const unsubscribe = subscribeToUsers('referee', (updatedUsers) => {
      setReferees(updatedUsers);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]); 

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

  const handleCreate = async (data: Omit<User, 'id' | 'role' | 'uid'>) => {
    if (!user) {
      toast({ 
        variant: "destructive",
        title: 'Authentication required',
        description: 'Please sign in to perform this action.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createUser({
        ...data,
        role: 'referee',
        uid: `temp-${Date.now()}`, // This would normally come from Firebase Auth
        verificationStatus: 'pending'
      });
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

  const handleUpdate = async (data: User) => {
    if (!user) {
      toast({ 
        variant: "destructive",
        title: 'Authentication required',
        description: 'Please sign in to perform this action.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { id, ...updateData } = data;
      await updateUser(id!, updateData);
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
    if (!user) {
      toast({ 
        variant: "destructive",
        title: 'Authentication required',
        description: 'Please sign in to perform this action.'
      });
      return;
    }

    try {
      await deleteUser(id);
      showSuccessToast('Referee deleted successfully');
      setRefereeToDelete(null);
    } catch (error) {
      console.error('Error deleting referee:', error);
      toast({ 
        variant: "destructive",
        title: 'Error deleting referee',
        description: 'Please try again later.'
      });
    }
  };

  const handleSubmit = async (data: Omit<User, 'id' | 'role' | 'uid'>) => {
    if (selectedReferee) {
      await handleUpdate({ ...data, id: selectedReferee.id!, role: 'referee', uid: selectedReferee.uid });
    } else {
      await handleCreate(data);
    }
  };

  const handleEdit = (referee: User) => {
    setSelectedReferee(referee);
    setIsDialogOpen(true);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-lg text-gray-400">Please sign in to view and manage referees.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
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
                onDelete={() => setRefereeToDelete(referee)}
              />
            ))}
            {referees.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400">
                No referees found. Add your first referee by clicking the "Add Referee" button.
              </div>
            )}
          </div>
        )}

        <div className="mt-12">
          <VerificationRequests />
        </div>

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

        <AlertDialog open={!!refereeToDelete} onOpenChange={(open) => !open && setRefereeToDelete(null)}>
          <AlertDialogContent className="bg-[#212121] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to remove referee {refereeToDelete?.firstName} {refereeToDelete?.lastName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => setRefereeToDelete(null)}
                className="bg-[#2b2b2b] text-white hover:bg-[#363636]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => refereeToDelete?.id && handleDelete(refereeToDelete.id)}
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