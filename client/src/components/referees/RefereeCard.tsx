import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone } from 'lucide-react';
import type { User as FirebaseUser } from '@/lib/firestore';

// interface RefereeCardProps {
//   referee: FirebaseUser;
//   onEdit: (referee: FirebaseUser) => void;
//   onDelete: (id: string) => void;
// }
interface RefereeCardProps {
  referee: FirebaseUser;
  onEdit: (referee: FirebaseUser) => void;
  onDelete: (id: string) => void;

  // new props
  assigned?: boolean;
  assignedMatches?: any[]; // or a Match[] type if you have it
}

export default function RefereeCard({ referee, onEdit, onDelete }: RefereeCardProps) {
  return (
    <Card className="bg-[#212121] text-white rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <User className="w-12 h-12 text-[#6ab100] mr-4" />
          <div>
            <h3 className="text-xl font-semibold">{`${referee.firstName} ${referee.lastName}`}</h3>
            <span className={`text-sm ${referee.isAvailable ? 'text-[#6ab100]' : 'text-red-500'}`}>
              {referee.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-[#787878]">
          <p className="flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            {referee.email}
          </p>
          {referee.phoneNumber && (
            <p className="flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              {referee.phoneNumber}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onEdit(referee)}
            className="flex-1 bg-[#6ab100] hover:bg-[#5a9700]"
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => referee.id && onDelete(referee.id)}
            className="flex-5"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}