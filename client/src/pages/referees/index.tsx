import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/useAuth'; 
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RefereeCard from '@/components/referees/RefereeCard';
import RefereeForm from '@/components/referees/RefereeForm';
//import VerificationRequests from '@/components/referees/VerificationRequests';
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
  //createUser, 
  updateUser, 
  deleteUser,
  type User,
  getUserById,
  getBalls
} from '@/lib/firestore';
import { getMatches } from "@/lib/firestore";
import { useQuery } from "@tanstack/react-query";

type UIMatch = {
  id: string;
  mainReferee?: { id?: string } | null;
  assistantReferee1?: { id?: string } | null;
  assistantReferee2?: { id?: string } | null;
};


export default function Referees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<User | null>(null);
  const [refereeToDelete, setRefereeToDelete] = useState<User | null>(null);
  const [referees, setReferees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); 


const { data: matches = [], isLoading: isLoadingMatches } = useQuery({
  queryKey: ["matches"],
  queryFn: getMatches,

    // normalize to UIMatch so the rest of the UI can rely on id being a string
    select: (rows: any[]): UIMatch[] =>
      (rows ?? []).map((r: any) => ({
        id: r?.id ?? "",
        mainReferee: r?.mainReferee ?? null,
        assistantReferee1: r?.assistantReferee1 ?? null,
        assistantReferee2: r?.assistantReferee2 ?? null,
      })),
});
console.log(matches ,"matches")








  // 🟠 جلب الكرات
  const { data: balls = [], isLoading: isLoadingBalls } = useQuery({
    queryKey: ["balls"],
    queryFn: getBalls,
  });

  console.log(balls, "balls");












// array to save search value 
const [searchQuery, setSearchQuery] = useState("");

// to filter referee to make search by name and last name 
const filteredReferees = referees.filter((referee) => {
  const fullName = `${referee.firstName} ${referee.lastName}`.toLowerCase();
  return fullName.includes(searchQuery.toLowerCase());
});




// دالة ترجع true لو الحكم assigned لماتش
const isRefereeAssigned = (refereeId: string, matches: any[]) => {
  return matches.some((match) => 
    match.mainReferee?.id === refereeId ||
    match.assistantReferee1?.id === refereeId ||
    match.assistantReferee2?.id === refereeId
  );
};

// Return all matches where this referee is assigned
const getRefereeMatches = (refereeId: string, matches: any[]) => {
  return matches.filter((match) =>
    match.mainReferee?.id === refereeId ||
    match.assistantReferee1?.id === refereeId ||
    match.assistantReferee2?.id === refereeId
  );
};


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

  // const handleCreate = async (data: Omit<User, 'id' | 'role' | 'uid'>) => {
  //   if (!user) {
  //     toast({ 
  //       variant: "destructive",
  //       title: 'Authentication required',
  //       description: 'Please sign in to perform this action.'
  //     });
  //     return;
  //   }

  //   try {
  //     setIsSubmitting(true);

  //     // Create the referee in the database
  //     await createUser({
  //       ...data,
  //       role: 'referee',
  //       uid: `temp-${Date.now()}`, // This would normally come from Firebase Auth
  //       verificationStatus: 'pending'
  //     });

  //     // Import is dynamic to avoid cyclic dependencies
  //     const emailModule = await import('@/lib/emailService');

  //     // Get current admin from Firestore
  //     const adminData = await getUserById(user.uid);
  //     //const adminFirstName = adminData ? adminData.firstName : 'Admin';

  //     // Send email to the referee
  //     await emailModule.sendRefereeInvitation(
  //       data.firstName,
  //       data.lastName,
  //       data.email,
  //       //adminFirstName
  //     );

  //     handleClose();

  //     showSuccessToast('Referee added successfully and notification email sent');
  //   } catch (error) {
  //     console.error('Error creating referee:', error);
  //     toast({ 
  //       variant: "destructive",
  //       title: 'Error adding referee',
  //       description: 'Please try again later.'
  //     });
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

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

  // const handleSubmit = async (formData: { firstName: string; lastName: string; email: string; phone?: string; isAvailable: boolean }) => {
  //   // Add missing properties to match User type
  //   const data: Omit<User, "id" | "role" | "uid"> = {
  //     ...formData,
  //     photoURL: null,
  //     verificationStatus: 'approved' // Default for referees
  //   };
  //   if (selectedReferee) {
  //     await handleUpdate({ ...data, id: selectedReferee.id!, role: 'referee', uid: selectedReferee.uid });
  //   } else {
  //     await handleCreate(data);
  //   }
  // };

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

