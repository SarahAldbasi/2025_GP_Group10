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
  enableNetwork,
  disableNetwork
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

// Network status management
export const goOffline = () => disableNetwork(db);
export const goOnline = () => enableNetwork(db);

// Real-time referee subscription with error handling and reconnection
export const subscribeToReferees = (callback: (referees: Referee[]) => void) => {
  return onSnapshot(refereesCollection, 
    (snapshot) => {
      const referees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Referee));
      callback(referees);
    },
    (error) => {
      console.error('Error in referee subscription:', error);
      // Attempt to reconnect if there's a network error
      if (error.code === 'unavailable') {
        goOnline().catch(console.error);
      }
    }
  );
};

// Optimized referee operations with better error handling
export const createReferee = async (referee: Omit<Referee, 'id'>): Promise<Referee> => {
  try {
    console.log('Saving referee to Firestore:', referee);
    const docRef = await addDoc(refereesCollection, {
      ...referee,
      createdAt: Timestamp.now()
    });
    const savedReferee = { id: docRef.id, ...referee };
    console.log('Successfully saved referee:', savedReferee);
    return savedReferee;
  } catch (error) {
    console.error('Error creating referee:', error);
    // Attempt to reconnect if there's a network error
    if (error.code === 'unavailable') {
      await goOnline();
      return createReferee(referee);
    }
    throw error;
  }
};

export const updateReferee = async (id: string, referee: Partial<Referee>): Promise<void> => {
  try {
    const docRef = doc(refereesCollection, id);
    await updateDoc(docRef, {
      ...referee,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating referee:', error);
    if (error.code === 'unavailable') {
      await goOnline();
      return updateReferee(id, referee);
    }
    throw error;
  }
};

export const deleteReferee = async (id: string): Promise<void> => {
  try {
    const docRef = doc(refereesCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting referee:', error);
    if (error.code === 'unavailable') {
      await goOnline();
      return deleteReferee(id);
    }
    throw error;
  }
};

// Referee operations with optimized batching (from original, not modified in edited snippet)
export const getReferees = async (): Promise<Referee[]> => {
  try {
    const snapshot = await getDocs(refereesCollection);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Referee));
  } catch (error) {
    console.error('Error getting referees:', error);
    throw error;
  }
};


// Match operations with optimized batch processing (from original, not modified in edited snippet)
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

// Export all necessary functions and types
export { 
  refereesCollection,
  matchesCollection,
  Timestamp
};