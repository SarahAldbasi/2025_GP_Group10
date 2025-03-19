import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { type VerificationRequest, updateVerificationRequest } from '@/lib/firestore';
import { useQuery } from '@tanstack/react-query';
import { getVerificationRequests } from '@/lib/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function VerificationRequests() {
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

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
        reviewedBy: 'current-admin-id' // This would be the actual admin ID in production
      });

      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating verification request:', error);
    }
  };

  const handleDocumentPreview = (url: string) => {
    setDocumentPreviewUrl(url);
  };

  if (isLoading) {
    return <div>Loading verification requests...</div>;
  }

  return (
    <div className="space-y-4">
      {/* <h2 className="text-2xl font-bold mb-4">Verification Requests</h2> */}

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
                <span>{request.documentationData.description}</span>
              </div>
              <div className="text-sm text-gray-400">
                Submitted: {request.submissionDate.toLocaleDateString()}
              </div>

              {/* Document Preview Button */}
              <Button
                variant="outline"
                className="mt-2 bg-[#2b2b2b] hover:bg-[#3b3b3b] border-0"
                onClick={() => handleDocumentPreview(request.documentationData.fileUrl)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Document
              </Button>

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
                      className="flex-1 bg-[#6ab100] hover:bg-green-700"
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

      {/* Document Preview Dialog */}
      <Dialog open={!!documentPreviewUrl} onOpenChange={() => setDocumentPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4 aspect-video">
            {documentPreviewUrl && (
              <iframe
                src={documentPreviewUrl}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}