<input
  type="text"
  placeholder="Search..."
  value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}

  className="w-full max-w-sm rounded-md border border-gray-700 px-4 py-2 text-sm shadow-sm 
             focus:border-[#6ab100] focus:outline-none focus:ring-2 focus:ring-[#6ab100] 
             my-2 bg-[rgb(23,23,23)] text-white placeholder-white"
/>


          {/* <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#6ab100]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Referee
          </Button> */}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-lg text-gray-400">Loading referees...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReferees.map((referee) => {
  const assigned = isRefereeAssigned(referee.id!, matches);
    const refereeMatches = getRefereeMatches(referee.id!, matches);

console.log(refereeMatches,"refereeMatches")
  return (
    <RefereeCard
      key={referee.id}
      referee={referee}
      onEdit={handleEdit}
      onDelete={() => {
        if (assigned) {
          // لو الحكم مستخدم في ماتش مش هتسمح بالحذف
          toast({
            variant: "destructive",
            title: "Cannot delete referee",
              duration: 5000, 

            description: `Refree ${referee.firstName + " " + referee.lastName} is already assigned to ${refereeMatches?.length} match(es).`
          });
        } else {
          setRefereeToDelete(referee);
        }
      }}
      assigned={assigned} // ممكن تبعتها كـ prop عشان تظهر label أو badge
      assignedMatches={refereeMatches}
    />
  );
})}

            {filteredReferees?.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400">
                {/* No referees found. Add your first referee by clicking the "Add Referee" button. */}
                No referees found.
              </div>
            )}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={handleClose}>
          <DialogContent className="bg-[#212121] text-white">
            <DialogHeader>
              <DialogTitle>
                {/* {selectedReferee ? 'Edit Referee' : 'Add New Referee'} */}
                Edit Referee
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {/* Fill in the referee's details below. */}
                Edit the referee's details below.
              </DialogDescription>
            </DialogHeader>
            <RefereeForm
              onSubmit={(formData) => {
                const userData: User = {
                  ...formData,
                  id: selectedReferee?.id || '',
                  role: 'referee',
                  uid: selectedReferee?.uid || '',
                  photoURL: selectedReferee?.photoURL || null,
                  verificationStatus: selectedReferee?.verificationStatus || 'approved',
                };
                handleUpdate(userData);
              }}
              defaultValues={selectedReferee ? {
                firstName: selectedReferee.firstName || '',
                lastName: selectedReferee.lastName || '',
                email: selectedReferee.email || '',
                phoneNumber: selectedReferee.phoneNumber || '',
                isAvailable: selectedReferee.isAvailable ?? true,
              } : undefined}
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
// import { useState, useEffect } from 'react';
// import { Plus } from 'lucide-react';
// import { useAuth } from '@/lib/useAuth'; 
// import DashboardLayout from '@/components/dashboard/DashboardLayout';
// import RefereeCard from '@/components/referees/RefereeCard';
// import RefereeForm from '@/components/referees/RefereeForm';
// //import VerificationRequests from '@/components/referees/VerificationRequests';
// import { Button } from '@/components/ui/button';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from '@/components/ui/dialog';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { useToast } from '@/hooks/use-toast';
// import { 
//   subscribeToUsers,
//   //createUser, 
//   updateUser, 
//   deleteUser,
//   type User,
//   getUserById
// } from '@/lib/firestore';

// export default function Referees() {
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [selectedReferee, setSelectedReferee] = useState<User | null>(null);
//   const [refereeToDelete, setRefereeToDelete] = useState<User | null>(null);
//   const [referees, setReferees] = useState<User[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const { toast } = useToast();
//   const { user } = useAuth(); 

