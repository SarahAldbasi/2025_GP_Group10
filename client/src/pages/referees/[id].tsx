
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUserById, type User } from '@/lib/firestore';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar } from 'lucide-react';
import { Link } from 'wouter';

export default function RefereeDetails() {
  const [, params] = useRoute('/referees/:id');
  const [referee, setReferee] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReferee = async () => {
      if (params && params.id) {
        try {
          const refereeData = await getUserById(params.id);
          setReferee(refereeData as User);
        } catch (error) {
          console.error("Error fetching referee details:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchReferee();
  }, [params]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/referees">
            <Button variant="outline" className="bg-[#2b2b2b] border-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Referees
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Referee Details</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-lg text-gray-400">Loading referee details...</div>
          </div>
        ) : referee ? (
          <Card className="bg-[#212121] border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-[#6ab100]" />
                {referee.firstName} {referee.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-[#787878]">
                  <Mail className="w-4 h-4" />
                  <span className="text-white">{referee.email}</span>
                </div>
                {referee.phoneNumber && (
                  <div className="flex items-center gap-2 text-[#787878]">
                    <Phone className="w-4 h-4" />
                    <span className="text-white">{referee.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#787878]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-white">Status: {referee.isAvailable ? 'Available' : 'Unavailable'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#787878]">
                  <span>Verification status: </span>
                  <span className={`font-semibold ${
                    referee.verificationStatus === 'approved' 
                      ? 'text-green-500' 
                      : referee.verificationStatus === 'rejected'
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}>
                    {referee.verificationStatus ?? 'pending'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="text-lg text-gray-400">Referee not found</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
