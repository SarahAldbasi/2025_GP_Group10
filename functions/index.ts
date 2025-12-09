import * as functionsV1 from "firebase-functions/v1";
import * as functionsV2 from "firebase-functions/v2";
import express, { Request, Response } from "express";
import cors from "cors";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Match events endpoint
app.post("/api/match-events", async (req: Request, res: Response): Promise<void> => {
  const { event, timestamp, matchId } = req.body;

  if (!event || !timestamp || !matchId) {
    res.status(400).json({ error: "Missing required data" });
    return;
  }

  try {
    const db = admin.firestore();

    await db.collection("matches")
      .doc(matchId)
      .collection("events")
      .add({ event, timestamp });

    res.json({ status: "success", message: "Event logged" });
  } catch (err) {
    console.error("Error logging event:", err);
    res.status(500).json({ error: "Failed to log event" });
  }
});

// Send notification endpoint
app.post("/api/send-notification", async (req: Request, res: Response): Promise<void> => {
  const { message, targetUserIds } = req.body;

  if (!message || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const db = admin.firestore();
    const allTokens: string[] = [];

    // Get FCM tokens for all users
    const invalidTokens: string[] = [];
    
    for (const userId of targetUserIds) {
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

    if (allTokens.length === 0) {
      res.status(200).json({ message: "No tokens found." });
      return;
    }

    // Send notifications using Firebase Admin SDK and handle invalid tokens
    let successCount = 0;
    for (const token of allTokens) {
      try {
        await admin.messaging().send({
          token: token,
          notification: {
            title: "New Notification",
            body: message,
          },
        });
        successCount++;
      } catch (error: any) {
        console.error(`Failed to send notification to token ${token.substring(0, 10)}...:`, error);
        
        // Track invalid tokens for removal
        if (error?.code === 'messaging/registration-token-not-registered' || 
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/invalid-argument') {
          invalidTokens.push(token);
        }
      }
    }

    // Remove invalid tokens from Firestore
    if (invalidTokens.length > 0) {
      for (const userId of targetUserIds) {
        try {
          let userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists) {
            const userQuery = await db.collection("users").where("uid", "==", userId).limit(1).get();
            if (!userQuery.empty) {
              userDoc = userQuery.docs[0];
            }
          }
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const currentTokens = userData?.fcmTokens || [];
            const validTokens = currentTokens.filter((t: string) => !invalidTokens.includes(t));
            
            if (validTokens.length !== currentTokens.length) {
              await userDoc.ref.update({ fcmTokens: validTokens });
              console.log(`Removed ${currentTokens.length - validTokens.length} invalid tokens for user ${userId}`);
            }
          }
        } catch (error) {
          console.error(`Failed to remove invalid tokens for user ${userId}:`, error);
        }
      }
    }

    res.status(200).json({ 
      message: "Notification sent successfully.",
      sent: successCount,
      invalidTokensRemoved: invalidTokens.length
    });
  } catch (error) {
    console.error("Push notification error:", error);
    res.status(500).json({ error: "Failed to send notification." });
  }
});

// API-Football endpoints
// Handle both /api/football/... (from Firebase Hosting rewrite) and /football/... (direct)
app.get("/api/football/leagues", async (req: Request, res: Response): Promise<void> => {
  const { season = '2023' } = req.query; // Free plan supports 2021-2023
  
  try {
    // Get API key from environment variables (v2 functions)
    // The API key should be set via: firebase functions:secrets:set API_FOOTBALL_KEY
    const apiKey = process.env.API_FOOTBALL_KEY || '';
    
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY is not set');
      res.status(500).json({ error: 'API key not configured' });
      return;
    }
    
    const response = await fetch(`https://v3.football.api-sports.io/leagues?season=${season}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status}`, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Leagues API response:', JSON.stringify(data).substring(0, 200));
    
    if (data.errors && data.errors.length > 0) {
      console.error('API errors:', data.errors);
      res.status(400).json({ error: data.errors.join(', ') });
      return;
    }

    // Filter for popular leagues
    const popularLeagueIds = [39, 140, 78, 135, 61, 2, 3, 88, 94, 71];
    const leagues = data.response?.map((item: any) => item.league) || [];
    const filteredLeagues = leagues.filter((league: any) => popularLeagueIds.includes(league.id));
    
    console.log(`Found ${leagues.length} total leagues, ${filteredLeagues.length} after filtering`);
    
    res.json({ leagues: filteredLeagues });
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues', details: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/football/teams", async (req: Request, res: Response): Promise<void> => {
  const { league, season = '2023', search, country } = req.query; // Free plan supports 2021-2023
  
  try {
    // Get API key from environment variables (v2 functions)
    // The API key should be set via: firebase functions:secrets:set API_FOOTBALL_KEY
    const apiKey = process.env.API_FOOTBALL_KEY || '';
    
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY is not set');
      res.status(500).json({ error: 'API key not configured' });
      return;
    }
    
    let url = 'https://v3.football.api-sports.io/teams';
    const params = new URLSearchParams();
    
    if (league) {
      params.append('league', league as string);
      params.append('season', season as string);
    } else if (search) {
      params.append('search', search as string);
    } else {
      // Fetch teams from popular leagues
      const popularLeagueIds = [39, 140, 78, 135, 61];
      const allTeams = [];
      
      for (const leagueId of popularLeagueIds) {
        try {
          const leagueResponse = await fetch(`https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`, {
            headers: {
              'x-rapidapi-key': apiKey,
              'x-rapidapi-host': 'v3.football.api-sports.io'
            }
          });
          
          if (leagueResponse.ok) {
            const leagueData = await leagueResponse.json();
            console.log(`League ${leagueId} response:`, JSON.stringify(leagueData).substring(0, 200));
            
            if (leagueData.errors && leagueData.errors.length > 0) {
              console.error(`API errors for league ${leagueId}:`, leagueData.errors);
              continue;
            }
            
            if (leagueData.response) {
              const teams = leagueData.response.map((item: any) => item.team);
              allTeams.push(...teams);
              console.log(`Added ${teams.length} teams from league ${leagueId}`);
            }
          } else {
            const errorText = await leagueResponse.text();
            console.error(`Failed to fetch league ${leagueId}: ${leagueResponse.status}`, errorText);
          }
        } catch (error) {
          console.error(`Error fetching teams from league ${leagueId}:`, error);
        }
      }
      
      console.log(`Total teams fetched: ${allTeams.length}`);
      res.json({ teams: allTeams });
      return;
    }
    
    if (country) params.append('country', country as string);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      console.error('API errors:', data.errors);
      res.status(400).json({ error: data.errors.join(', ') });
      return;
    }

    const teams = data.response?.map((item: any) => item.team) || [];
    console.log(`Found ${teams.length} teams`);
    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams', details: error instanceof Error ? error.message : String(error) });
  }
});

