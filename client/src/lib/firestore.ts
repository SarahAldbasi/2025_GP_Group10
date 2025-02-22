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
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
const refereesCollection = collection(db, 'referees');
const matchesCollection = collection(db, 'matches');

// Types
export interface Referee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isAvailable: boolean;
}

export interface Match {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: Date;
  league: string;
  status: string;
  assistantReferee1?: string | null;
  assistantReferee2?: string | null;
}

// Error handling helper
const handleFirestoreError = (error: FirestoreError, operation: string) => {
  console.error(`Firestore ${operation} error:`, error);
  throw error;
};

// Real-time referee subscription
export const subscribeToReferees = (callback: (referees: Referee[]) => void) => {
  console.log('Setting up referees subscription...');

  return onSnapshot(
    refereesCollection, 
    (snapshot) => {
      console.log('Received referees update:', snapshot.docs.length, 'referees');
      const referees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Referee));
      callback(referees);
    },
    (error) => handleFirestoreError(error as FirestoreError, 'subscription')
  );
};

// Referee operations
export const createReferee = async (referee: Omit<Referee, 'id'>): Promise<Referee> => {
  try {
    console.log('Creating new referee:', referee);
    const docRef = await addDoc(refereesCollection, referee);
    const newReferee = { id: docRef.id, ...referee };
    console.log('Successfully created referee:', newReferee);
    return newReferee;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'create referee');
    throw error; // TypeScript needs this for type inference
  }
};

export const updateReferee = async (id: string, referee: Partial<Referee>): Promise<void> => {
  try {
    console.log('Updating referee:', id, referee);
    const docRef = doc(refereesCollection, id);
    await updateDoc(docRef, referee);
    console.log('Successfully updated referee:', id);
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'update referee');
  }
};

export const deleteReferee = async (id: string): Promise<void> => {
  try {
    console.log('Deleting referee:', id);
    const docRef = doc(refereesCollection, id);
    await deleteDoc(docRef);
    console.log('Successfully deleted referee:', id);
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'delete referee');
  }
};

export const getReferees = async (): Promise<Referee[]> => {
  try {
    console.log('Fetching all referees...');
    const snapshot = await getDocs(refereesCollection);
    const referees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Referee));
    console.log('Successfully fetched referees:', referees.length);
    return referees;
  } catch (error) {
    handleFirestoreError(error as FirestoreError, 'get referees');
    return []; // Return empty array on error
  }
};

// Referee operations with optimized batching (from original, not modified in edited snippet)
export const getMatches = async (): Promise<Match[]> => {
  try {
    const snapshot = await getDocs(matchesCollection);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      date: (doc.data().date as Timestamp).toDate() 
    } as Match));
  } catch (error) {
    console.error('Error getting matches:', error);
    throw error;
  }
};

//Match Operations (from original, not modified in edited snippet)
export const getMatch = async (id: string): Promise<Match | null> => {
  try {
    const docRef = doc(matchesCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp).toDate()
      } as Match;
    }
    return null;
  } catch (error) {
    console.error('Error getting match:', error);
    throw error;
  }
};

export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  try {
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection);
    const newMatch = {
      ...match,
      date: Timestamp.fromDate(match.date)
    };

    batch.set(docRef, newMatch);
    await batch.commit();

    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection, id);
    const updateData = { ...match };

    if (match.date) {
      updateData.date = Timestamp.fromDate(match.date);
    }

    batch.update(docRef, updateData);
    await batch.commit();
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const docRef = doc(matchesCollection, id);

    batch.delete(docRef);
    await batch.commit();
  } catch (error) {
    console.error('Error deleting match:', error);
    throw error;
  }
};

export { 
  refereesCollection,
  matchesCollection,
  Timestamp
};