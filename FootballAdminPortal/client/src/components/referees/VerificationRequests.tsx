import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { type VerificationRequest, updateVerificationRequest } from '@/lib/firestore';
import { useQuery } from '@tanstack/react-query';
import { getVerificationRequests } from '@/lib/firestore';

export default function VerificationRequests() {
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['verificationRequests'],
    queryFn: getVerificationRequests
  });

  const handleApproval = async (request: VerificationRequest, approved: boolean) => {
    try {
      await updateVerificationRequest(request.id!, {
        status: approved ? 'approved' : 'rejected',
        reviewNotes: reviewNotes,
        reviewDate: new Date(),
        reviewedBy: 'current-admin-id' // In a real implementation, this would be the actual admin ID
      });

      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating verification request:', error);
    }
  };

  if (isLoading) {
    return <div>Loading verification requests...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Verification Requests</h2>

      {requests.map((request) => (
        <Card key={request.id} className="bg-[#212121] text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">
              Documentation Review Required
            </CardTitle>
            <Badge 
              variant={request.status === 'pending' ? 'default' : 
                      request.status === 'approved' ? 'secondary' : 'destructive'}
            >
              {request.status.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <FileText className="mr-2 h-4 w-4" />
                <span>{request.documentationType}: {request.documentationData.description}</span>
              </div>
              <div className="text-sm text-gray-400">
                Submitted: {request.submissionDate.toLocaleDateString()}
              </div>

              {request.status === 'pending' && (
                <div className="space-y-2 mt-4">
                  <Textarea
                    placeholder="Add review notes..."
                    className="bg-[#2b2b2b] border-0"
                    value={selectedRequest?.id === request.id ? reviewNotes : ''}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    onClick={() => setSelectedRequest(request)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproval(request, true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApproval(request, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {request.status !== 'pending' && request.reviewNotes && (
                <div className="mt-2 text-sm text-gray-400">
                  <p>Review Notes: {request.reviewNotes}</p>
                  <p>Reviewed by: Admin on {request.reviewDate?.toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}