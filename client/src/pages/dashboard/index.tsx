import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Award } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/useAuth';
import VerificationRequests from '@/components/referees/VerificationRequests';

interface DashboardStats {
  totalMatches: number;
  upcomingMatches: number;
  activeReferees: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMatches: 0,
    upcomingMatches: 0,
    activeReferees: 0
  });

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setStats({
        totalMatches: 0,
        upcomingMatches: 0,
        activeReferees: 0
      });
      return;
    }

    // Subscribe to matches collection
    const matchesUnsubscribe = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => {
        const matches = snapshot.docs.map(doc => doc.data());
        setStats(prev => ({
          ...prev,
          totalMatches: matches.length,
          upcomingMatches: matches.filter(m => m.status === 'scheduled').length
        }));
      },
      (error) => {
        console.error('Error fetching matches:', error);
      }
    );

    // Subscribe to referees collection
    const refereesUnsubscribe = onSnapshot(
      query(collection(db, 'referees'), where('isAvailable', '==', true)),
      (snapshot) => {
        setStats(prev => ({
          ...prev,
          activeReferees: snapshot.docs.length
        }));
      },
      (error) => {
        console.error('Error fetching referees:', error);
      }
    );

    return () => {
      matchesUnsubscribe();
      refereesUnsubscribe();
    };
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#212121]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Total Matches
              </CardTitle>
              <Calendar className="h-4 w-4 text-[#6ab100]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalMatches}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#212121]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Upcoming Matches
              </CardTitle>
              <Award className="h-4 w-4 text-[#6ab100]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.upcomingMatches}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#212121]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white">
                Active Referees
              </CardTitle>
              <Users className="h-4 w-4 text-[#6ab100]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeReferees}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-[#212121]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                Pending Verification Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VerificationRequests />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}