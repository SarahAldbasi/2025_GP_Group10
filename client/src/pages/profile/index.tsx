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
  const [editMode, setEditMode] = useState(false);

  // Split display name into first and last name
  const [firstName, setFirstName] = useState(() => {
    const names = user?.displayName?.split(' ') || ['', ''];
    return names[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const names = user?.displayName?.split(' ') || ['', ''];
    return names[1] || '';
  });
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user) {
        // Update display name (combining first and last name)
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName !== user.displayName) {
          await updateProfile(user, { displayName: fullName });
        }

        // Update email
        if (email !== user.email) {
          await updateEmail(user, email);
        }

        // Update password
        if (newPassword && newPassword === confirmPassword) {
          await updatePassword(user, newPassword);
        }

        setEditMode(false);
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
      <div className="px-8 pt-4">
        <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

        <Card className="bg-[#212121] max-w-2xl">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Profile Information</span>
              {!editMode && (
                <Button onClick={() => setEditMode(true)} variant="outline">
                  Edit Profile
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">First Name</label>
                    <Input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-[#2b2b2b] border-0 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Last Name</label>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-[#2b2b2b] border-0 text-white"
                    />
                  </div>
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

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#6ab100]"
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">First Name</label>
                    <p className="text-white">{firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Last Name</label>
                    <p className="text-white">{lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}