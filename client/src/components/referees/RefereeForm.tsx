import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Updated schema to match User type in firestore.ts
const refereeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").regex(/^[A-Za-z]+$/, "First name must contain only letters"),
  lastName: z.string().min(1, "Last name is required").regex(/^[A-Za-z]+$/, "Last name must contain only letters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05").optional(),
  isAvailable: z.boolean().default(true)
});

type RefereeFormValues = z.infer<typeof refereeFormSchema>;

interface RefereeFormProps {
  onSubmit: (data: RefereeFormValues) => void;
  defaultValues?: Partial<RefereeFormValues>;
  isSubmitting?: boolean;
}

export default function RefereeForm({ onSubmit, defaultValues, isSubmitting }: RefereeFormProps) {
  const form = useForm<RefereeFormValues>({
    resolver: zodResolver(refereeFormSchema),
    defaultValues: defaultValues || {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      isAvailable: true
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} className="bg-[#2b2b2b] text-white border-0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input {...field} className="bg-[#2b2b2b] text-white border-0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" className="bg-[#2b2b2b] text-white border-0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} type="tel" placeholder="05XXXXXXXX" className="bg-[#2b2b2b] text-white border-0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <FormLabel>Available for Matches</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full bg-[#6ab100] hover:bg-[#5a9700]"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Referee'}
        </Button>
      </form>
    </Form>
  );
}