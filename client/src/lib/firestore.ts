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
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
const usersCollection = collection(db, 'users');
const matchesCollection = collection(db, 'matches');
const notificationsCollection = collection(db, 'notifications');
const verificationRequestsCollection = collection(db, 'verificationRequests');

// Types
export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  photoURL: string | null; 
  uid: string;
  role: 'admin' | 'referee';
  phone?: string;
  isAvailable: boolean; 
  verificationStatus: 'pending' | 'approved' | 'rejected';
  documentationUrl?: string;
  fcmTokens?: string[]; // Array of FCM tokens for multiple devices
}

export interface Match {
  id?: string;
  homeTeam: string | { name: string; logo?: string };
  awayTeam: string | { name: string; logo?: string };
  venue: string;
  date: Date;
  league: string;
  status: string;
  mainReferee: string | { id: string; name: string; image: string };
  assistantReferee1?: string | { id: string; name: string; image: string } | null;
  assistantReferee2?: string | { id: string; name: string; image: string } | null;
}

export interface Notification {
  id?: string;
  message: string;
  timestamp: Date;
  readBy: string[]; 
  targetUserIds?: string[];
  notificationType?: 'web' | 'mobile'; // Add notification type
}

// Update the VerificationRequest interface
export interface VerificationRequest {
  id?: string;
  userId: string;
  submissionDate: Date;
  documentationData: {
    description: string;
    fileUrl: string; // URL to the uploaded document in Firebase Storage
    additionalNotes?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewDate?: Date;
  reviewNotes?: string;
}


// Error handling helper
const handleFirestoreError = (error: FirestoreError, operation: string) => {
  console.error(`Firestore ${operation} error:`, {
    code: error.code,
    message: error.message,
    details: error,
    timestamp: new Date().toISOString()
  });
  throw error;
};

// Get a specific user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    console.log('Fetching user by ID:', { userId, timestamp: new Date().toISOString() });
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = { id: docSnap.id, ...docSnap.data() } as User;
      console.log('Successfully fetched user:', { id: userId, timestamp: new Date().toISOString() });
      return userData;
    } else {
      console.log('User not found:', { id: userId, timestamp: new Date().toISOString() });
      return null;
    }
  } catch (error) {
    console.error('Error getting user by ID:', {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// User operations
export const subscribeToUsers = (role: 'admin' | 'referee' | null, callback: (users: User[]) => void) => {
  console.log('Setting up users subscription...', {
    role,
    timestamp: new Date().toISOString()
  });

  // Create query based on role
  const q = role 
    ? query(usersCollection, where('role', '==', role))
    : query(usersCollection);

  return onSnapshot(
    q,
    {
      includeMetadataChanges: true
    },
    (snapshot) => {
      // Get all users
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));

      console.log('Raw users data:', {
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          role: u.role,
          isAvailable: u.isAvailable
        }))
      });

      // Filter users based on role and context
      let filteredUsers = users;

      // Only apply availability filter for referees in specific contexts
      if (role === 'referee') {
        // Show all referees for the referee page
        filteredUsers = users;
      }

      callback(filteredUsers);
    },
    (error) => {
      console.error('Users subscription error:', {
        code: error.code,
        message: error.message,
        details: error,
        timestamp: new Date().toISOString()
      });
      handleFirestoreError(error as FirestoreError, 'subscription');
    }
  );
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    console.log('Creating new user:', {
      data: user,
      timestamp: new Date().toISOString()
    });

    // Check if user already exists with this UID
    const existingUserQuery = query(usersCollection, where('uid', '==', user.uid));
    const existingUserDocs = await getDocs(existingUserQuery);

    if (!existingUserDocs.empty) {
      console.log('User already exists:', {
        uid: user.uid,
        timestamp: new Date().toISOString()
      });
      const existingDoc = existingUserDocs.docs[0];
      return { id: existingDoc.id, ...existingDoc.data() } as User;
    }

    // Set default values for new users
    const userData = {
      ...user,
      isAvailable: true, // Always set isAvailable to true for new users
      verificationStatus: user.role === 'referee' ? ('approved' as 'pending' | 'approved' | 'rejected') : 'pending' // Auto-approve referees, ensure pending for others
    };

    const docRef = await addDoc(usersCollection, userData);
    const newUser = { id: docRef.id, ...userData };

    console.log('Successfully created user:', {
      id: docRef.id,
      data: newUser,
      timestamp: new Date().toISOString()
    });

    // Create notification for new referee
    if (user.role === 'referee') {
      await addNotification(
        `New referee ${user.firstName} ${user.lastName} has been added to the system`
      );
    }

    return newUser;
  } catch (error) {
    console.error('Error creating user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  try {
    console.log('Updating user:', { id, data: user, timestamp: new Date().toISOString() });
    const docRef = doc(usersCollection, id);
    await updateDoc(docRef, user);
    console.log('Successfully updated user:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    console.log('Deleting user:', { id, timestamp: new Date().toISOString() });

    // Get the user's name before deletion
    const userDoc = await getDoc(doc(usersCollection, id));
    const userName = userDoc.exists() 
      ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
      : 'Unknown user';

    // Delete the user
    await deleteDoc(doc(usersCollection, id));

    // Add notification about deletion
    await addNotification(`${userName} has been removed from the system`);

    console.log('Successfully deleted user:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting user:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const getUsers = async (role?: 'admin' | 'referee'): Promise<User[]> => {
  try {
    console.log('Fetching users...', { role, timestamp: new Date().toISOString() });
    const q = role 
      ? query(usersCollection, where('role', '==', role))
      : usersCollection;

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as User));
    console.log('Successfully fetched users:', { count: users.length, timestamp: new Date().toISOString() });
    return users;
  } catch (error) {
    console.error('Error getting users:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Match operations
export const getMatches = async (): Promise<Match[]> => {
  try {
    console.log('Fetching all matches...', { timestamp: new Date().toISOString() });
    const snapshot = await getDocs(matchesCollection);
    const matches = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate()
      } as Match;
    });
    console.log('Successfully fetched matches:', { count: matches.length, timestamp: new Date().toISOString() });
    return matches;
  } catch (error) {
    console.error('Error getting matches:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Helper function to get team name
const getTeamName = (team: string | { name: string; logo?: string }): string => {
  return typeof team === 'string' ? team : team.name;
};

export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  try {
    console.log('Creating new match:', { data: match, timestamp: new Date().toISOString() });
    const matchData = {
      ...match,
      date: Timestamp.fromDate(match.date)
    };
    const docRef = await addDoc(matchesCollection, matchData);
    console.log('Successfully created match:', { id: docRef.id, timestamp: new Date().toISOString() });

    // Send notification to assigned referees only
    const assignedRefereeIds: string[] = [];

    // Add main referee if it's an object with id
    if (typeof match.mainReferee === 'object' && match.mainReferee?.id) {
      assignedRefereeIds.push(match.mainReferee.id);
    }

    // Add assistant referees if they're objects with ids
    if (typeof match.assistantReferee1 === 'object' && match.assistantReferee1?.id) {
      assignedRefereeIds.push(match.assistantReferee1.id);
    }
    if (typeof match.assistantReferee2 === 'object' && match.assistantReferee2?.id) {
      assignedRefereeIds.push(match.assistantReferee2.id);
    }

    // Send referee assignment notification (mobile app only)
    if (assignedRefereeIds.length > 0) {
      await addNotification(
        `You have been assigned to referee the match: ${getTeamName(match.homeTeam)} vs ${getTeamName(match.awayTeam)} on ${match.date.toLocaleDateString()}`,
        assignedRefereeIds,
        'mobile' // Specify as mobile notification
      );
    }

    // Send a general notification about new match creation (visible to admins)
    await addNotification(
      `New match added: ${getTeamName(match.homeTeam)} vs ${getTeamName(match.awayTeam)}`,
      undefined,
      'web' // Specify as web notification
    );

    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<void> => {
  try {
    console.log('Updating match:', { id, data: match, timestamp: new Date().toISOString() });
    const docRef = doc(matchesCollection, id);

    // Get the current match data to compare changes
    const currentMatchSnap = await getDoc(docRef);
    const currentMatch = currentMatchSnap.data();

    // Create a clean copy of the data to update
    const updateData: Record<string, any> = {};

    // Copy all properties except date
    Object.keys(match).forEach(key => {
      if (key !== 'date') {
        updateData[key] = match[key as keyof Match];
      }
    });

    // Handle date conversion separately
    if (match.date) {
      const dateObj = match.date instanceof Date 
        ? match.date 
        : new Date(match.date);

      if (!isNaN(dateObj.getTime())) {
        updateData.date = Timestamp.fromDate(dateObj);
      }
    }

    await updateDoc(docRef, updateData);
    console.log('Successfully updated match:', { id, timestamp: new Date().toISOString() });

    // Get all assigned referee IDs (current and previous)
    const newAssignedRefereeIds: string[] = [];
    const previousRefereeIds: string[] = [];

    // Helper function to extract referee ID
    const getRefereeId = (referee: any): string | null => {
      if (typeof referee === 'object' && referee?.id) return referee.id;
      return null;
    };

    // Get previous referee IDs
    const previousMainId = getRefereeId(currentMatch?.mainReferee);
    const previousAssist1Id = getRefereeId(currentMatch?.assistantReferee1);
    const previousAssist2Id = getRefereeId(currentMatch?.assistantReferee2);
    if (previousMainId) previousRefereeIds.push(previousMainId);
    if (previousAssist1Id) previousRefereeIds.push(previousAssist1Id);
    if (previousAssist2Id) previousRefereeIds.push(previousAssist2Id);

    // Get new referee IDs
    if (match.mainReferee) {
      const newMainId = getRefereeId(match.mainReferee);
      if (newMainId) newAssignedRefereeIds.push(newMainId);
    }
    if (match.assistantReferee1) {
      const newAssist1Id = getRefereeId(match.assistantReferee1);
      if (newAssist1Id) newAssignedRefereeIds.push(newAssist1Id);
    }
    if (match.assistantReferee2) {
      const newAssist2Id = getRefereeId(match.assistantReferee2);
      if (newAssist2Id) newAssignedRefereeIds.push(newAssist2Id);
    }

    // Send notifications for newly assigned referees only
    const newlyAssigned = newAssignedRefereeIds.filter(id => !previousRefereeIds.includes(id));
    if (newlyAssigned.length > 0 && currentMatch) {
      await addNotification(
        `You have been assigned to referee the match: ${getTeamName(currentMatch.homeTeam)} vs ${getTeamName(currentMatch.awayTeam)} on ${match.date?.toLocaleDateString() || currentMatch.date.toDate().toLocaleDateString()}`,
        newlyAssigned,
        'mobile' // Specify as mobile notification
      );
    }

    // If there are any changes that affect match details
    if (match.date || match.venue || match.homeTeam || match.awayTeam || match.league) {
      const changes = [];
      if (match.date) changes.push('date');
      if (match.venue) changes.push('venue');
      if (match.homeTeam || match.awayTeam) changes.push('teams');
      if (match.league) changes.push('league');

      if (changes.length > 0 && currentMatch) {
        // Send update notification to admins (web notification)
        await addNotification(
          `Match details have been updated (${changes.join(', ')}) for ${getTeamName(match.homeTeam || currentMatch.homeTeam)} vs ${getTeamName(match.awayTeam || currentMatch.awayTeam)}`,
          undefined,
          'web'
        );

        // Send specific notification to all assigned referees (mobile notification)
        const allRefereeIds = [...new Set([...previousRefereeIds, ...newAssignedRefereeIds])];
        if (allRefereeIds.length > 0) {
          await addNotification(
            `Match details have been updated for your assigned match: ${getTeamName(match.homeTeam || currentMatch.homeTeam)} vs ${getTeamName(match.awayTeam || currentMatch.awayTeam)}`,
            allRefereeIds,
            'mobile'
          );
        }
      }
    }

  } catch (error) {
    console.error('Error updating match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    console.log('Deleting match:', { id, timestamp: new Date().toISOString() });
    const docRef = doc(matchesCollection, id);
    await deleteDoc(docRef);
    console.log('Successfully deleted match:', { id, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting match:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Notification operations
export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  console.log('Setting up notifications subscription...', {
    collection: 'notifications',
    userId,
    timestamp: new Date().toISOString()
  });

  // Query all notifications
  const q = query(notificationsCollection);

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('Received notifications update:', {
        count: snapshot.docs.length,
        timestamp: new Date().toISOString(),
        metadata: snapshot.metadata
      });
      const notifications = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            message: data.message,
            timestamp: data.timestamp.toDate(), 
            readBy: data.readBy || [],
            targetUserIds: data.targetUserIds || [],
            notificationType: data.notificationType
          } as Notification;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(notifications);
    },
    (error) => {
      console.error('Notifications subscription error:', {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      handleFirestoreError(error as FirestoreError, 'subscription');
    }
  );
};

export const addFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    console.log('Adding FCM token:', {
      userId,
      token: token.substring(0, 10) + '...', // Log only part of the token for security
      timestamp: new Date().toISOString()
    });

    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token)
    });

    console.log('Successfully added FCM token');
  } catch (error) {
    console.error('Error adding FCM token:', {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const removeFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    console.log('Removing FCM token:', {
      userId,
      token: token.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });

    const userRef = doc(usersCollection, userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token)
    });

    console.log('Successfully removed FCM token');
  } catch (error) {
    console.error('Error removing FCM token:', {
      error,
      userId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};


export const addNotification = async (
  message: string, 
  targetUserIds?: string[], 
  notificationType: 'web' | 'mobile' = 'web'
): Promise<void> => {
  try {
    console.log('Creating new notification:', {
      message,
      targetUserIds,
      notificationType,
      timestamp: new Date().toISOString()
    });

    // Store the notification in Firestore
    const notificationData = {
      message,
      timestamp: Timestamp.fromDate(new Date()),
      readBy: [],
      targetUserIds: targetUserIds || [],
      notificationType // Add notification type to stored data
    };

    const notificationRef = await addDoc(notificationsCollection, notificationData);
    console.log('Successfully created notification:', notificationRef.id);

    // If specific users are targeted, get their FCM tokens
    if (targetUserIds && targetUserIds.length > 0) {
      const userSnapshots = await Promise.all(
        targetUserIds.map(userId => getDoc(doc(usersCollection, userId)))
      );

      // Collect all FCM tokens
      const fcmTokens = userSnapshots
        .filter(snap => snap.exists())
        .map(snap => snap.data().fcmTokens || [])
        .flat();

      if (fcmTokens.length > 0) {
        console.log('Found FCM tokens for notification:', {
          count: fcmTokens.length,
          timestamp: new Date().toISOString()
        });

        // Here you would typically call your Firebase Cloud Function or backend endpoint
        // to send the actual push notifications using the FCM tokens
        // This will be implemented in the next step
      }
    }
  } catch (error) {
    console.error('Error creating notification:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const markNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    console.log('Marking notifications as read:', {
      userId,
      timestamp: new Date().toISOString()
    });

    const snapshot = await getDocs(notificationsCollection);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      const readBy = doc.data().readBy || [];
      if (!readBy.includes(userId)) {
        batch.update(doc.ref, {
          readBy: arrayUnion(userId)
        });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking notifications as read:', {
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Verification operations
// Remove mock data and update verification functions
export const getVerificationRequests = async (): Promise<VerificationRequest[]> => {
  try {
    console.log('Fetching verification requests...', {
      timestamp: new Date().toISOString()
    });

    const snapshot = await getDocs(verificationRequestsCollection);
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submissionDate: doc.data().submissionDate.toDate(),
      reviewDate: doc.data().reviewDate?.toDate() || null
    })) as VerificationRequest[];

    console.log('Successfully fetched verification requests:', {
      count: requests.length,
      timestamp: new Date().toISOString()
    });

    return requests;
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    throw error;
  }
};

export const updateVerificationRequest = async (
  id: string,
  update: Partial<VerificationRequest>
): Promise<void> => {
  try {
    console.log('Updating verification request:', {
      id,
      update,
      timestamp: new Date().toISOString()
    });

    const docRef = doc(verificationRequestsCollection, id);

    // Get the request data to update user's verification status
    const request = (await getDoc(docRef)).data() as VerificationRequest;

    // Update the verification request
    await updateDoc(docRef, {
      ...update,
      reviewDate: update.status ? Timestamp.fromDate(new Date()) : undefined
    });

    // If status is being updated, also update the user's verification status
    if (update.status && request.userId) {
      const userRef = doc(usersCollection, request.userId);
      await updateDoc(userRef, {
        verificationStatus: update.status
      });

      // Create notification for the user
      const statusMessage = update.status === 'approved' 
        ? 'Your verification request has been approved!'
        : 'Your verification request has been rejected. Please check the review notes for more information.';

      await addNotification(
        statusMessage,
        [request.userId],
        'mobile'
      );
    }

    console.log('Successfully updated verification request:', {
      id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating verification request:', error);
    throw error;
  }
};

// Add getReferees function
export const getReferees = async (): Promise<User[]> => {
  return getUsers('referee');
};

// Initialize admin user with error handling and retries
export const initializeAdminUser = async () => {
  try {
    console.log('Starting admin user initialization...', {
      timestamp: new Date().toISOString(),
      database: 'Hakkim-Database'
    });

    const adminQuery = query(usersCollection, where('role', '==', 'admin'));
    const snapshot = await getDocs(adminQuery);

    console.log('Checked for existing admin:', {
      exists: !snapshot.empty,
      count: snapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (snapshot.empty) {
      // Create Firebase Auth user
      const adminEmail = 'admin@footballadmin.com';
      const adminPassword = 'Admin123!'; // Should be changed after first login

      console.log('Creating admin auth user...', {
        email: adminEmail,
        timestamp: new Date().toISOString()
      });

      // Commented out auth.createUserWithEmailAndPassword because it causes circular dependency
      // const userCredential = await auth.createUserWithEmailAndPassword(adminEmail, adminPassword);
      // const adminData = {
      //   email: adminEmail,
      //   firstName: 'System',
      //   lastName: 'Admin',
      //   uid: userCredential.user.uid,
      //   role: 'admin',
      //   isAvailable: true
      // };


      // Placeholder for admin creation - needs alternative approach due to circular dependency
      const adminData = {
        email: adminEmail,
        firstName: 'System',
        lastName: 'Admin',
        uid: 'admin-uid-placeholder', // Placeholder UID - needs a proper solution
        role: 'admin',
        isAvailable: true
      };

      console.log('Creating admin Firestore document...', {
        data: adminData,
        timestamp: new Date().toISOString()
      });

      const docRef = await addDoc(usersCollection, adminData);

      console.log('Admin Firestore document created:', {
        id: docRef.id,
        timestamp: new Date().toISOString()
      });

      return true;
    }

    console.log('Admin user already exists, skipping initialization');
    return false;
  } catch (error: any) {
    console.error('Error in admin initialization:', {
      error,
      errorMessage: error.message,
      errorCode: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const initializeSampleData = async () => {
  try {
    console.log('Starting sample data initialization...', {
      timestamp: new Date().toISOString(),
      database: 'Hakkim-Database'
    });

    // Check and create sample matches
    const matchesSnapshot = await getDocs(matchesCollection);
    console.log('Checked matches collection:', {
      exists: !matchesSnapshot.empty,
      count: matchesSnapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (matchesSnapshot.empty) {
      const sampleMatches = [
        {
          venue: 'Old Trafford',
          date: new Date('2025-03-01T15:00:00'),
          league: 'Premier League',
          status: 'scheduled',
          homeTeam: { name: 'Manchester United' },
          awayTeam: { name: 'Liverpool' },
          mainReferee: {
            id: 'ref123',
            name: 'John Smith',
            image: 'https://example.com/referee-images/john-smith.png'
          },
          assistantReferee1: {
            id: 'ref124',
            name: 'Mike Johnson',
            image: 'https://example.com/referee-images/mike-johnson.png'
          },
          assistantReferee2: {
            id: 'ref125',
            name: 'David Wilson',
            image: 'https://example.com/referee-images/david-wilson.png'
          }
        },
        {
          venue: 'Emirates Stadium',
          date: new Date('2025-03-08T17:30:00'),
          league: 'Premier League',
          status: 'scheduled',
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'Chelsea' },
          mainReferee: {
            id: 'ref126',
            name: 'Sarah Parker',
            image: 'https://example.com/referee-images/sarah-parker.png'
          },
          assistantReferee1: {
            id: 'ref127',
            name: 'James Brown',
            image: 'https://example.com/referee-images/james-brown.png'
          },
          assistantReferee2: {
            id: 'ref128',
            name: 'Robert Taylor',
            image: 'https://example.com/referee-images/robert-taylor.png'
          }
        }
      ];

      console.log('Creating sample matches...', {
        count: sampleMatches.length,
        timestamp: new Date().toISOString()
      });

      for (const match of sampleMatches) {
        const docRef = await addDoc(matchesCollection, match);
        console.log('Created match:', {
          id: docRef.id,
          match: match,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check and create sample notifications
    const notificationsSnapshot = await getDocs(notificationsCollection);
    console.log('Checked notifications collection:', {
      exists: !notificationsSnapshot.empty,
      count: notificationsSnapshot.docs.length,
      timestamp: new Date().toISOString()
    });

    if (notificationsSnapshot.empty) {
      const sampleNotifications = [
        'Welcome to the Football Admin Dashboard!',
        'New match schedule has been published',
        'Referee verification system is now active'
      ];

      console.log('Creating sample notifications...', {
        count: sampleNotifications.length,
        timestamp: new Date().toISOString()
      });

      for (const message of sampleNotifications) {
        const notificationData = {
          message,
          timestamp: Timestamp.fromDate(new Date()),
          readBy: []
        };
        const docRef = await addDoc(notificationsCollection, notificationData);
        console.log('Created notification:', {
          id: docRef.id,
          message: message,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log('Sample data initialization completed successfully', {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sample data initialization:', {
      error,
      errorMessage: (error as Error).message,
      errorCode: (error as any).code,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Immediately invoke initialization
console.log('Starting database initialization...', {
  timestamp: new Date().toISOString(),
  database: 'Hakkim-Database'
});

Promise.all([
  initializeAdminUser(),
  initializeSampleData()
]).then(() => {
  console.log('Database initialization completed', {
    timestamp: new Date().toISOString(),
    database: 'Hakkim-Database'
  });
}).catch(error => {
  console.error('Database initialization failed:', {
    error,
    errorMessage: (error as Error).message,
    errorCode: (error as any).code,
    timestamp: new Date().toISOString(),
    database: 'Hakkim-Database'
  });
});

export { 
  usersCollection,
  matchesCollection,
  notificationsCollection,
  verificationRequestsCollection,
  Timestamp
};