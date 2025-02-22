import { useState } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.currentUser;

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user) {
        // Update display name
        if (name !== user.displayName) {
          await updateProfile(user, { displayName: name });
        }

        // Update email
        if (email !== user.email) {
          await updateEmail(user, email);
        }

        // Update password
        if (newPassword && newPassword === confirmPassword) {
          await updatePassword(user, newPassword);
        }

        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

        <Card className="bg-[#212121]">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#2b2b2b] border-0 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#2b2b2b] border-0 text-white"
                />
              </div>

              <div className="pt-4 border-t border-[#2b2b2b]">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#2b2b2b] border-0 text-white"
                  />
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#2b2b2b] border-0 text-white"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#2b2b2b] border-0 text-white"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#6ab100]">
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}