import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMatchSchema, type InsertMatch } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { User } from '@/lib/firestore';
import { useQuery } from '@tanstack/react-query';
import { getMatches } from '@/lib/firestore';
import { useState, useEffect } from 'react';
import { TeamSelector } from "./TeamSelector";
import { ChevronDown } from 'lucide-react';

interface MatchFormProps {
  onSubmit: (data: InsertMatch) => void;
  defaultValues?: Partial<InsertMatch> & { id?: string };
  referees?: User[];
  balls?: any[];
}

export default function MatchForm({ onSubmit, defaultValues, referees, balls }: MatchFormProps) {
 

  const [isUploading, setIsUploading] = useState(false);
  const [selectedBalls, setSelectedBalls] = useState<Array<{ ballId: string; location: string }>>([]);
  const [selectedBallIds, setSelectedBallIds] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Initialize selected balls from defaultValues if editing
  useEffect(() => {
    if (defaultValues?.balls && Array.isArray(defaultValues.balls) && defaultValues.balls.length > 0) {
      setSelectedBalls(defaultValues.balls);
      const ballIds = defaultValues.balls.map(b => b.ballId);
      setSelectedBallIds(ballIds);
      if (defaultValues.balls.length > 0) {
        setSelectedLocation(defaultValues.balls[0].location);
      }
    } else {
      setSelectedBalls([]);
      setSelectedBallIds([]);
      setSelectedLocation('');
    }
  }, [defaultValues?.id]);

  // Fetch all matches to check for time conflicts
  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches
  });

  const validateForm = (data: InsertMatch) => {
    const getRefereeId = (ref: any) => {
      if (!ref) return null;
      if (typeof ref === 'string') return ref;
      return ref.id || ref.name;
    };

    const mainRef = getRefereeId(data.mainReferee);
    const assistant1 = getRefereeId(data.assistantReferee1);
    const assistant2 = getRefereeId(data.assistantReferee2);

    const refereeAssignments = [mainRef, assistant1, assistant2].filter(Boolean);
    const uniqueReferees = new Set(refereeAssignments);

    if (uniqueReferees.size !== refereeAssignments.length) {
      return {
        mainReferee: 'A referee cannot be assigned to multiple roles in the same match'
      };
    }

    // Check for duplicate/conflicting matches based on new rules
    const homeTeamName = data.homeTeam.name.toLowerCase().trim();
    const awayTeamName = data.awayTeam.name.toLowerCase().trim();
    const matchTime = data.date.getTime();
    const venue = (data.venue || "").toLowerCase().trim();
    
    const duplicateMatch = matches.find(match => {
      if (defaultValues?.id === match.id) return false; // Skip current match when editing

      const existingHomeTeam = match.homeTeam;
      const existingAwayTeam = match.awayTeam;
      const existingHomeName = (typeof existingHomeTeam === "string" 
        ? existingHomeTeam 
        : existingHomeTeam?.name || "").toLowerCase().trim();
      const existingAwayName = (typeof existingAwayTeam === "string" 
        ? existingAwayTeam 
        : existingAwayTeam?.name || "").toLowerCase().trim();
      
      // Calculate time difference in hours and minutes
      const existingMatchTime = new Date(match.date).getTime();
      const timeDiffMs = Math.abs(matchTime - existingMatchTime);
      const timeDiffHours = timeDiffMs / (60 * 60 * 1000);
      const timeDiffMinutes = timeDiffMs / (60 * 1000);
      
      const existingVenue = (match.venue || "").toLowerCase().trim();
      const sameVenue = venue === existingVenue;
      
      // Rule: Same venue + same date + same time (within 5 minutes) -> conflict regardless of teams
      // This prevents two matches at the same venue at the exact same time
      if (sameVenue && timeDiffMinutes < 5) {
        return { sameVenue, existingVenue, sameTime: true, oneTeamMatch: false };
      }
      
      // If time difference is less than 2 hours, check for other conflicts
      if (timeDiffHours < 2) {
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

    if (duplicateMatch) {
      const conflictDetails = duplicateMatch as any;
      
      // Rule: Same venue + same date + same time (within 5 minutes) -> conflict regardless of teams
      if (conflictDetails.sameTime && conflictDetails.sameVenue) {
        return {
          date: 'A match already exists at this venue, date, and time'
        };
      }
      
      // Rule: Same venue, same time, one team matches -> not allowed
      if (conflictDetails.oneTeamMatch && conflictDetails.sameVenue) {
        return {
          date: 'A match with the same team at the same venue, date, and time already exists'
        };
      }
      
      // Rule 1: Same info (teams, date, time, venue) - "match already exists"
      // Rule 2: Same teams, date, time, different venue - not allowed
      if (conflictDetails.sameVenue) {
        return {
          date: 'Match already exists'
        };
      } else {
        return {
          date: 'A match with the same teams at the same time already exists at a different venue'
        };
      }
    }

    const refereeConflictMatch = matches.find(match => {
      if (defaultValues?.id === match.id) return false;

      const existingMatchTime = new Date(match.date).getTime();
      const hourDiff = Math.abs(matchTime - existingMatchTime) / (60 * 60 * 1000);

      if (hourDiff < 2) {
        const getMatchRefereeId = (ref: any) => {
          if (!ref) return null;
          if (typeof ref === 'string') return ref;
          return ref.id || ref.name;
        };

        const matchMainRef = getMatchRefereeId(match.mainReferee);
        const matchAssistant1 = getMatchRefereeId(match.assistantReferee1);
        const matchAssistant2 = getMatchRefereeId(match.assistantReferee2);

        const matchReferees = [matchMainRef, matchAssistant1, matchAssistant2].filter(Boolean);

        return [mainRef, assistant1, assistant2].some(ref =>
          ref && matchReferees.some(matchRef => matchRef === ref)
        );
      }
      return false;
    });

    if (refereeConflictMatch) {
      return {
        mainReferee: `One or more referees are already assigned to another match at ${new Date(refereeConflictMatch.date).toLocaleTimeString()}`
      };
    }

    return {};
  };

  const form = useForm<InsertMatch>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: {
      homeTeam: defaultValues?.homeTeam || { id: 0, name: '', logo: undefined },
      awayTeam: defaultValues?.awayTeam || { id: 0, name: '', logo: undefined },
      venue: defaultValues?.venue || '',
      date: defaultValues?.date || new Date(),
      league: defaultValues?.league || '',
      // Convert "live" to "started" for form compatibility (form uses "started" as value)
      status: (defaultValues?.status === "live" ? "started" : defaultValues?.status) || 'not_started',
      mainReferee: defaultValues?.mainReferee || { id: '', name: '' },
      assistantReferee1: defaultValues?.assistantReferee1 || undefined,
      assistantReferee2: defaultValues?.assistantReferee2 || undefined,
      balls: defaultValues?.balls || []
    }
  });

  // Reset form when defaultValues change (e.g., when editing a different match)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        homeTeam: defaultValues.homeTeam || { id: 0, name: '', logo: undefined },
        awayTeam: defaultValues.awayTeam || { id: 0, name: '', logo: undefined },
        venue: defaultValues.venue || '',
        date: defaultValues.date || new Date(),
        league: defaultValues.league || '',
        // Convert "live" to "started" for form compatibility
        status: (defaultValues.status === "live" ? "started" : defaultValues.status) || 'not_started',
        mainReferee: defaultValues.mainReferee || { id: '', name: '' },
        assistantReferee1: defaultValues.assistantReferee1 || undefined,
        assistantReferee2: defaultValues.assistantReferee2 || undefined,
        balls: defaultValues.balls || []
      });
    }
  }, [defaultValues?.id, form]);

  const handleSubmit = async (data: InsertMatch) => {
    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([key, value]) => {
        form.setError(key as any, { message: value });
      });
      return;
    }

    // Create balls array with selected location for all selected ball IDs
    const ballsData = selectedBallIds.map(ballId => ({
      ballId,
      location: selectedLocation
    }));

    data.balls = ballsData;

    // ✅ Add default values for new matches
    const matchData = {
      ...data,
      matchGoals: 0,
      matchOuts: 0,
      cornerViolations: 0
    } as InsertMatch;

    console.log('Submitting match data with balls:', matchData);
    onSubmit(matchData);
  };

  const handleBallToggle = (ballId: string) => {
    setSelectedBallIds(prev => {
      if (prev.includes(ballId)) {
        return prev.filter(id => id !== ballId);
      } else {
        return [...prev, ballId];
      }
    });
  };

  const isBallSelected = (ballId: string) => {
    return selectedBallIds.includes(ballId);
  };

  // Get all unique locations from all balls
  const getAllLocations = () => {
    if (!balls || balls.length === 0) return [];
    
    const locations = new Set<string>();
    balls.forEach(ball => {
      const location = ball.Location || ball.Locaiton;
      if (location) {
        locations.add(location);
      }
    });
    
    return Array.from(locations);
  };

  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) {
      const now = new Date();
      return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      const now = new Date();
      return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    }

    const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="homeTeam"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Team</FormLabel>
                  <FormControl>
                    <TeamSelector
                      value={
                        typeof field.value === "object" && field.value !== null && field.value?.name
                          ? {
                              id: field.value.id || 0,
                              name: field.value.name || "",
                              logo: field.value.logo || "",
                            }
                          : undefined
                      }
                      onValueChange={(team) => {
                        field.onChange({
                          id: team.id,
                          name: team.name,
                          logo: team.logo,
                        });
                      }}
                      placeholder="Select home team..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <FormField
              control={form.control}
              name="awayTeam"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Away Team</FormLabel>
                  <FormControl>
                    <TeamSelector
                      value={
                        typeof field.value === "object" && field.value !== null && field.value?.name
                          ? {
                              id: field.value.id || 0,
                              name: field.value.name || "",
                              logo: field.value.logo || "",
                            }
                          : undefined
                      }
                      onValueChange={(team) => {
                        field.onChange({
                          id: team.id,
                          name: team.name,
                          logo: team.logo,
                        });
                      }}
                      placeholder="Select away team..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="league"
            render={({ field }) => (
              <FormItem>
                <FormLabel>League</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#2b2b2b] text-white border-0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#2b2b2b] text-white border-0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date and Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={formatDateForInput(field.value)}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      if (!isNaN(date.getTime())) {
                        field.onChange(date);
                      }
                    }}
                    className="bg-[#2b2b2b] text-white border-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="started">Live</option>
                    <option value="ended">Ended</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="mainReferee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Referee</FormLabel>
                <FormControl>
                  <select
                    value={typeof field.value === 'string' ? field.value : field.value?.id || ''}
                    onChange={(e) => {
                      const referee = referees?.find(r => r.id === e.target.value);
                      if (referee) {
                        field.onChange({
                          id: referee.id,
                          name: `${referee.firstName} ${referee.lastName}`
                        });
                      }
                    }}
                    className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                  >
                    <option value="">Select Main Referee</option>
                    {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                      <option key={referee.id} value={referee.id}>
                        {`${referee.firstName} ${referee.lastName}`}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="assistantReferee1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assistant Referee 1</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ? (typeof field.value === 'string' ? field.value : field.value?.id || '') : ''}
                      onChange={(e) => {
                        if (!e.target.value) {
                          field.onChange(undefined);
                          return;
                        }
                        const referee = referees?.find(r => r.id === e.target.value);
                        if (referee) {
                          field.onChange({
                            id: referee.id,
                            name: `${referee.firstName} ${referee.lastName}`
                          });
                        }
                      }}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                        <option key={referee.id} value={referee.id}>
                          {`${referee.firstName} ${referee.lastName}`}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assistantReferee2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assistant Referee 2</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ? (typeof field.value === 'string' ? field.value : field.value?.id || '') : ''}
                      onChange={(e) => {
                        if (!e.target.value) {
                          field.onChange(undefined);
                          return;
                        }
                        const referee = referees?.find(r => r.id === e.target.value);
                        if (referee) {
                          field.onChange({
                            id: referee.id,
                            name: `${referee.firstName} ${referee.lastName}`
                          });
                        }
                      }}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                        <option key={referee.id} value={referee.id}>
                          {`${referee.firstName} ${referee.lastName}`}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Balls Selection Dropdown */}
        <div className="grid grid-cols-2 gap-3">
          <FormItem>
            <FormLabel>Balls ({selectedBallIds.length} selected)</FormLabel>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3 flex items-center justify-between hover:bg-[#3a3a3a]"
              >
                <span className="text-sm">
                  {selectedBallIds.length === 0 
                    ? 'Select balls...' 
                    : `${selectedBallIds.length} ball${selectedBallIds.length > 1 ? 's' : ''} selected`
                  }
                </span>
                <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[#2b2b2b] border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {balls && balls.length > 0 ? (
                    balls.map((ball) => {
                      return (
                        <label
                          key={ball.id}
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-[#3a3a3a] cursor-pointer border-b border-gray-700 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={isBallSelected(ball.id)}
                            onChange={() => handleBallToggle(ball.id)}
                            className="w-4 h-4 text-[#6ab100] bg-gray-700 border-gray-600 rounded focus:ring-[#6ab100] cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">Ball {ball.id}</div>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">No balls available</div>
                  )}
                </div>
              )}
            </div>
          </FormItem>

          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
              >
                <option value="">Select Location</option>
                {getAllLocations().map((location, idx) => (
                  <option key={idx} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </FormControl>
          </FormItem>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#6ab100] hover:bg-[#5a9700] mt-6"
          disabled={isUploading}
        >
          {isUploading ? 'Uploading Images...' : 'Save Match'}
        </Button>
      </form>
    </Form>
  );
}