// Export the Express app as a Cloud Function (v2 to match existing deployment)
// For v2 functions, use Firebase Secrets to store the API key:
// firebase functions:secrets:set API_FOOTBALL_KEY
// Then grant access: firebase functions:secrets:access API_FOOTBALL_KEY
export const api = functionsV2.https.onRequest({
  region: 'us-central1',
  secrets: ['API_FOOTBALL_KEY'] // This makes the secret available as process.env.API_FOOTBALL_KEY
}, app);

// ============================================
// FCM Notification Functions (for Mobile App)
// ============================================

/**
 * Sends notifications to referees when a match is created
 * Triggered by Firestore onCreate event on matches collection
 */
export const sendNotificationOnCreate = functionsV1
  .region('us-central1')
  .firestore.document('matches/{matchId}')
  .onCreate(async (snap: functionsV1.firestore.QueryDocumentSnapshot, context: functionsV1.EventContext) => {
    try {
      const matchData = snap.data();
      const matchId = context.params.matchId;

      // Get referee IDs from the match
      const refereeIds: string[] = [];
      
      if (matchData.mainReferee?.id) {
        refereeIds.push(matchData.mainReferee.id);
      }
      if (matchData.assistantReferee1?.id) {
        refereeIds.push(matchData.assistantReferee1.id);
      }
      if (matchData.assistantReferee2?.id) {
        refereeIds.push(matchData.assistantReferee2.id);
      }

      if (refereeIds.length === 0) {
        console.log('No referees assigned to match, skipping notification');
        return;
      }

      // Get FCM tokens for all assigned referees
      const db = admin.firestore();
      const allTokens: string[] = [];
      const invalidTokens: string[] = [];

      for (const userId of refereeIds) {
        try {
          // Try to find user by document ID first (for backward compatibility)
          let userDoc = await db.collection("users").doc(userId).get();
          
          // If not found, try to find by uid field
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
            console.warn(`User not found for referee ID: ${userId}`);
          }
        } catch (error) {
          console.error(`Failed to get FCM tokens for user ${userId}:`, error);
        }
      }

      if (allTokens.length === 0) {
        console.log('No FCM tokens found for referees');
        return;
      }

      // Prepare match details for notification
      const homeTeam = matchData.homeTeam?.name || 'Team 1';
      const awayTeam = matchData.awayTeam?.name || 'Team 2';
      const matchDate = matchData.date?.toDate ? matchData.date.toDate() : new Date(matchData.date);
      const dateStr = matchDate.toLocaleDateString();
      const timeStr = matchDate.toLocaleTimeString();

      // Send notifications and handle invalid tokens
      for (const token of allTokens) {
        try {
          await admin.messaging().send({
            token: token,
            notification: {
              title: 'New Match Assignment',
              body: `You've been assigned to ${homeTeam} vs ${awayTeam} on ${dateStr} at ${timeStr}`,
            },
            data: {
              type: 'match_created',
              matchId: matchId,
            },
          });
        } catch (error: any) {
          console.error(`Failed to send notification to token ${token.substring(0, 10)}...:`, error);
          
          // Remove invalid tokens (registration-token-not-registered, invalid-registration-token, etc.)
          if (error?.code === 'messaging/registration-token-not-registered' || 
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/invalid-argument') {
            invalidTokens.push(token);
          }
        }
      }

      // Remove invalid tokens from Firestore
      if (invalidTokens.length > 0) {
        for (const userId of refereeIds) {
          try {
            let userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) {
              const userQuery = await db.collection("users").where("uid", "==", userId).limit(1).get();
              if (!userQuery.empty) {
                userDoc = userQuery.docs[0];
              }
            }
            
            if (userDoc.exists) {
              const userData = userDoc.data();
              const currentTokens = userData?.fcmTokens || [];
              const validTokens = currentTokens.filter((t: string) => !invalidTokens.includes(t));
              
              if (validTokens.length !== currentTokens.length) {
                await userDoc.ref.update({ fcmTokens: validTokens });
                console.log(`Removed ${currentTokens.length - validTokens.length} invalid tokens for user ${userId}`);
              }
            }
          } catch (error) {
            console.error(`Failed to remove invalid tokens for user ${userId}:`, error);
          }
        }
      }

      console.log(`Sent match creation notifications to ${allTokens.length} devices`);
    } catch (error) {
      console.error('Error in sendNotificationOnCreate:', error);
    }
  });

