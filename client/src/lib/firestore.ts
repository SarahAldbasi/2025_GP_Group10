import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  type FirestoreError,
  writeBatch,
  getDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  FieldValue,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Import sendPushToUsers from useNotifications (will be passed as parameter)
// Note: We'll import it dynamically or pass it as a parameter to avoid circular dependency



// Collection references
const usersCollection = collection(db, "users");
const matchesCollection = collection(db, "matches");
const notificationsCollection = collection(db, "notifications");
// const verificationRequestsCollection = collection(db, "verificationRequests");

// Types
export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  photoURL: string | null;
  uid: string;
  role: "admin" | "referee";
  phoneNumber?: string;
  isAvailable: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  documentationUrl?: string;
  fcmTokens?: string[]; // Array of FCM tokens for multiple devices
}

// Interface for objects that have user-like properties (for type checking)
export interface UserLike {
  id?: string;
  uid?: string;
  firstName: string;
  lastName: string;
  photoURL?: string | null;
}

// Define a RefereeDisplay interface for referee objects in Match
export interface RefereeDisplay {
  id: string;
  name: string;
  image?: string;
}

export interface Match {
  id?: string;
  homeTeam: { name: string; logo?: string };
  awayTeam: { name: string; logo?: string };
  venue: string;
  date: Date;
  league: string;
  status: string;
  mainReferee: RefereeDisplay;
  assistantReferee1?: RefereeDisplay;
  assistantReferee2?: RefereeDisplay;
  matchCode?: string; // Added matchCode property
  createdAt?: any; // Firestore timestamp
}

export interface Notification {
  id?: string;
  message: string;
  timestamp: Date;
  readBy: string[];
  targetUserIds?: string[];
  notificationType?: "web" | "mobile";
  title?: string;             // Notification title (e.g., "Match Assigned", "Match Updated")
  matchId?: string;           // Optional: Associated match ID
  eventType?: string;         // Optional: "match_created" | "match_updated" | "match_deleted" | "verification_approved"
}

export interface VerificationRequest {
  id: string; // same as the user's UID
  userId: string; // same as the user's UID
  firstName?: string;
  lastName?: string;
  email?: string;
  document: string; // Firebase Storage URL
  verificationStatus: "pending" | "approved" | "rejected";
  submissionDate: Date | Timestamp | null; // fallback if not available
  reviewDate?: Date | Timestamp | null;
  reviewedBy?: string;
}


// NEW: update-friendly type that allows FieldValue for timestamps
export type VerificationRequestUpdate =
  Partial<Omit<VerificationRequest, "submissionDate" | "reviewDate">> & {
    submissionDate?: Date | Timestamp | FieldValue | null;
    reviewDate?: Date | Timestamp | FieldValue | null;
  };

// Error handling helper
const handleFirestoreError = (error: FirestoreError, operation: string) => {
  console.error(`Firestore ${operation} error:`, {
    code: error.code,
    message: error.message,
    details: error,
    timestamp: new Date().toISOString(),
  });
  throw error;
};

