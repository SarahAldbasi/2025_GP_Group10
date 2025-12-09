// API-Football service for fetching team data through our backend
// Use environment variable for production, fallback to relative URL for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/football';

export interface Team {
  id: number;
  name: string;
  code: string;
  country: string;
  logo: string;
  founded?: number;
  national: boolean;
}

export interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
}

export interface TeamResponse {
  team: Team;
}

export interface LeagueResponse {
  league: League;
}

// Fetch teams from a specific league and season
export async function fetchTeamsByLeague(leagueId: number, season: number = 2023): Promise<Team[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams?league=${leagueId}&season=${season}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    return data.teams || [];
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
}

// Fetch popular leagues
export async function fetchPopularLeagues(): Promise<League[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leagues?season=2023`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    return data.leagues || [];
  } catch (error) {
    console.error('Error fetching leagues:', error);
    throw error;
  }
}

// Fetch all popular teams from major leagues
export async function fetchAllPopularTeams(): Promise<Team[]> {
  try {
    // Fetch teams from popular leagues (no specific league filter)
    const response = await fetch(`${API_BASE_URL}/teams`);

    if (!response.ok) {
      // Handle rate limit specifically
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(data.message || 'API rate limit reached. Please try again later.');
        (error as any).isRateLimit = true;
        throw error;
      }
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      const error = new Error(data.message || data.error);
      if (data.error.includes('rate limit') || data.error.includes('request limit')) {
        (error as any).isRateLimit = true;
      }
      throw error;
    }

    return data.teams || [];
  } catch (error) {
    console.error('Error fetching all teams:', error);
    throw error;
  }
}

// Search teams by name (useful for custom search)
export async function searchTeams(name: string, country?: string): Promise<Team[]> {
  try {
    let url = `${API_BASE_URL}/teams?search=${encodeURIComponent(name)}`;
    if (country) {
      url += `&country=${encodeURIComponent(country)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    return data.teams || [];
  } catch (error) {
    console.error('Error searching teams:', error);
    throw error;
  }
}