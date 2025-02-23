import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMatchSchema, type InsertMatch } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface MatchFormProps {
  onSubmit: (data: InsertMatch) => void;
  defaultValues?: Partial<InsertMatch>;
  referees?: { id: string; firstName: string; lastName: string }[];
}

export default function MatchForm({ onSubmit, defaultValues, referees }: MatchFormProps) {
  const form = useForm<InsertMatch>({
    resolver: zodResolver(insertMatchSchema),
    defaultValues: {
      homeTeam: defaultValues?.homeTeam || '',
      awayTeam: defaultValues?.awayTeam || '',
      venue: defaultValues?.venue || '',
      date: defaultValues?.date ? new Date(defaultValues.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      league: defaultValues?.league || '',
      status: defaultValues?.status || 'not_started',
      assistantReferee1: defaultValues?.assistantReferee1 || null,
      assistantReferee2: defaultValues?.assistantReferee2 || null
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date and Time</FormLabel>
              <FormControl>
                <Input 
                  type="datetime-local" 
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <option value="not_started">Not Started</option>
                  <option value="live">Live</option>
                  <option value="ended">Ended</option>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assistantReferee1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assistant Referee 1</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value || null)}
                >
                  <option value="">Select Referee</option>
                  {referees?.map((referee) => (
                    <option key={referee.id} value={referee.id}>
                      {`${referee.firstName} ${referee.lastName}`}
                    </option>
                  ))}
                </Select>
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
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value || null)}
                >
                  <option value="">Select Referee</option>
                  {referees?.map((referee) => (
                    <option key={referee.id} value={referee.id}>
                      {`${referee.firstName} ${referee.lastName}`}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-[#6ab100]">
          Save Match
        </Button>
      </form>
    </Form>
  );
}