// Get a specific user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    console.log("Fetching user by ID:", {
      userId,
      timestamp: new Date().toISOString(),
    });
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = { id: docSnap.id, ...docSnap.data() } as User;
      console.log("Successfully fetched user:", {
        id: userId,
        timestamp: new Date().toISOString(),
      });
      return userData;
    } else {
      console.log("User not found:", {
        id: userId,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  } catch (error) {
    console.error("Error getting user by ID:", {
      error,
      userId,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// User operations
export const subscribeToUsers = (
  role: "admin" | "referee" | null,
  callback: (users: User[]) => void,
) => {
  console.log("Setting up users subscription...", {
    role,
    timestamp: new Date().toISOString(),
  });

  // Create query based on role
  const q = role
    ? query(usersCollection, where("role", "==", role))
    : query(usersCollection);

  return onSnapshot(
    q,
    {
      includeMetadataChanges: true,
    },
    (snapshot) => {
      // Get all users
      const users = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as User,
      );

      console.log("Raw users data:", {
        count: users.length,
        users: users.map((u) => ({
          id: u.id,
          role: u.role,
          isAvailable: u.isAvailable,
        })),
      });

      // Filter users based on role and context
      let filteredUsers = users;

      // Only apply availability filter for referees in specific contexts
      if (role === "referee") {
        // Show all referees for the referee page
        //filteredUsers = users;
        filteredUsers = users.filter(user => user.verificationStatus === "approved");

      }

      callback(filteredUsers);
    },
    (error) => {
      console.error("Users subscription error:", {
        code: error.code,
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
      });
      handleFirestoreError(error as FirestoreError, "subscription");
    },
  );
};

// export const createUser = async (user: Omit<User, "id">): Promise<User> => {
//   try {
//     console.log("Creating new user:", {
//       data: user,
//       timestamp: new Date().toISOString(),
//     });

//     // Check if user already exists with this UID
//     const existingUserQuery = query(
//       usersCollection,
//       where("uid", "==", user.uid),
//     );
//     const existingUserDocs = await getDocs(existingUserQuery);

//     if (!existingUserDocs.empty) {
//       console.log("User already exists:", {
//         uid: user.uid,
//         timestamp: new Date().toISOString(),
//       });
//       const existingDoc = existingUserDocs.docs[0];
//       return { id: existingDoc.id, ...existingDoc.data() } as User;
//     }

//     // Set default values for new users
//     const userData = {
//       ...user,
//       isAvailable: true, // Always set isAvailable to true for new users
//       verificationStatus:
//         user.role === "referee"
//           ? ("approved" as "pending" | "approved" | "rejected")
//           : "pending", // Auto-approve referees, ensure pending for others
//     };

//     const docRef = await addDoc(usersCollection, userData);
//     const newUser = { id: docRef.id, ...userData };

//     console.log("Successfully created user:", {
//       id: docRef.id,
//       data: newUser,
//       timestamp: new Date().toISOString(),
//     });

//     // Create notification for new referee
//     if (user.role === "referee") {
//       await addNotification(
//         `New referee ${user.firstName} ${user.lastName} has been added to the system`,
//       );
//     }

//     return newUser;
//   } catch (error) {
//     console.error("Error creating user:", {
//       error,
//       timestamp: new Date().toISOString(),
//     });
//     throw error;
//   }
// };

export const updateUser = async (
  id: string,
  user: Partial<User>,
): Promise<void> => {
  try {
    console.log("Updating user:", {
      id,
      data: user,
      timestamp: new Date().toISOString(),
    });
    const docRef = doc(usersCollection, id);
    await updateDoc(docRef, user);
    console.log("Successfully updated user:", {
      id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating user:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    console.log("Deleting user:", { id, timestamp: new Date().toISOString() });

    // Get the user's name before deletion
    const userDoc = await getDoc(doc(usersCollection, id));
    const userName = userDoc.exists()
      ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
      : "Unknown user";

    // Delete the user
    await deleteDoc(doc(usersCollection, id));

    // Add notification about deletion
    // await addNotification(`${userName} has been removed from the system`);

    console.log("Successfully deleted user:", {
      id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting user:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const getUsers = async (role?: "admin" | "referee"): Promise<User[]> => {
  try {
    console.log("Fetching users...", {
      role,
      timestamp: new Date().toISOString(),
    });
    const q = role
      ? query(usersCollection, where("role", "==", role))
      : usersCollection;

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as User,
    );
    console.log("Successfully fetched users:", {
      count: users.length,
      timestamp: new Date().toISOString(),
    });
    return users;
  } catch (error) {
    console.error("Error getting users:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Match operations
export const getMatches = async (): Promise<Match[]> => {
  try {
    console.log("Fetching all matches...", {
      timestamp: new Date().toISOString(),
    });

    // Get all users first (for additional referee data if needed)
    const usersSnapshot = await getDocs(usersCollection);
    const users: Record<string, User> = {};
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data() as User;
      userData.id = doc.id;
      users[doc.id] = userData;
      // Also index by uid for easier lookup
      if (userData.uid) {
        users[userData.uid] = userData;
      }
    });

    // Now fetch matches
    const snapshot = await getDocs(matchesCollection);
    const matches = snapshot.docs.map((doc) => {
      const data = doc.data();
      const matchWithId = {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate(),
      } as Match;

      // Ensure homeTeam and awayTeam are objects
      if (typeof matchWithId.homeTeam === "string") {
        matchWithId.homeTeam = { name: matchWithId.homeTeam, logo: undefined };
      }

      if (typeof matchWithId.awayTeam === "string") {
        matchWithId.awayTeam = { name: matchWithId.awayTeam, logo: undefined };
      }

      // Ensure referees have the correct structure
      // If mainReferee is a string, try to resolve from users
      if (typeof matchWithId.mainReferee === "string") {
        const refereeUser = users[matchWithId.mainReferee];
        if (refereeUser) {
          matchWithId.mainReferee = {
            id: refereeUser.id || refereeUser.uid,
            name: `${refereeUser.firstName} ${refereeUser.lastName}`,
            image: refereeUser.photoURL || "",
          };
        } else {
          // If user not found, create a placeholder
          matchWithId.mainReferee = {
            id: matchWithId.mainReferee,
            name: "Unknown Referee",
            image: "",
          };
        }
      }

      if (matchWithId.assistantReferee1 && typeof matchWithId.assistantReferee1 === "string") {
        const refereeUser = users[matchWithId.assistantReferee1];
        if (refereeUser) {
          matchWithId.assistantReferee1 = {
            id: refereeUser.id || refereeUser.uid,
            name: `${refereeUser.firstName} ${refereeUser.lastName}`,
            image: refereeUser.photoURL || "",
          };
        } else {
          // If user not found, create a placeholder
          matchWithId.assistantReferee1 = {
            id: matchWithId.assistantReferee1,
            name: "Unknown Referee",
            image: "",
          };
        }
      }

      if (matchWithId.assistantReferee2 && typeof matchWithId.assistantReferee2 === "string") {
        const refereeUser = users[matchWithId.assistantReferee2];
        if (refereeUser) {
          matchWithId.assistantReferee2 = {
            id: refereeUser.id || refereeUser.uid,
            name: `${refereeUser.firstName} ${refereeUser.lastName}`,
            image: refereeUser.photoURL || "",
          };
        } else {
          // If user not found, create a placeholder
          matchWithId.assistantReferee2 = {
            id: matchWithId.assistantReferee2,
            name: "Unknown Referee",
            image: "",
          };
        }
      }

      // Convert "started" status from database to "live" for UI display
      if (matchWithId.status === "started") {
        matchWithId.status = "live";
      }

      return matchWithId;
    });

    console.log("Successfully fetched matches with proper structure:", {
      count: matches.length,
      timestamp: new Date().toISOString(),
    });

    return matches;
  } catch (error) {
    console.error("Error getting matches:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Helper function to get team name
const getTeamName = (
  team: { name: string; logo?: string },
): string => {
  return team.name;
};

// Generate next match code
// Generate next match code using Firestore transaction
export const getNextMatchCode = async (): Promise<string> => {
  const counterRef = doc(db, "counters", "matchCode");

//   const nextCode = await runTransaction(db, async (transaction) => {
//     const counterDoc = await transaction.get(counterRef);

//     let current = 0;
//     if (counterDoc.exists()) {
//       current = counterDoc.data().current;
//     }

//     const newCurrent = current + 1;
//     transaction.set(counterRef, { current: newCurrent });

//     return newCurrent.toString().padStart(4, "0");
//   });

//   return nextCode;
try {
  const nextCode = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let current = 0;
    if (counterDoc.exists()) {
      current = counterDoc.data().current;
    }
    
    const newCurrent = current + 1;
    transaction.set(counterRef, { current: newCurrent });
    
    return newCurrent.toString().padStart(5, "0");
  });
  
  console.log("Generated next match code:", nextCode);
  return nextCode;
} catch (error) {
  console.error("Error generating match code:", error);
  // Fallback to timestamp-based code if transaction fails
  const fallbackCode = Date.now().toString().slice(-5).padStart(5, "0");
  console.log("Using fallback match code due to error:", fallbackCode);
  return fallbackCode;
}
 };

// Add this to your createMatch function, after the matchCode generation:

export const createMatch = async (match: Omit<Match, "id">): Promise<Match> => {
  try {
    console.log("Creating new match:", {
      data: match,
      timestamp: new Date().toISOString(),
    });

    // Create a copy of the match data to prepare for storage
    const matchDataToStore = { ...match };

    // Ensure homeTeam and awayTeam are objects with the correct structure
    if (typeof matchDataToStore.homeTeam === "string") {
      matchDataToStore.homeTeam = { name: matchDataToStore.homeTeam, logo: undefined };
    }

    if (typeof matchDataToStore.awayTeam === "string") {
      matchDataToStore.awayTeam = { name: matchDataToStore.awayTeam, logo: undefined };
    }

    // Handle balls array - ensure it's always an array
    if (!matchDataToStore.balls || !Array.isArray(matchDataToStore.balls)) {
      matchDataToStore.balls = [];
    }

    // 1. Format the main referee data
    if (
      typeof matchDataToStore.mainReferee === "object" &&
      matchDataToStore.mainReferee
    ) { 
      const referee = matchDataToStore.mainReferee;

      if ("firstName" in referee && "lastName" in referee) {
        interface UserLike {
          id?: string;
          uid?: string;
          firstName: string;
          lastName: string;
          photoURL?: string | null;
        }
        const userRef = referee as UserLike;
        matchDataToStore.mainReferee = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // 2. Format assistant referee 1 data
    if (
      typeof matchDataToStore.assistantReferee1 === "object" &&
      matchDataToStore.assistantReferee1
    ) {
      const referee = matchDataToStore.assistantReferee1;

      if ("firstName" in referee && "lastName" in referee) {
        const userRef = referee as any;
        matchDataToStore.assistantReferee1 = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // 3. Format assistant referee 2 data
    if (
      typeof matchDataToStore.assistantReferee2 === "object" &&
      matchDataToStore.assistantReferee2
    ) {
      const referee = matchDataToStore.assistantReferee2;

      if ("firstName" in referee && "lastName" in referee) {
        const userRef = referee as any;
        matchDataToStore.assistantReferee2 = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // Convert "live" status to "started" for database storage
    if (matchDataToStore.status === "live") {
      matchDataToStore.status = "started";
    }

    // Check for duplicate/conflicting matches based on new rules
    const matchDate = match.date instanceof Date ? match.date : new Date(match.date);
    const homeTeamName = matchDataToStore.homeTeam.name.toLowerCase().trim();
    const awayTeamName = matchDataToStore.awayTeam.name.toLowerCase().trim();
    const venue = (matchDataToStore.venue || "").toLowerCase().trim();
    
    // Query existing matches to check for conflicts
    const existingMatchesSnapshot = await getDocs(matchesCollection);
    const conflictingMatch = existingMatchesSnapshot.docs.find((doc) => {
      const existingMatch = doc.data();
      const existingHomeTeam = existingMatch.homeTeam;
      const existingAwayTeam = existingMatch.awayTeam;
      
      // Get existing match date
      const existingDate = existingMatch.date;
      let existingDateObj: Date;
      
      if (existingDate?.toDate) {
        existingDateObj = existingDate.toDate();
      } else if (existingDate instanceof Date) {
        existingDateObj = existingDate;
      } else if (existingDate instanceof Timestamp) {
        existingDateObj = existingDate.toDate();
      } else {
        existingDateObj = new Date(existingDate);
      }
      
      // Calculate time difference in hours
      const timeDiffMs = Math.abs(matchDate.getTime() - existingDateObj.getTime());
      const timeDiffHours = timeDiffMs / (60 * 60 * 1000);
      
      // If time difference is less than 2 hours, check for conflicts
      if (timeDiffHours < 2) {
        const existingVenue = (existingMatch.venue || "").toLowerCase().trim();
        const sameVenue = venue === existingVenue;
        
        // Check if teams match (case-insensitive)
        const existingHomeName = (typeof existingHomeTeam === "string" 
          ? existingHomeTeam 
          : existingHomeTeam?.name || "").toLowerCase().trim();
        const existingAwayName = (typeof existingAwayTeam === "string" 
          ? existingAwayTeam 
          : existingAwayTeam?.name || "").toLowerCase().trim();
        
        // Check if both teams match (exact or swapped)
        const bothTeamsMatch = 
          (existingHomeName === homeTeamName && existingAwayName === awayTeamName) ||
          (existingHomeName === awayTeamName && existingAwayName === homeTeamName);
        
        // Check if one team matches
        const oneTeamMatches = 
          existingHomeName === homeTeamName ||
          existingHomeName === awayTeamName ||
          existingAwayName === homeTeamName ||
          existingAwayName === awayTeamName;
        
        // Rule: Same venue, same time, and one team matches -> conflict
        if (sameVenue && oneTeamMatches) {
          return { sameVenue, existingVenue, oneTeamMatch: true };
        }
        
        // Rule: Both teams match and time difference < 2 hours
        if (bothTeamsMatch) {
          return { sameVenue, existingVenue, oneTeamMatch: false };
        }
      }
      
      return false;
    });

    if (conflictingMatch) {
      const conflictDetails = conflictingMatch as any;
      
      // Rule: Same venue, same time, one team matches -> not allowed
      if (conflictDetails.oneTeamMatch && conflictDetails.sameVenue) {
        const error = new Error("A match with the same team at the same venue, date, and time already exists");
        (error as any).code = "DUPLICATE_MATCH_SAME_TEAM";
        throw error;
      }
      
      // Rule 1: Same info (teams, date, time, venue) - "match already exists"
      // Rule 2: Same teams, date, time, different venue - not allowed
      if (conflictDetails.sameVenue) {
        const error = new Error("Match already exists");
        (error as any).code = "DUPLICATE_MATCH";
        throw error;
      } else {
        const error = new Error("A match with the same teams at the same time already exists at a different venue");
        (error as any).code = "DUPLICATE_MATCH_DIFFERENT_VENUE";
        throw error;
      }
    }

    // Generate a sequential match code
    const matchCode = await getNextMatchCode();
    const matchData = {
      ...matchDataToStore,
      matchCode,
      createdAt: serverTimestamp(),
      date: Timestamp.fromDate(match.date),
    };

    console.log("Match data with balls:", matchData); // Debug log

    const docRef = await addDoc(matchesCollection, matchData);
    console.log("Successfully created match:", {
      id: docRef.id,
      matchCode,
      balls: matchData.balls,
      timestamp: new Date().toISOString(),
    });

    // Notify all admin users about the new match (web notification)
    try {
      const adminUsers = await getUsers("admin");
      // Use uid (Firebase Auth UID) instead of id (Firestore document ID) for notifications
      const adminUids = adminUsers.map((user) => user.uid).filter((uid): uid is string => !!uid);
      
      if (adminUids.length > 0) {
        const homeTeamName = matchDataToStore.homeTeam?.name || "Team 1";
        const awayTeamName = matchDataToStore.awayTeam?.name || "Team 2";
        const matchDate = new Date(match.date).toLocaleDateString();
        const matchTime = new Date(match.date).toLocaleTimeString();
        
        await addNotification(
          `New match created: ${homeTeamName} vs ${awayTeamName} on ${matchDate} at ${matchTime}`,
          adminUids,
          "web"
        );
        console.log("Notification sent to admins about new match", { adminUids });
      }
    } catch (notificationError) {
      console.error("Error sending match creation notification:", notificationError);
      // Don't throw - match creation should succeed even if notification fails
    }

    // Notify assigned referees about the new match (mobile notification)
    try {
      // 1. Get referee UIDs from the match document
      const refereeUids: string[] = [];
      if (matchDataToStore.mainReferee?.id) {
        refereeUids.push(matchDataToStore.mainReferee.id);
      }
      if (matchDataToStore.assistantReferee1?.id) {
        refereeUids.push(matchDataToStore.assistantReferee1.id);
      }
      if (matchDataToStore.assistantReferee2?.id) {
        refereeUids.push(matchDataToStore.assistantReferee2.id);
      }

      // Remove duplicates
      const uniqueRefereeUids = Array.from(new Set(refereeUids));

      // 2. Build title + message for referees
      if (uniqueRefereeUids.length > 0) {
        const homeTeamName = matchDataToStore.homeTeam?.name || "Home Team";
        const awayTeamName = matchDataToStore.awayTeam?.name || "Away Team";
        const matchDate = new Date(match.date).toLocaleDateString();
        const matchTime = new Date(match.date).toLocaleTimeString();

        const title = "New Match Assigned";
        const message = `You have been assigned to a new match: ${homeTeamName} vs ${awayTeamName} on ${matchDate} at ${matchTime}.`;

        // 3. Create Firestore notification for mobile
        await addMobileNotificationForRefs(
          title,
          message,
          uniqueRefereeUids,
          docRef.id,  // matchId
          "match_created"
        );

        // 4. Send push notification via API
        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL 
            ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
            : '/api/send-notification';
          
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message,
              targetUserIds: uniqueRefereeUids,
            }),
          });
          console.log("Mobile push notification sent to referees for match creation");
        } catch (pushError) {
          console.error("Failed to send mobile push for match creation:", pushError);
          // Don't throw - Firestore notification was already created
        }
      }
    } catch (mobileNotificationError) {
      console.error("Error sending mobile notification to referees:", mobileNotificationError);
      // Don't throw - match creation should succeed even if notification fails
    }

    return { id: docRef.id, matchCode, ...matchDataToStore, date: match.date };
  } catch (error) {
    console.error("Error creating match:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const updateMatch = async (
  id: string,
  match: Partial<Match>,
): Promise<void> => {
  try {
    console.log("Updating match:", {
      id,
      data: match,
      timestamp: new Date().toISOString(),
    });
    const docRef = doc(matchesCollection, id);

    // Get the current match data to compare changes
    const currentMatchSnap = await getDoc(docRef);
    const currentMatch = currentMatchSnap.data();

    // Create a copy of the match data to prepare for storage
    const matchDataToUpdate = { ...match };

    // Ensure homeTeam and awayTeam are objects with the correct structure if they're being updated
    if (matchDataToUpdate.homeTeam && typeof matchDataToUpdate.homeTeam === "string") {
      matchDataToUpdate.homeTeam = { name: matchDataToUpdate.homeTeam, logo: undefined };
    }

    if (matchDataToUpdate.awayTeam && typeof matchDataToUpdate.awayTeam === "string") {
      matchDataToUpdate.awayTeam = { name: matchDataToUpdate.awayTeam, logo: undefined };
    }

    // Handle balls array - ensure it's always an array if provided
    if (matchDataToUpdate.balls !== undefined) {
      if (!Array.isArray(matchDataToUpdate.balls)) {
        matchDataToUpdate.balls = [];
      }
    }

    // Format referee data for storage if they're being updated

    // 1. Format the main referee data if it's being updated
    if (
      matchDataToUpdate.mainReferee &&
      typeof matchDataToUpdate.mainReferee === "object"
    ) {
      const referee = matchDataToUpdate.mainReferee;

      if ("firstName" in referee && "lastName" in referee) {
        const userRef = referee as any;
        matchDataToUpdate.mainReferee = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // 2. Format assistant referee 1 data if it's being updated
    if (
      matchDataToUpdate.assistantReferee1 &&
      typeof matchDataToUpdate.assistantReferee1 === "object"
    ) {
      const referee = matchDataToUpdate.assistantReferee1;

      if ("firstName" in referee && "lastName" in referee) {
        const userRef = referee as any;
        matchDataToUpdate.assistantReferee1 = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // 3. Format assistant referee 2 data if it's being updated
    if (
      matchDataToUpdate.assistantReferee2 &&
      typeof matchDataToUpdate.assistantReferee2 === "object"
    ) {
      const referee = matchDataToUpdate.assistantReferee2;

      if ("firstName" in referee && "lastName" in referee) {
        const userRef = referee as any;
        matchDataToUpdate.assistantReferee2 = {
          id: userRef.id || userRef.uid || "",
          name: `${userRef.firstName} ${userRef.lastName}`,
          image: userRef.photoURL || "",
        };
      }
    }

    // Convert "live" status to "started" for database storage
    if (matchDataToUpdate.status === "live") {
      matchDataToUpdate.status = "started";
    }

    // Check for duplicate/conflicting matches if teams, date, or venue are being updated
    if (matchDataToUpdate.homeTeam || matchDataToUpdate.awayTeam || matchDataToUpdate.date || matchDataToUpdate.venue) {
      // Get the final values (use updated values if provided, otherwise use current match values)
      const finalHomeTeam = matchDataToUpdate.homeTeam || currentMatch?.homeTeam;
      const finalAwayTeam = matchDataToUpdate.awayTeam || currentMatch?.awayTeam;
      const finalDate = matchDataToUpdate.date 
        ? (matchDataToUpdate.date instanceof Date ? matchDataToUpdate.date : new Date(matchDataToUpdate.date))
        : (currentMatch?.date?.toDate ? currentMatch.date.toDate() : new Date(currentMatch?.date || new Date()));
      const finalVenue = (matchDataToUpdate.venue || currentMatch?.venue || "").toLowerCase().trim();

      const homeTeamName = (typeof finalHomeTeam === "string" 
        ? finalHomeTeam 
        : finalHomeTeam?.name || "").toLowerCase().trim();
      const awayTeamName = (typeof finalAwayTeam === "string" 
        ? finalAwayTeam 
        : finalAwayTeam?.name || "").toLowerCase().trim();

      // Query existing matches to check for conflicts (excluding current match)
      const existingMatchesSnapshot = await getDocs(matchesCollection);
      const conflictingMatch = existingMatchesSnapshot.docs.find((doc) => {
        if (doc.id === id) return false; // Skip current match

        const existingMatch = doc.data();
        const existingHomeTeam = existingMatch.homeTeam;
        const existingAwayTeam = existingMatch.awayTeam;

        // Get existing match date
        const existingDate = existingMatch.date;
        let existingDateObj: Date;

        if (existingDate?.toDate) {
          existingDateObj = existingDate.toDate();
        } else if (existingDate instanceof Date) {
          existingDateObj = existingDate;
        } else if (existingDate instanceof Timestamp) {
          existingDateObj = existingDate.toDate();
        } else {
          existingDateObj = new Date(existingDate);
        }

        // Calculate time difference in hours
        const timeDiffMs = Math.abs(finalDate.getTime() - existingDateObj.getTime());
        const timeDiffHours = timeDiffMs / (60 * 60 * 1000);

        // If time difference is less than 2 hours, check for conflicts
        if (timeDiffHours < 2) {
          const existingVenue = (existingMatch.venue || "").toLowerCase().trim();
          const sameVenue = finalVenue === existingVenue;

          // Check if teams match (case-insensitive)
          const existingHomeName = (typeof existingHomeTeam === "string" 
            ? existingHomeTeam 
            : existingHomeTeam?.name || "").toLowerCase().trim();
          const existingAwayName = (typeof existingAwayTeam === "string" 
            ? existingAwayTeam 
            : existingAwayTeam?.name || "").toLowerCase().trim();

          // Check if both teams match (exact or swapped)
          const bothTeamsMatch = 
            (existingHomeName === homeTeamName && existingAwayName === awayTeamName) ||
            (existingHomeName === awayTeamName && existingAwayName === homeTeamName);

          // Check if one team matches
          const oneTeamMatches = 
            existingHomeName === homeTeamName ||
            existingHomeName === awayTeamName ||
            existingAwayName === homeTeamName ||
            existingAwayName === awayTeamName;

          // Rule: Same venue, same time, and one team matches -> conflict
          if (sameVenue && oneTeamMatches) {
            return { sameVenue, existingVenue, oneTeamMatch: true };
          }

          // Rule: Both teams match and time difference < 2 hours
          if (bothTeamsMatch) {
            return { sameVenue, existingVenue, oneTeamMatch: false };
          }
        }

        return false;
      });

      if (conflictingMatch) {
        const conflictDetails = conflictingMatch as any;
        
        // Rule: Same venue, same time, one team matches -> not allowed
        if (conflictDetails.oneTeamMatch && conflictDetails.sameVenue) {
          const error = new Error("A match with the same team at the same venue, date, and time already exists");
          (error as any).code = "DUPLICATE_MATCH_SAME_TEAM";
          throw error;
        }
        
        if (conflictDetails.sameVenue) {
          const error = new Error("Match already exists");
          (error as any).code = "DUPLICATE_MATCH";
          throw error;
        } else {
          const error = new Error("A match with the same teams at the same time already exists at a different venue");
          (error as any).code = "DUPLICATE_MATCH_DIFFERENT_VENUE";
          throw error;
        }
      }
    }

    // Create a clean copy of the data to update
    const updateData: Record<string, any> = {};

    // Copy all properties except date
    Object.keys(matchDataToUpdate).forEach((key) => {
      if (key !== "date") {
        const value = matchDataToUpdate[key as keyof Match];
        // Only add defined values to updateData
        if (value !== undefined) {
          updateData[key] = value;
        }
      }
    });

    // Handle date conversion separately
    if (matchDataToUpdate.date) {
      const dateObj =
        matchDataToUpdate.date instanceof Date
          ? matchDataToUpdate.date
          : new Date(matchDataToUpdate.date);

      if (!isNaN(dateObj.getTime())) {
        updateData.date = Timestamp.fromDate(dateObj);
      }
    }

    console.log("Update data with balls:", updateData); // Debug log

    // Get current match data before updating (for referee notification)
    const existingMatchDoc = await getDoc(docRef);
    const existingMatchData = existingMatchDoc.exists() ? existingMatchDoc.data() : null;

    await updateDoc(docRef, updateData);
    console.log("Successfully updated match:", {
      id,
      balls: updateData.balls,
      timestamp: new Date().toISOString(),
    });

    // Notify all admin users about the match update (web notification)
    try {
      const adminUsers = await getUsers("admin");
      const adminUids = adminUsers.map((user) => user.uid).filter((uid): uid is string => !!uid);
      
      if (adminUids.length > 0) {
        // Get match details for notification message
        const updatedMatch = existingMatchData ? { ...existingMatchData, ...updateData } : updateData;
        const homeTeamName = updatedMatch.homeTeam?.name || existingMatchData?.homeTeam?.name || "Home Team";
        const awayTeamName = updatedMatch.awayTeam?.name || existingMatchData?.awayTeam?.name || "Away Team";
        const matchDateObj = updatedMatch.date || existingMatchData?.date;
        let matchDate = new Date().toLocaleDateString();
        let matchTime = new Date().toLocaleTimeString();
        
        if (matchDateObj) {
          if (matchDateObj instanceof Date) {
            matchDate = matchDateObj.toLocaleDateString();
            matchTime = matchDateObj.toLocaleTimeString();
          } else if (matchDateObj?.toDate) {
            const date = matchDateObj.toDate();
            matchDate = date.toLocaleDateString();
            matchTime = date.toLocaleTimeString();
          } else if (matchDateObj instanceof Timestamp) {
            const date = matchDateObj.toDate();
            matchDate = date.toLocaleDateString();
            matchTime = date.toLocaleTimeString();
          }
        }
        
        await addNotification(
          `Match updated: ${homeTeamName} vs ${awayTeamName} on ${matchDate} at ${matchTime}`,
          adminUids,
          "web"
        );
        console.log("Notification sent to admins about match update", { adminUids });
      }
    } catch (notificationError) {
      console.error("Error sending match update notification to admins:", notificationError);
      // Don't throw - match update should succeed even if notification fails
    }

    // Notify assigned referees about the match update (mobile notification)
    try {
      // 1. Build list of referees from updated match
      const updatedMatch = existingMatchData ? { ...existingMatchData, ...updateData } : updateData;
      const refereeUids: string[] = [];
      
      // Get referee IDs from updated match (check both current and updated values)
      const mainRefereeId = updatedMatch.mainReferee?.id || existingMatchData?.mainReferee?.id;
      const assistant1Id = updatedMatch.assistantReferee1?.id || existingMatchData?.assistantReferee1?.id;
      const assistant2Id = updatedMatch.assistantReferee2?.id || existingMatchData?.assistantReferee2?.id;
      
      if (mainRefereeId) refereeUids.push(mainRefereeId);
      if (assistant1Id) refereeUids.push(assistant1Id);
      if (assistant2Id) refereeUids.push(assistant2Id);

      const uniqueRefereeUids = Array.from(new Set(refereeUids));

      // 2. Title + message
      if (uniqueRefereeUids.length > 0) {
        const homeTeamName = updatedMatch.homeTeam?.name || existingMatchData?.homeTeam?.name || "Home Team";
        const awayTeamName = updatedMatch.awayTeam?.name || existingMatchData?.awayTeam?.name || "Away Team";
        const matchDateObj = updatedMatch.date || existingMatchData?.date;
        let matchDate = new Date().toLocaleDateString();
        let matchTime = new Date().toLocaleTimeString();
        
        if (matchDateObj) {
          if (matchDateObj instanceof Date) {
            matchDate = matchDateObj.toLocaleDateString();
            matchTime = matchDateObj.toLocaleTimeString();
          } else if (matchDateObj?.toDate) {
            const date = matchDateObj.toDate();
            matchDate = date.toLocaleDateString();
            matchTime = date.toLocaleTimeString();
          } else if (matchDateObj instanceof Timestamp) {
            const date = matchDateObj.toDate();
            matchDate = date.toLocaleDateString();
            matchTime = date.toLocaleTimeString();
          }
        }

        const title = "Match Updated";
        const message = `Match details have been updated for your assigned match: ${homeTeamName} vs ${awayTeamName} on ${matchDate} at ${matchTime}.`;

        await addMobileNotificationForRefs(
          title,
          message,
          uniqueRefereeUids,
          id,  // matchId
          "match_updated"
        );

        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL 
            ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
            : '/api/send-notification';
          
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message,
              targetUserIds: uniqueRefereeUids,
            }),
          });
          console.log("Mobile push notification sent to referees for match update");
        } catch (pushError) {
          console.error("Failed to send mobile push for match update:", pushError);
          // Don't throw - Firestore notification was already created
        }
      }
    } catch (mobileNotificationError) {
      console.error("Error sending mobile notification to referees for match update:", mobileNotificationError);
      // Don't throw - match update should succeed even if notification fails
    }
  } catch (error) {
    console.error("Error updating match:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    console.log("Deleting match:", { id, timestamp: new Date().toISOString() });
    const docRef = doc(matchesCollection, id);
    
    // Read match data before deletion to notify referees
    const matchSnap = await getDoc(docRef);
    
    if (matchSnap.exists()) {
      const match = matchSnap.data();
      
      // Notify all admin users about the match deletion (web notification)
      try {
        const adminUsers = await getUsers("admin");
        const adminUids = adminUsers.map((user) => user.uid).filter((uid): uid is string => !!uid);
        
        if (adminUids.length > 0) {
          const homeTeamName = match.homeTeam?.name || "Home Team";
          const awayTeamName = match.awayTeam?.name || "Away Team";
          const matchDateObj = match.date;
          let matchDate = new Date().toLocaleDateString();
          let matchTime = new Date().toLocaleTimeString();
          
          if (matchDateObj) {
            if (matchDateObj instanceof Date) {
              matchDate = matchDateObj.toLocaleDateString();
              matchTime = matchDateObj.toLocaleTimeString();
            } else if (matchDateObj?.toDate) {
              const date = matchDateObj.toDate();
              matchDate = date.toLocaleDateString();
              matchTime = date.toLocaleTimeString();
            } else if (matchDateObj instanceof Timestamp) {
              const date = matchDateObj.toDate();
              matchDate = date.toLocaleDateString();
              matchTime = date.toLocaleTimeString();
            }
          }
          
          await addNotification(
            `Match deleted: ${homeTeamName} vs ${awayTeamName} on ${matchDate} at ${matchTime}`,
            adminUids,
            "web"
          );
          console.log("Notification sent to admins about match deletion", { adminUids });
        }
      } catch (adminNotificationError) {
        console.error("Error sending match deletion notification to admins:", adminNotificationError);
        // Don't throw - match deletion should succeed even if notification fails
      }
      
      // Get referee UIDs from the match
      const refereeUids: string[] = [];
      if (match.mainReferee?.id) {
        refereeUids.push(match.mainReferee.id);
      }
      if (match.assistantReferee1?.id) {
        refereeUids.push(match.assistantReferee1.id);
      }
      if (match.assistantReferee2?.id) {
        refereeUids.push(match.assistantReferee2.id);
      }

      const uniqueRefereeUids = Array.from(new Set(refereeUids));

      // Notify referees about match cancellation (mobile notification)
      if (uniqueRefereeUids.length > 0) {
        const homeTeamName = match.homeTeam?.name || "Home Team";
        const awayTeamName = match.awayTeam?.name || "Away Team";
        const title = "Match Cancelled";
        const message = `Your assigned match ${homeTeamName} vs ${awayTeamName} has been cancelled.`;

        try {
          await addMobileNotificationForRefs(
            title,
            message,
            uniqueRefereeUids,
            id,  // matchId
            "match_deleted"
          );

          // Send push notification via API
          const apiUrl = import.meta.env.VITE_API_BASE_URL 
            ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
            : '/api/send-notification';
          
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message,
              targetUserIds: uniqueRefereeUids,
            }),
          });
          console.log("Mobile push notification sent to referees for match deletion");
        } catch (notificationError) {
          console.error("Failed to send mobile notification for match deletion:", notificationError);
          // Don't throw - match deletion should succeed even if notification fails
        }
      }
    }

    // Delete the match document
    await deleteDoc(docRef);
    console.log("Successfully deleted match:", {
      id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting match:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Notification operations
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
) => {
  console.log("Setting up notifications subscription...", {
    collection: "notifications",
    userId,
    timestamp: new Date().toISOString(),
  });

  // Query all notifications
  const q = query(notificationsCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      console.log("Received notifications update:", {
        count: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        metadata: snapshot.metadata,
      });
      const notifications = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            message: data.message,
            // timestamp: data.timestamp.toDate(),
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
            readBy: data.readBy || [],
            targetUserIds: data.targetUserIds || [],
            notificationType: data.notificationType,
            title: data.title,
            matchId: data.matchId,
            eventType: data.eventType,
          } as Notification;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(notifications);
    },
    (error) => {
      console.error("Notifications subscription error:", {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      handleFirestoreError(error as FirestoreError, "subscription");
    },
  );
};

export const addFCMToken = async (
  userId: string, // This should be Firebase Auth UID
  token: string,
): Promise<void> => {
  try {
    console.log("Adding FCM token:", {
      userId,
      token: token.substring(0, 10) + "...", // Log only part of the token for security
      timestamp: new Date().toISOString(),
    });

    // Try to find user by document ID first (for backward compatibility)
    let userRef = doc(usersCollection, userId);
    let userDoc = await getDoc(userRef);
    
    // If not found, try to find by uid field (Firebase Auth UID)
    if (!userDoc.exists()) {
      const userQuery = query(usersCollection, where("uid", "==", userId));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        userRef = querySnapshot.docs[0].ref;
        userDoc = querySnapshot.docs[0];
      }
    }
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log("Successfully added FCM token");
    } else {
      throw new Error(`User not found for ID: ${userId}`);
    }
  } catch (error) {
    console.error("Error adding FCM token:", {
      error,
      userId,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const removeFCMToken = async (
  userId: string, // This should be Firebase Auth UID
  token: string,
): Promise<void> => {
  try {
    console.log("Removing FCM token:", {
      userId,
      token: token.substring(0, 10) + "...",
      timestamp: new Date().toISOString(),
    });

    // Try to find user by document ID first (for backward compatibility)
    let userRef = doc(usersCollection, userId);
    let userDoc = await getDoc(userRef);
    
    // If not found, try to find by uid field (Firebase Auth UID)
    if (!userDoc.exists()) {
      const userQuery = query(usersCollection, where("uid", "==", userId));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        userRef = querySnapshot.docs[0].ref;
        userDoc = querySnapshot.docs[0];
      }
    }
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(token),
      });
      console.log("Successfully removed FCM token");
    } else {
      throw new Error(`User not found for ID: ${userId}`);
    }
  } catch (error) {
    console.error("Error removing FCM token:", {
      error,
      userId,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const addNotification = async (
  message: string,
  targetUserIds?: string[],
  notificationType: "web" | "mobile" = "web",
): Promise<void> => {
  try {
    console.log("Creating new notification:", {
      message,
      targetUserIds,
      notificationType,
      timestamp: new Date().toISOString(),
    });

    // Store the notification in Firestore
    const notificationData = {
      message,
      timestamp: Timestamp.fromDate(new Date()),
      readBy: [],
      targetUserIds: targetUserIds || [],
      notificationType, // Add notification type to stored data
    };

    const notificationRef = await addDoc(
      notificationsCollection,
      notificationData,
    );
    console.log("Successfully created notification:", notificationRef.id);

    // If specific users are targeted, get their FCM tokens
    if (targetUserIds && targetUserIds.length > 0) {
      const userSnapshots = await Promise.all(
        targetUserIds.map((userId) => getDoc(doc(usersCollection, userId))),
      );

      // Collect all FCM tokens
      const fcmTokens = userSnapshots
        .filter((snap) => snap.exists())
        .map((snap) => snap.data().fcmTokens || [])
        .flat();

      if (fcmTokens.length > 0) {
        console.log("Found FCM tokens for notification:", {
          count: fcmTokens.length,
          timestamp: new Date().toISOString(),
        });

        // Send push notifications using FCM tokens
        const payload = {
          notification: {
            title: "New Notification",
            body: message,
          },
        };

        // Assuming you have an FCM service or library to send notifications
        // try {
        //   const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //       Authorization: `key=YOUR_SERVER_KEY`, // need to chng
        //     },
        //     body: JSON.stringify({
        //       registration_ids: fcmTokens,
        //       ...payload,
        //     }),
        //   });

        //   if (!response.ok) {
        //     console.error("Failed to send FCM notifications:", {
        //       status: response.status,
        //       statusText: response.statusText,
        //     });
        //   } else {
        //     console.log("Successfully sent FCM notifications");
        //   }
        // } catch (error) {
        //   console.error("Error sending FCM notifications:", error);
        // }
      }
    }
  } catch (error) {
    console.error("Error creating notification:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Helper to create a mobile notification for referees
export const addMobileNotificationForRefs = async (
  title: string,
  message: string,
  refereeUids: string[],
  matchId?: string,
  eventType?: string
): Promise<void> => {
  if (!refereeUids || refereeUids.length === 0) {
    console.log("No referee UIDs provided, skipping mobile notification");
    return;
  }

  try {
    console.log("Creating mobile notification for referees:", {
      title,
      refereeCount: refereeUids.length,
      matchId,
      eventType,
      timestamp: new Date().toISOString(),
    });

    const notificationData: any = {
      title,
      message,
      timestamp: Timestamp.fromDate(new Date()),
      readBy: [],
      targetUserIds: refereeUids,
      notificationType: "mobile",
    };

    // Add optional fields if provided
    if (matchId) {
      notificationData.matchId = matchId;
    }
    if (eventType) {
      notificationData.eventType = eventType;
    }

    const notificationRef = await addDoc(
      notificationsCollection,
      notificationData,
    );
    
    console.log("Successfully created mobile notification:", notificationRef.id);
  } catch (error) {
    console.error("Error creating mobile notification for referees:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const markNotificationsAsRead = async (
  userId: string,
): Promise<void> => {
  try {
    console.log("Marking notifications as read:", {
      userId,
      timestamp: new Date().toISOString(),
    });

    const snapshot = await getDocs(notificationsCollection);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      const readBy = doc.data().readBy || [];
      if (!readBy.includes(userId)) {
        batch.update(doc.ref, {
          readBy: arrayUnion(userId),
        });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking notifications as read:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Verification operations
export const getVerificationRequests = async (): Promise<
  VerificationRequest[]
> => {

  try {
    console.log("Fetching verification requests...", {
      timestamp: new Date().toISOString(),
    });
    
    // const q = query(
    //   collection(db, "users"),
    //   where("role", "==", "referee"),
    //   where("verificationStatus", "==", "pending"),
    // );
    const q = query(
      collection(db, "users"),
      where("role", "==", "referee")
    );    
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.id,
      ...doc.data(),
      submissionDate: doc.data().createdAt?.toDate?.() || new Date(),
      reviewDate: doc.data().reviewDate?.toDate?.() || null,
    })) as VerificationRequest[];
    console.log("Successfully fetched verification requests:", {
      count: requests.length,
      timestamp: new Date().toISOString(),
    });
    return requests;
  } catch (error) {
    console.error("Error getting verification requests:", {
      error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
// Add a subscription function for real-time verification requests updates
export const subscribeToVerificationRequests = (
  callback: (requests: VerificationRequest[]) => void
) => {
  console.log("Setting up verification requests subscription...", {
    timestamp: new Date().toISOString(),
  });

  // ✅ Include ALL referee users; let the UI split into Pending / Reviewed
  //    Add orderBy to keep a stable order (adjust field if needed)
  const q = query(
    collection(db, "users"),
    where("role", "==", "referee"),
  );

  return onSnapshot(
    q,
    {
      includeMetadataChanges: true,
    },
    (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        userId: doc.id,
        ...doc.data(),
        // Safely coerce Firestore Timestamp/Date -> Date for UI
        submissionDate: doc.data().createdAt?.toDate?.() || new Date(),
        reviewDate: doc.data().reviewDate?.toDate?.() || null,
      })) as VerificationRequest[];

      console.log("Verification requests updated:", {
        count: requests.length,
        timestamp: new Date().toISOString(),
      });
      callback(requests);
    },
    (error) => {
      console.error("Verification requests subscription error:", {
        code: error.code,
        message: error.message,
        details: error,
        timestamp: new Date().toISOString(),
      });
      handleFirestoreError(error as FirestoreError, "subscription");
    }
  );
};

// export const subscribeToVerificationRequests = (
//   callback: (requests: VerificationRequest[]) => void
// ) => {
//   console.log("Setting up verification requests subscription...", {
//     timestamp: new Date().toISOString(),
//   });

//   const q = query(
//     collection(db, "users"),
//     where("role", "==", "referee"),
//     where("verificationStatus", "==", "pending"),
//   );

//   // const snapshot = await getDocs(q);

//   // const requests = snapshot.docs.map((doc) => ({
//   //   id: doc.id,
//   //   userId: doc.id,
//   //   ...doc.data(),
//   //   submissionDate: doc.data().createdAt?.toDate?.() || new Date(),
//   //   reviewDate: doc.data().reviewDate?.toDate?.() || null,
//   // })) as VerificationRequest[];

//   // return requests;

//   return onSnapshot(
//     q,
//     {
//       includeMetadataChanges: true,
//     },
//     (snapshot) => {
//       const requests = snapshot.docs.map((doc) => ({
//         id: doc.id,
//         userId: doc.id,
//         ...doc.data(),
//         submissionDate: doc.data().createdAt?.toDate?.() || new Date(),
//         reviewDate: doc.data().reviewDate?.toDate?.() || null,
//       })) as VerificationRequest[];
      
//       console.log("Verification requests updated:", {
//         count: requests.length,
//         timestamp: new Date().toISOString(),
//       });
//       callback(requests);
//     },
//     (error) => {
//       console.error("Verification requests subscription error:", {
//         code: error.code,
//         message: error.message,
//         details: error,
//         timestamp: new Date().toISOString(),
//       });
//       handleFirestoreError(error as FirestoreError, "subscription");
//     }
//   );
// };

export const updateVerificationRequest = async (
  id: string,
  update: VerificationRequestUpdate,
  // update: Partial<VerificationRequest>,
): Promise<void> => {
  try {
    console.log("Updating verification request:", {
      id,
      update,
      timestamp: new Date().toISOString(),
    });

    const userRef = doc(usersCollection, id);

    
    // Build payload:
    // - If caller passed reviewDate, use it (supports serverTimestamp()).
    // - Else, auto-stamp reviewDate only when status becomes approved/rejected.
    const payload: VerificationRequestUpdate = { ...update };

    if (payload.reviewDate === undefined) {
      if (payload.verificationStatus && payload.verificationStatus !== "pending") {
        payload.reviewDate = serverTimestamp();
      }
    }

    await updateDoc(userRef, payload as any);

    // Notify admin ONLY when a new request is submitted (status changes to pending)
    if (update.verificationStatus === "pending") {
      try {
        const adminUsers = await getUsers("admin");
        // Use uid (Firebase Auth UID) instead of id (Firestore document ID) for notifications
        const adminUids = adminUsers.map((user) => user.uid).filter((uid): uid is string => !!uid);

        if (adminUids.length > 0) {
          const userDoc = await getDoc(doc(usersCollection, id));
          const userData = userDoc.data();
          const name =
            userData?.firstName && userData?.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData?.email || "Unknown user";

          await addNotification(
            `New verification request submitted by ${name}`,
            adminUids,
            "web"
          );
          console.log("Notification sent to admins about new verification request", { adminUids });
        }
      } catch (notificationError) {
        console.error("Error sending verification request notification:", notificationError);
        // Don't throw - verification update should succeed even if notification fails
      }
    }

    // Notify referee when verification is approved (mobile notification)
    if (update.verificationStatus === "approved") {
      try {
        const userDoc = await getDoc(doc(usersCollection, id));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const uid = userData.uid || id; // Firebase Auth UID
          const name =
            userData.firstName && userData.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : userData.email || "Referee";

          const title = "Verification Approved";
          const message = `Hi ${name}, your referee verification has been approved. You can now receive match assignments in Hakkim.`;

          // 1. Firestore notification for mobile app
          await addMobileNotificationForRefs(
            title,
            message,
            [uid],
            undefined,  // No matchId for verification approval
            "verification_approved"
          );

          // 2. Push notification
          try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL 
              ? `${import.meta.env.VITE_API_BASE_URL}/api/send-notification`
              : '/api/send-notification';
            
            await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message,
                targetUserIds: [uid],
              }),
            });
            console.log("Mobile push notification sent to referee for verification approval");
          } catch (pushError) {
            console.error("Failed to send mobile push for verification approval:", pushError);
            // Don't throw - Firestore notification was already created
          }
        }
      } catch (notificationError) {
        console.error("Error sending verification approval notification to referee:", notificationError);
        // Don't throw - verification update should succeed even if notification fails
      }
    }

    //     await addNotification(
    //       `New verification request submitted by ${name}`,
    //       adminIds,
    //       "web"
    //     );
    //   }
    // }


    console.log("Verification request updated successfully.");
  } catch (error) {
    console.error("Error updating verification request:", error);
    throw error;
  }
};

// Add getReferees function
export const getReferees = async (): Promise<User[]> => {
  return getUsers("referee");
};

// Initialize admin user with error handling and retries
export const initializeAdminUser = async () => {
  try {
    console.log("Starting admin user initialization...", {
      timestamp: new Date().toISOString(),
      database: "Hakkim-Database",
    });

    const adminQuery = query(usersCollection, where("role", "==", "admin"));
    const snapshot = await getDocs(adminQuery);

    console.log("Checked for existing admin:", {
      exists: !snapshot.empty,
      count: snapshot.docs.length,
      timestamp: new Date().toISOString(),
    });

    if (snapshot.empty) {
      // Create Firebase Auth user
      const adminEmail = "admin@footballadmin.com";
      const adminPassword = "Admin123!"; // Should be changed after first login

      console.log("Creating admin auth user...", {
        email: adminEmail,
        timestamp: new Date().toISOString(),
      });

      // Placeholder for admin creation - needs alternative approach due to circular dependency
      const adminData = {
        email: adminEmail,
        firstName: "System",
        lastName: "Admin",
        uid: "admin-uid-placeholder", // Placeholder UID - needs a proper solution
        role: "admin",
        isAvailable: true,
      };

      console.log("Creating admin Firestore document...", {
        data: adminData,
        timestamp: new Date().toISOString(),
      });

      const docRef = await addDoc(usersCollection, adminData);

      console.log("Admin Firestore document created:", {
        id: docRef.id,
        timestamp: new Date().toISOString(),
      });

      return true;
    }

    console.log("Admin user already exists, skipping initialization");
    return false;
  } catch (error: any) {
    console.error("Error in admin initialization:", {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const initializeSampleData = async () => {
  try {
    console.log("Starting sample data initialization...", {
      timestamp: new Date().toISOString(),
      database: "Hakkim-Database",
    });

    // Check and create sample matches
    const matchesSnapshot = await getDocs(matchesCollection);
    console.log("Checked matches collection:", {
      exists: !matchesSnapshot.empty,
      count: matchesSnapshot.docs.length,
      timestamp: new Date().toISOString(),
    });

    if (matchesSnapshot.empty) {
      const sampleMatches = [
        {
          venue: "Old Trafford",
          date: new Date("2025-03-01T15:00:00"),
          league: "Premier League",
          status: "scheduled",
          homeTeam: { 
            name: "Manchester United", 
            logo: "https://example.com/manchester-logo.png"
          },
          awayTeam: { 
            name: "Liverpool", 
            logo: "https://example.com/liverpool-logo.png"
          },
          mainReferee: {
            id: "ref123",
            name: "John Smith",
            image: "https://example.com/referee-images/john-smith.png",
          },
          assistantReferee1: {
            id: "ref124",
            name: "Mike Johnson",
            image: "https://example.com/referee-images/mike-johnson.png",
          },
          assistantReferee2: {
            id: "ref125",
            name: "David Wilson",
            image: "https://example.com/referee-images/david-wilson.png",
          },
        },

        {
          venue: "Emirates Stadium",
          date: new Date("2025-03-08T17:30:00"),
          league: "Premier League",
          status: "scheduled",
          homeTeam: { 
            name: "Arsenal", 
            logo: "https://example.com/arsenal-logo.png"
          },
          awayTeam: { 
            name: "Chelsea", 
            logo: "https://example.com/chelsea-logo.png"
          },
          mainReferee: {
            id: "ref126",
            name: "Sarah Parker",
            image: "https://example.com/referee-images/sarah-parker.png",
          },
          assistantReferee1: {
            id: "ref127",
            name: "James Brown",
            image: "https://example.com/referee-images/james-brown.png",
          },
          assistantReferee2: {
            id: "ref128",
            name: "Robert Taylor",
            image: "https://example.com/referee-images/robert-taylor.png",
          },
        },
      ];

      console.log("Creating sample matches...", {
        count: sampleMatches.length,
        timestamp: new Date().toISOString(),
      });

      for (const match of sampleMatches) {
        const docRef = await addDoc(matchesCollection, match);
        console.log("Created match:", {
          id: docRef.id,
          match: match,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check and create sample notifications
    const notificationsSnapshot = await getDocs(notificationsCollection);
    console.log("Checked notifications collection:", {
      exists: !notificationsSnapshot.empty,
      count: notificationsSnapshot.docs.length,
      timestamp: new Date().toISOString(),
    });

    if (notificationsSnapshot.empty) {
      const sampleNotifications = [
        "Welcome to the Football Admin Dashboard!",
      ];

      console.log("Creating sample notifications...", {
        count: sampleNotifications.length,
        timestamp: new Date().toISOString(),
      });

      for (const message of sampleNotifications) {
        const notificationData = {
          message,
          timestamp: Timestamp.fromDate(new Date()),
          readBy: [],
        };
        const docRef = await addDoc(notificationsCollection, notificationData);
        console.log("Created notification:", {
          id: docRef.id,
          message: message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log("Sample data initialization completed successfully", {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in sample data initialization:", {
      error,
      errorMessage: (error as Error).message,
      errorCode: (error as any).code,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Immediately invoke initialization
console.log("Starting database initialization...", {
  timestamp: new Date().toISOString(),
  database: "Hakkim-Database",
});

Promise.all([initializeAdminUser(), initializeSampleData()])
  .then(() => {
    console.log("Database initialization completed", {
      timestamp: new Date().toISOString(),
      database: "Hakkim-Database",
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", {
      error,
      errorMessage: (error as Error).message,
      errorCode: (error as any).code,
      timestamp: new Date().toISOString(),
      database: "Hakkim-Database",
    });
  });

export {
  usersCollection,
  matchesCollection,
  notificationsCollection,
  //verificationRequestsCollection,
  Timestamp,
};






export async function getBalls() {
  const querySnapshot = await getDocs(collection(db, "Balls")); 
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}