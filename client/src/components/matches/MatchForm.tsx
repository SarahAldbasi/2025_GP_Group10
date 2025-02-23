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
import type { Referee } from '@/lib/firestore';
import { useQuery } from '@tanstack/react-query';
import { getMatches } from '@/lib/firestore';

interface MatchFormProps {
  onSubmit: (data: InsertMatch) => void;
  defaultValues?: Partial<InsertMatch>;
  referees?: Referee[];
}

export default function MatchForm({ onSubmit, defaultValues, referees }: MatchFormProps) {
  const form = useForm<InsertMatch>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: {
      homeTeam: defaultValues?.homeTeam || '',
      awayTeam: defaultValues?.awayTeam || '',
      venue: defaultValues?.venue || '',
      date: defaultValues?.date || new Date(),
      league: defaultValues?.league || '',
      status: defaultValues?.status || 'not_started',
      mainReferee: defaultValues?.mainReferee || '',
      assistantReferee1: defaultValues?.assistantReferee1 || null,
      assistantReferee2: defaultValues?.assistantReferee2 || null
    }
  });

  // Fetch all matches to check for time conflicts
  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches
  });

  const validateRefereeAssignment = (
    refereeName: string,
    field: 'mainReferee' | 'assistantReferee1' | 'assistantReferee2',
    date: Date
  ) => {
    // Check if referee is already assigned to another role in this match
    const formValues = form.getValues();
    const otherRoles = ['mainReferee', 'assistantReferee1', 'assistantReferee2'].filter(
      role => role !== field
    );

    const isAssignedOtherRole = otherRoles.some(
      role => formValues[role] === refereeName
    );

    if (isAssignedOtherRole) {
      return 'Referee cannot be assigned multiple roles in the same match';
    }

    // Check for time conflicts with other matches
    const matchTime = date.getTime();
    const hasTimeConflict = matches.some(match => {
      const matchDate = new Date(match.date).getTime();
      const hourDiff = Math.abs(matchTime - matchDate) / (60 * 60 * 1000);

      // Consider it a conflict if matches are within 3 hours of each other
      if (hourDiff < 3) {
        return (
          match.mainReferee === refereeName ||
          match.assistantReferee1 === refereeName ||
          match.assistantReferee2 === refereeName
        );
      }
      return false;
    });

    if (hasTimeConflict) {
      return 'Referee is already assigned to another match at this time';
    }

    return true;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto px-1">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="homeTeam"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Team</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-[#2b2b2b] text-white border-0" />
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
                    value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
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
                    value={field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      const date = form.getValues('date');
                      const validation = validateRefereeAssignment(value, 'mainReferee', date);

                      if (validation === true) {
                        field.onChange(value);
                      } else {
                        form.setError('mainReferee', { message: validation });
                      }
                    }}
                    className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                  >
                    <option value="">Select Main Referee</option>
                    {referees?.map((referee) => (
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
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value || null;
                        const date = form.getValues('date');
                        const validation = value ? validateRefereeAssignment(value, 'assistantReferee1', date) : true;

                        if (validation === true) {
                          field.onChange(value);
                        } else {
                          form.setError('assistantReferee1', { message: validation });
                        }
                      }}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.map((referee) => (
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
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value || null;
                        const date = form.getValues('date');
                        const validation = value ? validateRefereeAssignment(value, 'assistantReferee2', date) : true;

                        if (validation === true) {
                          field.onChange(value);
                        } else {
                          form.setError('assistantReferee2', { message: validation });
                        }
                      }}
                      className="w-full bg-[#2b2b2b] text-white border-0 rounded-lg h-10 px-3"
                    >
                      <option value="">Select Referee</option>
                      {referees?.map((referee) => (
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