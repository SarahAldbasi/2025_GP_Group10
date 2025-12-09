import { db } from "./firebase"; // your admin Firestore instance

export async function getFCMTokensForUsers(userIds: string[]): Promise<string[]> {
  const allTokens: string[] = [];

  for (const userId of userIds) {
    try {
      // Try to find user by document ID first (for backward compatibility)
      let userDoc = await db.collection("users").doc(userId).get();
      
      // If not found, try to find by uid field (Firebase Auth UID)
      if (!userDoc.exists) {
        const userQuery = await db.collection("users").where("uid", "==", userId).limit(1).get();
        if (!userQuery.empty) {
          userDoc = userQuery.docs[0];
        }
      }
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const tokens = userData?.fcmTokens || [];
        if (Array.isArray(tokens)) {
          allTokens.push(...tokens);
        }
      } else {
        console.warn(`User not found for ID: ${userId}`);
      }
    } catch (error) {
      console.error(`Failed to get FCM tokens for user ${userId}:`, error);
    }
  }

  return allTokens;
}
