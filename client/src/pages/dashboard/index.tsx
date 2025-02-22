import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Award } from 'lucide-react';
import type { Match, Referee } from '@shared/schema';

export default function Dashboard() {
  const { data: matches } = useQuery<Match[]>({ 
    queryKey: ['/api/matches']
  });

  const { data: referees } = useQuery<Referee[]>({
    queryKey: ['/api/referees']
  });

  const stats = {
    totalMatches: matches?.length || 0,
    upcomingMatches: matches?.filter(m => m.status === 'scheduled').length || 0,
    activeReferees: referees?.filter(r => r.isAvailable).length || 0
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

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
    </DashboardLayout>
  );
}