//   useEffect(() => {
//     if (!user) {
//       setReferees([]);
//       setIsLoading(false);
//       return;
//     }

//     console.log('Setting up referees subscription with auth user:', user.uid);
//     const unsubscribe = subscribeToUsers('referee', (updatedUsers) => {
//       setReferees(updatedUsers);
//       setIsLoading(false);
//     });

//     return () => unsubscribe();
//   }, [user]); 

//   const handleClose = () => {
//     setIsDialogOpen(false);
//     setSelectedReferee(null);
//     setIsSubmitting(false);
//   };

//   const showSuccessToast = (message: string) => {
//     setTimeout(() => {
//       toast({ title: message });
//     }, 100);
//   };

//   // const handleCreate = async (data: Omit<User, 'id' | 'role' | 'uid'>) => {
//   //   if (!user) {
//   //     toast({ 
//   //       variant: "destructive",
//   //       title: 'Authentication required',
//   //       description: 'Please sign in to perform this action.'
//   //     });
//   //     return;
//   //   }

//   //   try {
//   //     setIsSubmitting(true);

//   //     // Create the referee in the database
//   //     await createUser({
//   //       ...data,
//   //       role: 'referee',
//   //       uid: `temp-${Date.now()}`, // This would normally come from Firebase Auth
//   //       verificationStatus: 'pending'
//   //     });

//   //     // Import is dynamic to avoid cyclic dependencies
//   //     const emailModule = await import('@/lib/emailService');

//   //     // Get current admin from Firestore
//   //     const adminData = await getUserById(user.uid);
//   //     //const adminFirstName = adminData ? adminData.firstName : 'Admin';

//   //     // Send email to the referee
//   //     await emailModule.sendRefereeInvitation(
//   //       data.firstName,
//   //       data.lastName,
//   //       data.email,
//   //       //adminFirstName
//   //     );

//   //     handleClose();

//   //     showSuccessToast('Referee added successfully and notification email sent');
//   //   } catch (error) {
//   //     console.error('Error creating referee:', error);
//   //     toast({ 
//   //       variant: "destructive",
//   //       title: 'Error adding referee',
//   //       description: 'Please try again later.'
//   //     });
//   //   } finally {
//   //     setIsSubmitting(false);
//   //   }
//   // };

//   const handleUpdate = async (data: User) => {
//     if (!user) {
//       toast({ 
//         variant: "destructive",
//         title: 'Authentication required',
//         description: 'Please sign in to perform this action.'
//       });
//       return;
//     }

