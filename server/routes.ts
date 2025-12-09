import { admin } from "./firebase"; // ✅ Standard import
import type { Express } from "express";
import { createServer, type Server } from "http";
import { getFCMTokensForUsers } from "./getFCMTokensForUsers";
import { sendPushNotification } from "./sendFCM";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post("/api/match-events", async (req, res) => {
    const { event, timestamp, matchId } = req.body;

    if (!event || !timestamp || !matchId) {
      return res.status(400).json({ error: "Missing required data" });
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
  // 🚀 NEW: Send Notification Route
  app.post("/api/send-notification", async (req, res) => {
    const { message, targetUserIds } = req.body;

    if (!message || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    try {
      const fcmTokens = await getFCMTokensForUsers(targetUserIds);

      if (fcmTokens.length === 0) {
        return res.status(200).json({ message: "No tokens found." });
      }

      const invalidTokens: string[] = [];
      let successCount = 0;
      
      for (const token of fcmTokens) {
        try {
          await sendPushNotification(token, {
            title: "New Notification",
            body: message,
          });
          successCount++;
        } catch (error: any) {
          console.error(`Failed to send notification to token ${token.substring(0, 10)}...:`, error);
          
          // Track invalid tokens (you may need to check error codes from sendFCM.ts)
          // For now, we'll log them but not remove automatically in local dev
          invalidTokens.push(token);
        }
      }

      res.status(200).json({ 
        message: "Notification sent successfully.",
        sent: successCount,
        failed: invalidTokens.length
      });
    } catch (error) {
      console.error("Push notification error:", error);
      res.status(500).json({ error: "Failed to send notification." });
    }
  });

 // API-Football endpoints
 app.get("/api/football/leagues", async (req, res) => {
  const { season = '2023' } = req.query; // Free plan supports 2021-2023
  
  try {
    const apiKey = process.env.API_FOOTBALL_KEY || '';
    
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
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
    
    console.log('Leagues API response:', JSON.stringify(data).substring(0, 200)); // Log first 200 chars
    
    if (data.errors && data.errors.length > 0) {
      console.error('API errors:', data.errors);
      return res.status(400).json({ error: data.errors.join(', ') });
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

app.get("/api/football/teams", async (req, res) => {
  const { league, season = '2023', search, country } = req.query; // Free plan supports 2021-2023
  
  try {
    const apiKey = process.env.API_FOOTBALL_KEY || '';
    
    console.log('API_FOOTBALL_KEY check:', { 
      hasKey: !!apiKey, 
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 4) + '...' 
    });
    
    if (!apiKey) {
      console.error('API_FOOTBALL_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    let url = 'https://v3.football.api-sports.io/teams';
    const params = new URLSearchParams();
    
    if (league) {
      params.append('league', league as string);
      params.append('season', season as string);
    } else if (search) {
      // When searching, only use search parameter (API doesn't allow season + search)
      params.append('search', search as string);
    } else {
      // When no league or search, fetch teams from popular leagues
      // We'll make multiple requests to popular leagues and combine results
      const popularLeagueIds = [39, 140, 78, 135, 61]; // Premier League, La Liga, Bundesliga, Serie A, Ligue 1
      const allTeams = [];
      let hasErrors = false;
      const errors: string[] = [];
      
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
              const errorMessages = leagueData.errors.map((e: any) => {
                if (typeof e === 'string') return e;
                if (e.requests) return e.requests;
                return JSON.stringify(e);
              });
              errors.push(`League ${leagueId}: ${errorMessages.join(', ')}`);
              hasErrors = true;
              
              // Check if it's a rate limit error
              const isRateLimit = errorMessages.some((msg: string) => 
                msg.toLowerCase().includes('request limit') || 
                msg.toLowerCase().includes('rate limit') ||
                msg.toLowerCase().includes('quota')
              );
              
              if (isRateLimit) {
                console.error('API rate limit reached - stopping further requests');
                // Return early with rate limit error
                return res.status(429).json({ 
                  error: 'API rate limit reached', 
                  message: 'You have reached the daily request limit for the API-Football free plan. Please try again tomorrow or upgrade your plan.',
                  details: errorMessages.join('; ')
                });
              }
              continue;
            }
            
            if (leagueData.response) {
              const teams = leagueData.response.map((item: any) => item.team);
              allTeams.push(...teams);
              console.log(`Added ${teams.length} teams from league ${leagueId}`);
            } else {
              console.warn(`No response data for league ${leagueId}`);
            }
          } else {
            const errorText = await leagueResponse.text();
            console.error(`Failed to fetch league ${leagueId}: ${leagueResponse.status}`, errorText);
            errors.push(`League ${leagueId}: HTTP ${leagueResponse.status}`);
            hasErrors = true;
          }
        } catch (error) {
          console.error(`Error fetching teams from league ${leagueId}:`, error);
          errors.push(`League ${leagueId}: ${error instanceof Error ? error.message : String(error)}`);
          hasErrors = true;
        }
      }
      
      console.log(`Total teams fetched: ${allTeams.length}`);
      
      // If we have teams, return them even if some leagues failed
      if (allTeams.length > 0) {
        return res.json({ teams: allTeams });
      }
      
      // If no teams and we had errors, return error response
      if (hasErrors) {
        console.error('Failed to fetch teams from all leagues:', errors);
        return res.status(500).json({ 
          error: 'Failed to fetch teams from API', 
          details: errors.join('; ') 
        });
      }
      
      // If no teams and no errors, return empty array (shouldn't happen but handle gracefully)
      return res.json({ teams: [] });
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
      const errorText = await response.text();
      console.error(`API request failed: ${response.status}`, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      console.error('API errors:', data.errors);
      return res.status(400).json({ error: data.errors.join(', ') });
    }

    const teams = data.response?.map((item: any) => item.team) || [];
    console.log(`Found ${teams.length} teams`);
    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams', details: error instanceof Error ? error.message : String(error) });
  }
});


  const httpServer = createServer(app);
  return httpServer;
}
