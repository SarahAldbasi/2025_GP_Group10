
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

interface MatchFormProps {
  onSubmit: (data: InsertMatch) => void;
  defaultValues?: Partial<InsertMatch> & { id?: string };
  referees?: User[];
}

export default function MatchForm({ onSubmit, defaultValues, referees }: MatchFormProps) {
  // Fetch all matches to check for time conflicts
  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches
  });

  const validateForm = (data: InsertMatch) => {
    // Extract referee IDs or names for comparison
    const getRefereeId = (ref: any) => {
      if (!ref) return null;
      if (typeof ref === 'string') return ref;
      return ref.id || ref.name;
    };

    // Check for duplicate referee assignments within the same match
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

    // Check for time conflicts with other matches
    const matchTime = data.date.getTime();
    const conflictingMatch = matches.find(match => {
      if (defaultValues?.id === match.id) return false; // Skip current match when editing

      const existingMatchTime = new Date(match.date).getTime();
      const hourDiff = Math.abs(matchTime - existingMatchTime) / (60 * 60 * 1000);

      // Check if matches are on the same day and within 3 hours
      if (hourDiff < 3) {
        // Extract referee IDs from the existing match
        const getMatchRefereeId = (ref: any) => {
          if (!ref) return null;
          if (typeof ref === 'string') return ref;
          return ref.id || ref.name;
        };
        
        const matchMainRef = getMatchRefereeId(match.mainReferee);
        const matchAssistant1 = getMatchRefereeId(match.assistantReferee1);
        const matchAssistant2 = getMatchRefereeId(match.assistantReferee2);
        
        const matchReferees = [matchMainRef, matchAssistant1, matchAssistant2].filter(Boolean);
        
        // Check if any referee is assigned to both matches
        return [mainRef, assistant1, assistant2].some(ref => 
          ref && matchReferees.some(matchRef => matchRef === ref)
        );
      }
      return false;
    });

    if (conflictingMatch) {
      return {
        mainReferee: `One or more referees are already assigned to another match at ${new Date(conflictingMatch.date).toLocaleTimeString()}`
      };
    }

    return {};
  };

  // Prepare default values for the form
  const prepareDefaultValues = () => {
    const getDefaultValue = (field: any, defaultField: string) => {
      if (!field) return defaultField;
      if (typeof field === 'string') return field;
      return field.name || field.id || defaultField;
    };

    return {
      homeTeam: getDefaultValue(defaultValues?.homeTeam, ''),
      awayTeam: getDefaultValue(defaultValues?.awayTeam, ''),
      venue: defaultValues?.venue || '',
      date: defaultValues?.date || new Date(),
      league: defaultValues?.league || '',
      status: defaultValues?.status || 'not_started',
      mainReferee: getDefaultValue(defaultValues?.mainReferee, ''),
      assistantReferee1: defaultValues?.assistantReferee1 ? getDefaultValue(defaultValues.assistantReferee1, '') : null,
      assistantReferee2: defaultValues?.assistantReferee2 ? getDefaultValue(defaultValues.assistantReferee2, '') : null
    };
  };

  const form = useForm<InsertMatch>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: prepareDefaultValues()
  });

  const handleSubmit = async (data: InsertMatch) => {
    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([key, value]) => {
        form.setError(key as any, { message: value });
      });
      return;
    }
    onSubmit(data);
  };

  // Format date string for datetime-local input
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return new Date().toISOString().slice(0, 16);
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return new Date().toISOString().slice(0, 16);
    
    return dateObj.toISOString().slice(0, 16);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="homeTeam"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Team</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value.name || ''} className="bg-[#2b2b2b] text-white border-0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="awayTeam"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Away Team</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value.name || ''} className="bg-[#2b2b2b] text-white border-0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <option value="live">Live</option>
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
                    value={typeof field.value === 'string' ? field.value : field.value?.name || field.value?.id || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                  >
                    <option value="">Select Main Referee</option>
                    {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                      <option 
                        key={referee.id} 
                        value={`${referee.firstName} ${referee.lastName}`}
                      >
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
                      value={field.value ? (typeof field.value === 'string' ? field.value : field.value?.name || field.value?.id || '') : ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                        <option 
                          key={referee.id} 
                          value={`${referee.firstName} ${referee.lastName}`}
                        >
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
                      value={field.value ? (typeof field.value === 'string' ? field.value : field.value?.name || field.value?.id || '') : ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.filter(ref => ref.role === 'referee').map((referee) => (
                        <option 
                          key={referee.id} 
                          value={`${referee.firstName} ${referee.lastName}`}
                        >
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

        <Button 
          type="submit" 
          className="w-full bg-[#6ab100] hover:bg-[#5a9700] mt-6"
        >
          Save Match
        </Button>
      </form>
    </Form>
  );
}
