import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp 
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

// Referee operations
export const getReferees = async (): Promise<Referee[]> => {
  try {
    const snapshot = await getDocs(refereesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referee));
  } catch (error) {
    console.error('Error getting referees:', error);
    throw error;
  }
};

export const getReferee = async (id: string): Promise<Referee | null> => {
  try {
    const docRef = doc(refereesCollection, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Referee;
    }
    return null;
  } catch (error) {
    console.error('Error getting referee:', error);
    throw error;
  }
};

export const createReferee = async (referee: Omit<Referee, 'id'>): Promise<Referee> => {
  try {
    const docRef = await addDoc(refereesCollection, referee);
    return { id: docRef.id, ...referee };
  } catch (error) {
    console.error('Error creating referee:', error);
    throw error;
  }
};

export const updateReferee = async (id: string, referee: Partial<Referee>): Promise<void> => {
  try {
    const docRef = doc(refereesCollection, id);
    await updateDoc(docRef, referee);
  } catch (error) {
    console.error('Error updating referee:', error);
    throw error;
  }
};

export const deleteReferee = async (id: string): Promise<void> => {
  try {
    const docRef = doc(refereesCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting referee:', error);
    throw error;
  }
};

// Match operations
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
    const docRef = await addDoc(matchesCollection, {
      ...match,
      date: Timestamp.fromDate(match.date)
    });
    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<void> => {
  try {
    const docRef = doc(matchesCollection, id);
    const updateData = { ...match };
    if (match.date) {
      updateData.date = Timestamp.fromDate(match.date);
    }
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
};

export const deleteMatch = async (id: string): Promise<void> => {
  try {
    const docRef = doc(matchesCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting match:', error);
    throw error;
  }
};