/**
 * Sends scheduled reminders to referees before their matches
 * Runs daily to check for upcoming matches and send reminders
 */
export const scheduledMatchReminder = functionsV1
  .region('us-central1')
  .pubsub.schedule('0 0 * * *') // Run daily at midnight (cron format)
  .timeZone('Asia/Riyadh') // Adjust to your timezone
  .onRun(async (context: functionsV1.EventContext) => {
    try {
      const db = admin.firestore();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

      // Find matches happening in the next 24-48 hours
      const matchesSnapshot = await db.collection('matches')
        .where('date', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
        .where('date', '<=', admin.firestore.Timestamp.fromDate(dayAfter))
        .get();

      if (matchesSnapshot.empty) {
        console.log('No upcoming matches found for reminders');
        return;
      }

      let totalNotifications = 0;

      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        const matchId = matchDoc.id;

        // Get referee IDs
        const refereeIds: string[] = [];
        if (matchData.mainReferee?.id) refereeIds.push(matchData.mainReferee.id);
        if (matchData.assistantReferee1?.id) refereeIds.push(matchData.assistantReferee1.id);
        if (matchData.assistantReferee2?.id) refereeIds.push(matchData.assistantReferee2.id);

        if (refereeIds.length === 0) continue;

        // Get FCM tokens
        const allTokens: string[] = [];
        const invalidTokens: string[] = [];
        
        for (const userId of refereeIds) {
          try {
            // Try to find user by document ID first (for backward compatibility)
            let userDoc = await db.collection("users").doc(userId).get();
            
            // If not found, try to find by uid field
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
              console.warn(`User not found for referee ID: ${userId}`);
            }
          } catch (error) {
            console.error(`Failed to get FCM tokens for user ${userId}:`, error);
          }
        }

        // Prepare notification
        const homeTeam = matchData.homeTeam?.name || 'Team 1';
        const awayTeam = matchData.awayTeam?.name || 'Team 2';
        const matchDate = matchData.date?.toDate ? matchData.date.toDate() : new Date(matchData.date);
        const timeStr = matchDate.toLocaleTimeString();

        // Send reminders and handle invalid tokens
        for (const token of allTokens) {
          try {
            await admin.messaging().send({
              token: token,
              notification: {
                title: 'Match Reminder',
                body: `Reminder: ${homeTeam} vs ${awayTeam} tomorrow at ${timeStr}`,
              },
              data: {
                type: 'match_reminder',
                matchId: matchId,
              },
            });
            totalNotifications++;
          } catch (error: any) {
            console.error(`Failed to send reminder to token ${token.substring(0, 10)}...:`, error);
            
            // Track invalid tokens for removal
            if (error?.code === 'messaging/registration-token-not-registered' || 
                error?.code === 'messaging/invalid-registration-token' ||
                error?.code === 'messaging/invalid-argument') {
              invalidTokens.push(token);
            }
          }
        }
        
        // Remove invalid tokens from Firestore
        if (invalidTokens.length > 0) {
          for (const userId of refereeIds) {
            try {
              let userDoc = await db.collection("users").doc(userId).get();
              if (!userDoc.exists) {
                const userQuery = await db.collection("users").where("uid", "==", userId).limit(1).get();
                if (!userQuery.empty) {
                  userDoc = userQuery.docs[0];
                }
              }
              
              if (userDoc.exists) {
                const userData = userDoc.data();
                const currentTokens = userData?.fcmTokens || [];
                const validTokens = currentTokens.filter((t: string) => !invalidTokens.includes(t));
                
                if (validTokens.length !== currentTokens.length) {
                  await userDoc.ref.update({ fcmTokens: validTokens });
                  console.log(`Removed ${currentTokens.length - validTokens.length} invalid tokens for user ${userId}`);
                }
              }
            } catch (error) {
              console.error(`Failed to remove invalid tokens for user ${userId}:`, error);
            }
          }
        }
      }

      console.log(`Sent ${totalNotifications} match reminder notifications`);
    } catch (error) {
      console.error('Error in scheduledMatchReminder:', error);
    }
  });
