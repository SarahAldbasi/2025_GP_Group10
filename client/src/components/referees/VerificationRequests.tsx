import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { serverTimestamp } from "firebase/firestore";
import {
  Download,
  AlertCircle,
  Loader2,
  User,
  Mail,
} from "lucide-react";
import {
  type VerificationRequest,
  updateVerificationRequest,
  getUserById,
  updateUser,
  subscribeToVerificationRequests,
} from "@/lib/firestore";
import { useQuery } from "@tanstack/react-query";
import { getVerificationRequests } from "@/lib/firestore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { sendVerificationStatusEmail } from "@/lib/emailService";
import { addNotification } from "@/lib/firestore";
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

interface VerificationRequestsProps {
  showOnlyPending?: boolean; // default false
}


export default function VerificationRequests({ showOnlyPending = false }: VerificationRequestsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequest | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState<
    Record<string, boolean>
  >({});
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [isApproving, setIsApproving] = useState<Record<string, boolean>>({});
  const [refereeDetailsMap, setRefereeDetailsMap] = useState<
    Record<
      string,
      {
        name: string;
        email: string;
        phoneNumber?: string;
      }
    >
  >({});

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    request: VerificationRequest | null;
    action: "approve" | "reject";
  }>({
    isOpen: false,
    request: null,
    action: "approve",
  });

  // Initial data load using regular query but with refetch capability
  const { refetch } = useQuery({
    queryKey: ["verificationRequests"],
    queryFn: getVerificationRequests,
    enabled: false, // we rely on the real-time subscription
  });

  // Real-time subscription
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToVerificationRequests((updatedRequests) => {
      setRequests(updatedRequests);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load referee details for all requests when the list changes
  useEffect(() => {
    const loadAllRefereeDetails = async () => {
      const uniqueUserIds = [
        ...new Set(requests.map((request) => request.userId).filter((id) => id)),
      ];
      const detailsMap: Record<string, any> = {};

      for (const userId of uniqueUserIds) {
        try {
          if (!userId) continue;
          const referee = await getUserById(userId);
          const fullName =
            referee?.firstName && typeof referee.firstName === "string"
              ? `${referee.firstName}${referee.lastName ? " " + referee.lastName : ""}`
              : "Unknown Referee";

          detailsMap[userId] = {
            name: fullName,
            email: referee?.email || "No email available",
            phoneNumber: referee?.phoneNumber,
          };
        } catch (error) {
          detailsMap[userId] = {
            name: "Data Unavailable",
            email: "Could not load referee data",
            phoneNumber: undefined,
          };
        }
      }

      setRefereeDetailsMap(detailsMap);
    };

    if (requests.length > 0) loadAllRefereeDetails();
  }, [requests]);

  useEffect(() => {
    if (selectedRequest && !refereeDetailsMap[selectedRequest.userId]) {
      loadRefereeDetails(selectedRequest.userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequest, refereeDetailsMap]);

  const loadRefereeDetails = async (userId: string) => {
    if (!userId) return;
    try {
      const referee = await getUserById(userId);
      if (referee && referee.firstName && referee.lastName) {
        setRefereeDetailsMap((prev) => ({
          ...prev,
          [userId]: {
            name: `${referee.firstName} ${referee.lastName}`,
            email: referee.email || "No email provided",
            phoneNumber: referee.phoneNumber,
          },
        }));
      } else {
        setRefereeDetailsMap((prev) => ({
          ...prev,
          [userId]: {
            name:
              referee?.firstName && referee?.lastName
                ? `${referee.firstName} ${referee.lastName}`
                : "Unknown Referee",
            email: referee?.email || "No email available",
            phoneNumber: referee?.phoneNumber,
          },
        }));
      }
    } catch (error) {
      setRefereeDetailsMap((prev) => ({
        ...prev,
        [userId]: {
          name: "Data Unavailable",
          email: "Could not load referee data",
          phoneNumber: undefined,
        },
      }));
    }
  };

  // --- helper to normalize Firestore Timestamp | Date | string -> Date ---
  const toJsDate = (d: any) => {
    if (!d) return null;
    if (typeof d?.toDate === "function") return d.toDate(); // Firestore Timestamp
    if (d instanceof Date) return d; // JS Date
    const t = new Date(d); // ISO/millis
    return isNaN(t.getTime()) ? null : t;
  };

  // --- split into Pending + Reviewed and sort client-side ---
  const pendingRequests = [...requests]
    .filter((r) => (r.verificationStatus ?? "pending") === "pending")
    .sort((a, b) => {
      const ad = toJsDate(a.submissionDate)?.getTime() ?? 0;
      const bd = toJsDate(b.submissionDate)?.getTime() ?? 0;
      return ad - bd; // oldest first
    });

  const reviewedRequests = [...requests]
    .filter((r) => (r.verificationStatus ?? "pending") !== "pending")
    .sort((a, b) => {
      const ad = toJsDate(a.reviewDate)?.getTime() ?? 0;
      const bd = toJsDate(b.reviewDate)?.getTime() ?? 0;
      return bd - ad; // newest first
    });

  // --- approval / rejection flow ---
  const showConfirmDialog = (
    request: VerificationRequest,
    action: "approve" | "reject"
  ) => {
    setConfirmDialog({ isOpen: true, request, action });
  };

  const handleConfirmedAction = async () => {
    const { request, action } = confirmDialog;
    if (!request?.id) return;
    const approved = action === "approve";
    setConfirmDialog({ isOpen: false, request: null, action: "approve" });
    setIsApproving((prev) => ({ ...prev, [request.id!]: true }));

    try {
      await updateVerificationRequest(request.id!, {
        verificationStatus: approved ? "approved" : "rejected",
        reviewDate: serverTimestamp(),
        reviewedBy: user?.uid || "unknown-admin",
      });

      try {
        await updateUser(request.userId, {
          verificationStatus: approved ? "approved" : "rejected",
        });
      } catch {}

      const refereeDetails = refereeDetailsMap[request.userId];

      try {
        const notificationMessage = approved
          ? "Your verification documents have been approved!"
          : "Your verification documents have been rejected. Please contact admin for more information.";
        await addNotification(notificationMessage, [request.userId]);
      } catch {}

      let emailSent = false;
      if (
        refereeDetails &&
        refereeDetails.email &&
        refereeDetails.email !== "No email available" &&
        refereeDetails.email !== "Could not load referee data"
      ) {
        try {
          const firstName = refereeDetails.name.split(" ")[0] || refereeDetails.name;
          emailSent = await sendVerificationStatusEmail(
            firstName,
            refereeDetails.email,
            approved
          );
        } catch {
          emailSent = false;
        }
      }

      toast({
        title: approved ? "Request Approved" : "Request Rejected",
        description: `Verification request has been ${approved ? "approved" : "rejected"}. Email notification ${emailSent ? "sent successfully" : "sending..."}.`,
      });

      setSelectedRequest(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating request",
        description: "An error occurred while updating the verification request.",
      });
    } finally {
      setIsApproving((prev) => ({ ...prev, [request!.id!]: false }));
    }
  };

  const getDocumentUrl = async (
    requestId: string,
    fileUrl: string,
    userId: string
  ) => {
    if (isLoadingDocument[requestId]) return;
    if (documentUrls[requestId]) {
      const a = document.createElement("a");
      a.href = documentUrls[requestId];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
      return;
    }

    setIsLoadingDocument((prev) => ({ ...prev, [requestId]: true }));

    try {
      if (fileUrl.startsWith("https://firebasestorage.googleapis.com")) {
        setDocumentUrls((prev) => ({ ...prev, [requestId]: fileUrl }));
        const a = document.createElement("a");
        a.href = fileUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        return;
      }

      if (!userId) throw new Error("User ID is required to load documents");

      let documentPath = "";
      if (fileUrl.includes(`documents/${userId}/`)) {
        documentPath = fileUrl;
      } else {
        const seemsToBeFilename = fileUrl.includes(".") && !fileUrl.includes("/");
        documentPath = seemsToBeFilename
          ? `documents/${userId}/${fileUrl}`
          : `documents/${userId}/document.pdf`;
      }

      try {
        const storageRef = ref(storage, documentPath);
        const downloadUrl = await getDownloadURL(storageRef);
        setDocumentUrls((prev) => ({ ...prev, [requestId]: downloadUrl }));
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } catch (error) {
        const fallbackPaths = [
          `documents/${userId}/document.pdf`,
          `documents/${userId}/verification.pdf`,
          `documents/${userId}/${userId}.pdf`,
        ];

        let found = false;
        for (const path of fallbackPaths) {
          if (path === documentPath) continue;
          try {
            const storageRef = ref(storage, path);
            const downloadUrl = await getDownloadURL(storageRef);
            setDocumentUrls((prev) => ({ ...prev, [requestId]: downloadUrl }));
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.click();
            found = true;
            break;
          } catch {}
        }

        if (!found) {
          toast({
            variant: "destructive",
            title: "Document not found",
            description: `Could not find document in folder documents/${userId}/`,
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error accessing document",
        description: "Failed to access the document. It may have been moved or deleted.",
      });
    } finally {
      setIsLoadingDocument((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-10 w-10 text-gray-400 animate-spin mr-2" />
        <span className="text-lg text-gray-400">Loading verification requests...</span>
      </div>
    );
  }

  // Empty state only when nothing pending AND nothing reviewed
// Empty state
if (showOnlyPending) {
  if (pendingRequests.length === 0) {
    return (
      <Alert className="bg-[#5b9800]/20 border-[#6ab100] text-white">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-[#6ab100]">No Pending Requests</AlertTitle>
        <AlertDescription>Everything is reviewed for now.</AlertDescription>
      </Alert>
    );
  }
} else {
  if (pendingRequests.length === 0 && reviewedRequests.length === 0) {
    return (
      <Alert className="bg-[#5b9800]/20 border-[#6ab100] text-white">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-[#6ab100]">No Verification Requests</AlertTitle>
        <AlertDescription>There are currently no verification requests to review.</AlertDescription>
      </Alert>
    );
  }
}


  return (
    <div className="space-y-6">
      {/* Pending Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Pending</h3>
          <Badge variant="secondary">{pendingRequests.length}</Badge>
        </div>

        {pendingRequests.length === 0 ? (
          <Alert className="bg-[#5b9800]/20 border-[#6ab100] text-white">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-[#6ab100]">No Pending Requests</AlertTitle>
            <AlertDescription>Everything is reviewed for now.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="bg-[#212121] text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center text-sm">
                    <User className="mr-2 h-4 w-4" />
                    <span className="text-base font-medium">
                      Submitted by:{" "}
                      {refereeDetailsMap[request.userId]?.name || "Loading referee name..."}
                    </span>
                  </div>
                  <Badge variant="default">{(request.verificationStatus || "pending").toUpperCase()}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm mt-1">
                      <Mail className="mr-2 h-4 w-4" />
                      <span>{refereeDetailsMap[request.userId]?.email || "Loading email address..."}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Submitted: {toJsDate(request.submissionDate)?.toLocaleDateString?.() || "—"}
                    </div>

                    <Button
                      variant="outline"
                      className="mt-2 bg-[#2b2b2b] hover:bg-[#3b3b3b] border-0"
                      onClick={() => {
                        setSelectedRequest(request);
                        if (request.document && request.id) {
                          getDocumentUrl(request.id, request.document, request.userId);
                        }
                      }}
                      disabled={!request.document || isLoadingDocument[request.id || ""]}
                    >
                      {isLoadingDocument[request.id || ""] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Document
                        </>
                      )}
                    </Button>

                    {request.verificationStatus === "pending" && (
                      <div className="space-y-2 mt-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => showConfirmDialog(request, "approve")}
                            className="flex-1 bg-[#6ab100] hover:bg-[#5a9700]"
                            disabled={isApproving[request.id || ""]}
                          >
                            {isApproving[request.id || ""] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>Approve</>
                            )}
                          </Button>
                          <Button
                            onClick={() => showConfirmDialog(request, "reject")}
                            variant="destructive"
                            className="flex-1"
                            disabled={isApproving[request.id || ""]}
                          >
                            {isApproving[request.id || ""] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>Reject</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Reviewed Section */}
      {!showOnlyPending && (
      <section className="space-y-3">
        <div className="flex items-center justify-between mt-6">
          <h3 className="text-xl font-semibold">Reviewed</h3>
          <Badge variant="secondary">{reviewedRequests.length}</Badge>
        </div>

        {reviewedRequests.length === 0 ? (
          <Alert className="bg-[#2b2b2b] border-gray-700 text-white">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-white">No Reviewed Requests</AlertTitle>
            <AlertDescription>Approved or rejected requests will appear here.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {reviewedRequests.map((request) => (
              <Card key={request.id} className="bg-[#1b1b1b] text-white opacity-95">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center text-sm">
                    <User className="mr-2 h-4 w-4" />
                    <span className="text-base font-medium">
                      {refereeDetailsMap[request.userId]?.name || "Referee"}
                    </span>
                  </div>
                  <Badge variant={request.verificationStatus === "approved" ? "secondary" : "destructive"}>
                    {(request.verificationStatus || "reviewed").toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm mt-1">
                      <Mail className="mr-2 h-4 w-4" />
                      <span>{refereeDetailsMap[request.userId]?.email || "No email"}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Submitted: {toJsDate(request.submissionDate)?.toLocaleDateString?.() || "—"}
                    </div>
                    <div className="text-sm text-gray-400">
                      Reviewed: {toJsDate(request.reviewDate)?.toLocaleDateString?.() || "—"}
                    </div>

                    <Button
                      variant="outline"
                      className="mt-2 bg-[#2b2b2b] hover:bg-[#3b3b3b] border-0"
                      onClick={() => {
                        setSelectedRequest(request);
                        if (request.document && request.id) {
                          getDocumentUrl(request.id, request.document, request.userId);
                        }
                      }}
                      disabled={!request.document || isLoadingDocument[request.id || ""]}
                    >
                      {isLoadingDocument[request.id || ""] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Document
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className="bg-[#212121] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.action === "approve" ? "Approve" : "Reject"} Verification Request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to {confirmDialog.action} the verification request for {" "}
              <span className="font-semibold">
                {confirmDialog.request
                  ? refereeDetailsMap[confirmDialog.request.userId]?.name || "this referee"
                  : "this referee"}
              </span>
              ? This action will {confirmDialog.action === "approve" ? "grant" : "deny"} them access and send an email notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-600 hover:bg-gray-700 text-white border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              className={confirmDialog.action === "approve" ? "bg-[#6ab100] hover:bg-[#5a9700]" : "bg-red-600 hover:bg-red-700"}
            >
              {confirmDialog.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// import { useState, useEffect } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import {
//   FileText,
//   CheckCircle,
//   XCircle,
//   Download,
//   AlertCircle,
//   Loader2,
//   User,
//   Mail,
// } from "lucide-react";
// import {
//   type VerificationRequest,
//   updateVerificationRequest,
//   getUserById,
//   updateUser,
//   subscribeToVerificationRequests,
// } from "@/lib/firestore";
// import { useQuery } from "@tanstack/react-query";
// import { getVerificationRequests } from "@/lib/firestore";
// import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
// import { useAuth } from "@/lib/useAuth";
// import { useToast } from "@/hooks/use-toast";
// import { getDownloadURL, ref } from "firebase/storage";
// import { storage } from "@/lib/firebase";
// import { sendVerificationStatusEmail } from "@/lib/emailService";
// import { addNotification } from "@/lib/firestore";
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

// export default function VerificationRequests() {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const [selectedRequest, setSelectedRequest] =
//     useState<VerificationRequest | null>(null);
//   const [isLoadingDocument, setIsLoadingDocument] = useState<
//     Record<string, boolean>
//   >({});
//   const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
//   const [isApproving, setIsApproving] = useState<Record<string, boolean>>({});
//   const [refereeDetailsMap, setRefereeDetailsMap] = useState<
//     Record<
//       string,
//       {
//         name: string;
//         email: string;
//         phoneNumber?: string;
//       }
//     >
//   >({});

//   // const {
//   //   data: requests = [],
//   //   isLoading,
//   //   refetch,
//   // } = useQuery({
//   // State for storing verification requests loaded through real-time subscription
//   const [requests, setRequests] = useState<VerificationRequest[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//     // Confirmation dialog state
//     const [confirmDialog, setConfirmDialog] = useState<{
//       isOpen: boolean;
//       request: VerificationRequest | null;
//       action: 'approve' | 'reject';
//     }>({
//       isOpen: false,
//       request: null,
//       action: 'approve',
//     });
  
//   // Initial data load using regular query but with refetch capability 
//   const { refetch } = useQuery({
//     queryKey: ["verificationRequests"],
//     queryFn: getVerificationRequests,
//     // onSuccess: (data: VerificationRequest[]) => {
//     //   // Set initial data
//     //   setRequests(data);
//     //   setIsLoading(false);
//     // },
//     // Skip auto-fetch since we're using real-time subscription
//     enabled: false,
//   });

//   // Use real-time subscription for verification requests
//   useEffect(() => {
//     console.log("Setting up real-time verification requests subscription");
//     setIsLoading(true);
    
//     // Subscribe to verification requests
//     const unsubscribe = subscribeToVerificationRequests((updatedRequests) => {
//       console.log(`Received ${updatedRequests.length} verification requests from real-time update`);
//       setRequests(updatedRequests);
//       setIsLoading(false);
//     });
    
//     // Clean up subscription when component unmounts
//     return () => {
//       console.log("Cleaning up verification requests subscription");
//       unsubscribe();
//     };
//   }, []);

//   useEffect(() => {
//     // Load referee details for all requests when the component mounts or requests change
//     const loadAllRefereeDetails = async () => {
//       const uniqueUserIds = [
//         ...new Set(
//           requests.map((request) => request.userId).filter((id) => id),
//         ),
//       ];
//       const detailsMap: Record<string, any> = {};

//       console.log("Loading referee details for user IDs:", uniqueUserIds);

//       for (const userId of uniqueUserIds) {
//         try {
//           if (!userId) {
//             console.warn("Skipping undefined or null userId");
//             continue;
//           }

//           const referee = await getUserById(userId);
//           const fullName =
//             referee?.firstName && typeof referee.firstName === "string"
//               ? `${referee.firstName}${referee.lastName ? " " + referee.lastName : ""}`
//               : "Unknown Referee";

//           detailsMap[userId] = {
//             name: fullName,
//             email: referee?.email || "No email available",
//             phoneNumber: referee?.phoneNumber,
//           };
//         } catch (error) {
//           console.error(`Error loading referee details for ${userId}:`, error);
//           // Add fallback data for this user ID in case of error
//           detailsMap[userId] = {
//             name: "Data Unavailable",
//             email: "Could not load referee data",
//             phoneNumber: undefined,
//           };
//         }
//       }

//       setRefereeDetailsMap(detailsMap);
//     };

//     if (requests.length > 0) {
//       loadAllRefereeDetails();
//     }
//   }, [requests]);

//   useEffect(() => {
//     if (selectedRequest) {
//       // Make sure this referee is in our map
//       if (!refereeDetailsMap[selectedRequest.userId]) {
//         loadRefereeDetails(selectedRequest.userId);
//       }
//     }
//   }, [selectedRequest, refereeDetailsMap]);

//   const loadRefereeDetails = async (userId: string) => {
//     if (!userId) {
//       console.warn("Cannot load referee details for undefined or null userId");
//       return;
//     }

//     try {
//       const referee = await getUserById(userId);
//       if (referee && referee.firstName && referee.lastName) {
//         setRefereeDetailsMap((prev) => ({
//           ...prev,
//           [userId]: {
//             name: `${referee.firstName} ${referee.lastName}`,
//             email: referee.email || "No email provided",
//             phoneNumber: referee.phoneNumber,
//           },
//         }));
//       } else {
//         // Add placeholder data if the referee document exists but has incomplete data
//         setRefereeDetailsMap((prev) => ({
//           ...prev,
//           [userId]: {
//             name:
//               referee?.firstName && referee?.lastName
//                 ? `${referee.firstName} ${referee.lastName}`
//                 : "Unknown Referee",
//             email: referee?.email || "No email available",
//             phoneNumber: referee?.phoneNumber,
//           },
//         }));
//       }
//     } catch (error) {
//       console.error("Error loading referee details:", error);
//       // Add fallback data for this user ID in case of error
//       setRefereeDetailsMap((prev) => ({
//         ...prev,
//         [userId]: {
//           name: "Data Unavailable",
//           email: "Could not load referee data",
//           phoneNumber: undefined,
//         },
//       }));
//     }
//   };

//   // const handleApproval = async (
//   //   request: VerificationRequest,
//   //   approved: boolean,
//   // ) => {
//   //   if (!request.id) return;
    
//   //   // Set loading state for this specific request
//     // Show confirmation dialog
//     const showConfirmDialog = (request: VerificationRequest, action: 'approve' | 'reject') => {
//       setConfirmDialog({
//         isOpen: true,
//         request,
//         action,
//       });
//     };
//     // Handle confirmed approval/rejection
//     const handleConfirmedAction = async () => {
//       const { request, action } = confirmDialog;
//       if (!request?.id) return;
//       const approved = action === 'approve';
      
//       // Close dialog and set loading state
//       setConfirmDialog({ isOpen: false, request: null, action: 'approve' });
//     setIsApproving(prev => ({ ...prev, [request.id!]: true }));
    
//     try {
//       // First, update the verification status in the database
//       await updateVerificationRequest(request.id!, {
//         verificationStatus: approved ? "approved" : "rejected",
//         reviewDate: new Date(),
//         reviewedBy: user?.uid || "unknown-admin",
//       });

//       // Also update the user's verification status in the users collection
//       try {
//         console.log(
//           `Updating user verification status for ${request.userId} to ${approved ? "approved" : "rejected"}`,
//         );
//         await updateUser(request.userId, {
//           verificationStatus: approved ? "approved" : "rejected",
//         });
//       } catch (userUpdateError) {
//         console.error(
//           "Error updating user verification status:",
//           userUpdateError,
//         );
//         // Continue with the process even if user update fails
//         // We'll still try to send the email notification
//       }

//       // Get referee details for email notification
//       const refereeDetails = refereeDetailsMap[request.userId];

//       // Create an in-app notification for the referee
//       try {
//         const notificationMessage = approved
//           ? "Your verification documents have been approved!"
//           : "Your verification documents have been rejected. Please contact admin for more information.";

//         await addNotification(notificationMessage, [request.userId]);
//         console.log("Added in-app notification for referee");
//       } catch (notificationError) {
//         console.error("Error adding notification:", notificationError);
//       }

//       // If we have referee details, send an email notification
//       let emailSent = false;
//       if (
//         refereeDetails &&
//         refereeDetails.email &&
//         refereeDetails.email !== "No email available" &&
//         refereeDetails.email !== "Could not load referee data"
//       ) {
//         try {
//           // Extract first name from the full name (assuming format "First Last")
//           const firstName =
//             refereeDetails.name.split(" ")[0] || refereeDetails.name;

//           // Send the email notification with clear status indication
//           // Setting the template_type to "verification_status" helps EmailJS differentiate
//           // between welcome emails and verification status emails
//           emailSent = await sendVerificationStatusEmail(
//             firstName,
//             refereeDetails.email,
//             approved,
//           );

//           if (emailSent) {
//             console.log("Verification status email sent successfully");
//           } else {
//             console.warn("Failed to send verification status email");
//           }
//         } catch (emailError) {
//           console.error("Error in email sending process:", emailError);
//           emailSent = false;
//         }
//       } else {
//         console.warn(
//           "Could not send email notification: Missing or invalid referee details",
//           {
//             userId: request.userId,
//             refereeDetails,
//           },
//         );
//       }

//       toast({
//         title: approved ? "Request Approved" : "Request Rejected", 
//         description: `Verification request has been ${approved ? "approved" : "rejected"}. Email notification ${emailSent ? "sent successfully" : "sending..."}.`,
//         // title: `Request ${approved ? "approved" : "rejected"} successfully`,
//         // description: `The verification request has been ${approved ? "approved" : "rejected"}. ${
//         //   emailSent
//         //     ? "The referee has been notified via email"
//         //     : "Email notification failed (Outlook authentication error)"
//         // }`,
//         // duration: 5000, // Show for a bit longer so admin can read the message
//       });

//       // Show additional confirmation toast after a delay
//       // setTimeout(() => {
//       //   toast({
//       //     title: "Action Completed",
//       //     description: `${refereeDetails?.name || "Referee"} has been notified of the ${approved ? "approval" : "rejection"}.`,
//       //   });
//       // }, 2000);

//       setSelectedRequest(null);
//       // refetch(); // Refresh the data
//     } catch (error) {
//       console.error("Error updating verification request:", error);
//       toast({
//         variant: "destructive",
//         title: "Error updating request",
//         description:
//           "An error occurred while updating the verification request.",
//       });
//     } finally {
//       // Clear loading state when done
//       setIsApproving(prev => ({ ...prev, [request.id!]: false }));
//     }
//   };

//   const getDocumentUrl = async (
//     requestId: string,
//     fileUrl: string,
//     userId: string,
//   ) => {
//     // If already loading this document, don't try again
//     if (isLoadingDocument[requestId]) return;

//     // If we already have this URL cached, don't fetch again
//     if (documentUrls[requestId]) {
//       // Use a standard anchor element to avoid extension context issues
//       const a = document.createElement("a");
//       a.href = documentUrls[requestId];
//       a.target = "_blank";
//       a.rel = "noopener noreferrer";
//       a.click();
//       return;
//     }

//     setIsLoadingDocument((prev) => ({ ...prev, [requestId]: true }));

//     try {
//       console.log("Attempting to get document URL:", { fileUrl, userId });

//       // If this is a direct Firebase Storage URL, use it directly
//       if (fileUrl.startsWith("https://firebasestorage.googleapis.com")) {
//         console.log("Using direct Firebase Storage URL");
//         setDocumentUrls((prev) => ({ ...prev, [requestId]: fileUrl }));

//         // Use DOM API to create and click a link (safer than window.open)
//         const a = document.createElement("a");
//         a.href = fileUrl;
//         a.target = "_blank";
//         a.rel = "noopener noreferrer";
//         a.click();
//         return;
//       }

//       // If userId is not provided, we can't construct the proper path
//       if (!userId) {
//         console.error("Cannot load document: missing userId");
//         throw new Error("User ID is required to load documents");
//       }

//       // Standard path: documents/{userId}/document.pdf
//       let documentPath = "";

//       // If fileUrl already contains the full path including userId
//       if (fileUrl.includes(`documents/${userId}/`)) {
//         console.log("Using provided complete path");
//         documentPath = fileUrl;
//       }
//       // If fileUrl is just the filename or some other string
//       else {
//         console.log("Constructing path with userId");
//         // Check if fileUrl appears to be a filename (like document.pdf)
//         const seemsToBeFilename =
//           fileUrl.includes(".") && !fileUrl.includes("/");

//         if (seemsToBeFilename) {
//           documentPath = `documents/${userId}/${fileUrl}`;
//         } else {
//           documentPath = `documents/${userId}/document.pdf`;
//         }
//       }

//       console.log("Attempting to get document URL from path:", documentPath);

//       try {
//         const storageRef = ref(storage, documentPath);
//         const downloadUrl = await getDownloadURL(storageRef);
//         console.log("Successfully found document at path:", documentPath);

//         // Save the URL for future use
//         setDocumentUrls((prev) => ({ ...prev, [requestId]: downloadUrl }));

//         // Use DOM API to create and click a link
//         const a = document.createElement("a");
//         a.href = downloadUrl;
//         a.target = "_blank";
//         a.rel = "noopener noreferrer";
//         a.click();
//       } catch (error) {
//         console.error(`Failed to get document from ${documentPath}:`, error);

//         // Try fallback paths
//         const fallbackPaths = [
//           `documents/${userId}/document.pdf`, // Standard filename
//           `documents/${userId}/verification.pdf`, // Another common name
//           `documents/${userId}/${userId}.pdf`, // Named after user ID
//         ];

//         let foundDocument = false;

//         for (const path of fallbackPaths) {
//           if (path === documentPath) continue; // Skip if already tried

//           try {
//             console.log("Attempting fallback path:", path);
//             const storageRef = ref(storage, path);
//             const downloadUrl = await getDownloadURL(storageRef);
//             console.log("Successfully found document at fallback path:", path);

//             // Save the URL for future use
//             setDocumentUrls((prev) => ({ ...prev, [requestId]: downloadUrl }));

//             // Use DOM API to create and click a link
//             const a = document.createElement("a");
//             a.href = downloadUrl;
//             a.target = "_blank";
//             a.rel = "noopener noreferrer";
//             a.click();

//             foundDocument = true;
//             break;
//           } catch (fallbackError) {
//             console.log(`Fallback path ${path} failed`);
//           }
//         }

//         if (!foundDocument) {
//           toast({
//             variant: "destructive",
//             title: "Document not found",
//             description: `Could not find document in folder documents/${userId}/`,
//           });
//         }
//       }
//     } catch (error) {
//       console.error("Error getting document URL:", error);
//       toast({
//         variant: "destructive",
//         title: "Error accessing document",
//         description:
//           "Failed to access the document. It may have been moved or deleted.",
//       });
//     } finally {
//       setIsLoadingDocument((prev) => ({ ...prev, [requestId]: false }));
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center p-8">
//         <Loader2 className="h-10 w-10 text-gray-400 animate-spin mr-2" />
//         <span className="text-lg text-gray-400">
//           Loading verification requests...
//         </span>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       {/* <h2 className="text-2xl font-bold mb-4">Verification Requests</h2> */}

//       {requests.length === 0 && (
//         <Alert className="bg-[#5b9800]/20 border-[#6ab100] text-white">
//           <AlertCircle className="h-4 w-4 text-blue-500" />
//           <AlertTitle className="text-[#6ab100]">
//             No Verification Requests
//           </AlertTitle>
//           <AlertDescription>
//             There are currently no verification requests to review.
//           </AlertDescription>
//         </Alert>
//       )}
//       {requests.map((request) => (
//         <Card key={request.id} className="bg-[#212121] text-white">
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <div className="flex items-center text-sm">
//               <User className="mr-2 h-4 w-4" />
//               <span className="text-base font-medium">
//                 Submitted by:{" "}
//                 {refereeDetailsMap[request.userId]?.name ||
//                   "Loading referee name..."}
//               </span>
//             </div>
//             {/* <CardTitle className="text-lg font-medium">
//               Documentation Review Required
//             </CardTitle> */}
//             <Badge
//               variant={
//                 request.verificationStatus === "pending"
//                   ? "default"
//                   : request.verificationStatus === "approved"
//                     ? "secondary"
//                     : "destructive"
//               }
//             >
//               {request.verificationStatus.toUpperCase()}
//             </Badge>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               {/* <div className="flex items-center text-sm">
//                 <User className="mr-2 h-4 w-4" />
//                 <span className="font-medium">
//                   Submitted by: {refereeDetailsMap[request.userId]?.name || "Loading referee name..."}
//                 </span>
//               </div> */}
//               <div className="flex items-center text-sm mt-1">
//                 <Mail className="mr-2 h-4 w-4" />
//                 <span>
//                   {refereeDetailsMap[request.userId]?.email ||
//                     "Loading email address..."}
//                 </span>
//               </div>
//               {/* <div className="flex items-center text-sm mt-1">
//                 <FileText className="mr-2 h-4 w-4" />
//                 <span>Verification Document</span>
//               </div> */}
//               <div className="text-sm text-gray-400">
//                 Submitted: {request.submissionDate.toLocaleDateString()}
//               </div>

//               {/* Document Download Button */}
//               <Button
//                 variant="outline"
//                 className="mt-2 bg-[#2b2b2b] hover:bg-[#3b3b3b] border-0"
//                 onClick={() => {
//                   setSelectedRequest(request);
//                   if (request.document && request.id) {
//                     getDocumentUrl(
//                       request.id,
//                       request.document,
//                       request.userId,
//                     );
//                   }
//                 }}
//                 disabled={
//                   !request.document || isLoadingDocument[request.id || ""]
//                 }
//               >
//                 {isLoadingDocument[request.id || ""] ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Loading...
//                   </>
//                 ) : (
//                   <>
//                     <Download className="mr-2 h-4 w-4" />
//                     Download Document
//                   </>
//                 )}
//               </Button>

//               {request.verificationStatus === "pending" && (
//                 <div className="space-y-2 mt-4">
//                   <div className="flex gap-2">
//                     <Button
//                       onClick={() => showConfirmDialog(request, 'approve')}
//                       className="flex-1 bg-[#6ab100] hover:bg-[#5a9700]"
//                       disabled={isApproving[request.id || '']}
//                     >
//                       {isApproving[request.id || ''] ? (
//                         <>
//                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           Processing...
//                         </>
//                       ) : (
//                         <>
//                           {/* <CheckCircle className="mr-2 h-4 w-4" /> */}
//                           Approve
//                         </>
//                       )}
//                     </Button>
//                     <Button
//                       onClick={() => showConfirmDialog(request, 'reject')}
//                       variant="destructive"
//                       className="flex-1"
//                       disabled={isApproving[request.id || '']}
//                     >
//                       {isApproving[request.id || ''] ? (
//                         <>
//                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           Processing...
//                         </>
//                       ) : (
//                         <>
//                           {/* <XCircle className="mr-2 h-4 w-4" /> */}
//                           Reject
//                         </>
//                       )}
//                     </Button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </CardContent>
//         </Card>
//       ))}

//       {/* Confirmation Dialog */}
//       <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
//         setConfirmDialog(prev => ({ ...prev, isOpen: open }))
//       }>
//         <AlertDialogContent className="bg-[#212121] border-gray-700">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-white">
//               {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'} Verification Request
//             </AlertDialogTitle>
//             <AlertDialogDescription className="text-gray-300">
//               Are you sure you want to {confirmDialog.action} the verification request for{' '}
//               <span className="font-semibold">
//                 {confirmDialog.request ? refereeDetailsMap[confirmDialog.request.userId]?.name || 'this referee' : 'this referee'}
//               </span>
//               ? This action will {confirmDialog.action === 'approve' ? 'grant' : 'deny'} them access and send an email notification.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel className="bg-gray-600 hover:bg-gray-700 text-white border-0">
//               Cancel
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleConfirmedAction}
//               className={confirmDialog.action === 'approve' ? 'bg-[#6ab100] hover:bg-[#5a9700]' : 'bg-red-600 hover:bg-red-700'}
//             >
//               {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }
