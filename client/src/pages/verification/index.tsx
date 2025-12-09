import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import VerificationRequests from '@/components/referees/VerificationRequests';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerificationPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Verification Requests</h1>
        </div>

        <Card className="bg-[#212121] border-0">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              All Verification Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-lg text-gray-400">Loading requests...</div>
              </div>
            ) : (
              <VerificationRequests />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