//     try {
//       setIsSubmitting(true);
//       const { id, ...updateData } = data;
//       await updateUser(id!, updateData);
//       handleClose();
//       showSuccessToast('Referee updated successfully');
//     } catch (error) {
//       console.error('Error updating referee:', error);
//       toast({ 
//         variant: "destructive",
//         title: 'Error updating referee',
//         description: 'Please try again later.'
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleDelete = async (id: string) => {
//     if (!user) {
//       toast({ 
//         variant: "destructive",
//         title: 'Authentication required',
//         description: 'Please sign in to perform this action.'
//       });
//       return;
//     }

//     try {
//       await deleteUser(id);
//       showSuccessToast('Referee deleted successfully');
//       setRefereeToDelete(null);
//     } catch (error) {
//       console.error('Error deleting referee:', error);
//       toast({ 
//         variant: "destructive",
//         title: 'Error deleting referee',
//         description: 'Please try again later.'
//       });
//     }
//   };

//   // const handleSubmit = async (formData: { firstName: string; lastName: string; email: string; phone?: string; isAvailable: boolean }) => {
//   //   // Add missing properties to match User type
//   //   const data: Omit<User, "id" | "role" | "uid"> = {
//   //     ...formData,
//   //     photoURL: null,
//   //     verificationStatus: 'approved' // Default for referees
//   //   };
//   //   if (selectedReferee) {
//   //     await handleUpdate({ ...data, id: selectedReferee.id!, role: 'referee', uid: selectedReferee.uid });
//   //   } else {
//   //     await handleCreate(data);
//   //   }
//   // };

//   const handleEdit = (referee: User) => {
//     setSelectedReferee(referee);
//     setIsDialogOpen(true);
//   };

//   if (!user) {
//     return (
//       <DashboardLayout>
//         <div className="flex justify-center items-center h-[50vh]">
//           <div className="text-lg text-gray-400">Please sign in to view and manage referees.</div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="space-y-8">
//         <div className="flex justify-between items-center">
//           <h1 className="text-3xl font-bold">Referees</h1>
//           {/* <Button
//             onClick={() => setIsDialogOpen(true)}
//             className="bg-[#6ab100]"
//           >
//             <Plus className="mr-2 h-4 w-4" />
//             Add Referee
//           </Button> */}
//         </div>

//         {isLoading ? (
//           <div className="flex justify-center items-center h-[50vh]">
//             <div className="text-lg text-gray-400">Loading referees...</div>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {referees.map((referee) => (
//               <RefereeCard
//                 key={referee.id}
//                 referee={referee}
//                 onEdit={handleEdit}
//                 onDelete={() => setRefereeToDelete(referee)}
//               />
//             ))}
//             {referees.length === 0 && (
//               <div className="col-span-full text-center py-8 text-gray-400">
//                 {/* No referees found. Add your first referee by clicking the "Add Referee" button. */}
//                 No referees found.
//               </div>
//             )}
//           </div>
//         )}

//         <Dialog open={isDialogOpen} onOpenChange={handleClose}>
//           <DialogContent className="bg-[#212121] text-white">
//             <DialogHeader>
//               <DialogTitle>
//                 {/* {selectedReferee ? 'Edit Referee' : 'Add New Referee'} */}
//                 Edit Referee
//               </DialogTitle>
//               <DialogDescription className="text-gray-400">
//                 {/* Fill in the referee's details below. */}
//                 Edit the referee's details below.
//               </DialogDescription>
//             </DialogHeader>
//             <RefereeForm
//               onSubmit={(formData) => {
//                 const userData: User = {
//                   ...formData,
//                   id: selectedReferee?.id || '',
//                   role: 'referee',
//                   uid: selectedReferee?.uid || '',
//                   photoURL: selectedReferee?.photoURL || null,
//                   verificationStatus: selectedReferee?.verificationStatus || 'approved',
//                 };
//                 handleUpdate(userData);
//               }}
//               defaultValues={selectedReferee ? {
//                 firstName: selectedReferee.firstName || '',
//                 lastName: selectedReferee.lastName || '',
//                 email: selectedReferee.email || '',
//                 phoneNumber: selectedReferee.phoneNumber || '',
//                 isAvailable: selectedReferee.isAvailable ?? true,
//               } : undefined}
//               isSubmitting={isSubmitting}
//             />
//           </DialogContent>
//         </Dialog>

//         <AlertDialog open={!!refereeToDelete} onOpenChange={(open) => !open && setRefereeToDelete(null)}>
//           <AlertDialogContent className="bg-[#212121] text-white">
//             <AlertDialogHeader>
//               <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
//               <AlertDialogDescription className="text-gray-400">
//                 Are you sure you want to remove referee {refereeToDelete?.firstName} {refereeToDelete?.lastName}? This action cannot be undone.
//               </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//               <AlertDialogCancel 
//                 onClick={() => setRefereeToDelete(null)}
//                 className="bg-[#2b2b2b] text-white hover:bg-[#363636]"
//               >
//                 Cancel
//               </AlertDialogCancel>
//               <AlertDialogAction
//                 onClick={() => refereeToDelete?.id && handleDelete(refereeToDelete.id)}
//                 className="bg-red-600 hover:bg-red-700"
//               >
//                 Delete
//               </AlertDialogAction>
//             </AlertDialogFooter>
//           </AlertDialogContent>
//         </AlertDialog>
//       </div>
//     </DashboardLayout>
//   );
// }