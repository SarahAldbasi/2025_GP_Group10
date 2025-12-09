import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.currentUser;
  const [editMode, setEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState(() => {
    const names = user?.displayName?.split(' ') || ['', ''];
    return names[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const names = user?.displayName?.split(' ') || ['', ''];
    return names[1] || '';
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);

  // Password validation states
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });

  useEffect(() => {
    const validate = {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    };
    setValidations(validate);
  }, [newPassword]);

  // Password requirement component
  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-[#6ab100]" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={met ? 'text-[#6ab100]' : 'text-[#787878]'}>{text}</span>
    </div>
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      if (!user) throw new Error("No user logged in");

       // Validate names (letters only)
       const nameRegex = /^[a-zA-Z\s]+$/;
       if (!nameRegex.test(firstName.trim())) {
         throw new Error("First name should contain only letters");
       }
       if (!nameRegex.test(lastName.trim())) {
         throw new Error("Last name should contain only letters");
       }

      // If changing password, validate current password first
      if (newPassword) {
        if (!currentPassword) {
          throw new Error("Current password is required to set a new password");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("New passwords do not match");
        }
        if (!Object.values(validations).every(Boolean)) {
          throw new Error("New password does not meet requirements");
        }

        try {
          // Reauthenticate before password change
          const credential = EmailAuthProvider.credential(
            user.email!,
            currentPassword,
          );
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
        } catch (authError: any) {
          // Handle authentication-specific errors
          if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
            throw new Error("The current password you entered is incorrect. Please try again.");
          } else if (authError.code === 'auth/too-many-requests') {
            throw new Error("Too many failed attempts. Please wait a moment and try again.");
          } else {
            throw new Error("Authentication failed. Please verify your current password.");
          }
        }
      }

      // Update display name
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (fullName !== user.displayName) {
        await updateProfile(user, { displayName: fullName });
      }

      setEditMode(false);
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Profile Update Failed",
        description: error.message || "Failed to update profile"
      });
    } finally {
      setIsUpdating(false);
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
                <Button onClick={() => setEditMode(true)} variant="outline" className='bg-[#6ab100] hover:bg-[#5a9700]'>
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
                      onChange={(e) => {
                        // Only allow letters and spaces
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setFirstName(value);
                      }}
                      className="bg-[#2b2b2b] border-0 text-white"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Last Name</label>
                    <Input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        // Only allow letters and spaces
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setLastName(value);
                      }}
                      className="bg-[#2b2b2b] border-0 text-white"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{user?.email}</p>
                </div>

                <div className="pt-4 border-t border-[#2b2b2b]">
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        type={passwordVisible ? 'text' : 'password'}
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-[#2b2b2b] border-0 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
                      >
                        {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={newPasswordVisible ? 'text' : 'password'}
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-[#2b2b2b] border-0 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setNewPasswordVisible(!newPasswordVisible)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
                      >
                        {newPasswordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={confirmPasswordVisible ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`bg-[#2b2b2b] border-0 text-white ${
                          confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
                      >
                        {confirmPasswordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>

                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-red-500 text-sm">Passwords do not match</p>
                    )}

                    {newPassword && (
                      <div className="flex flex-wrap gap-4">
                        <PasswordRequirement met={validations.minLength} text="Minimum 8 characters" />
                        <PasswordRequirement met={validations.hasUpper} text="1 UPPERCASE letter" />
                        <PasswordRequirement met={validations.hasLower} text="1 lowercase letter" />
                        <PasswordRequirement met={validations.hasNumber} text="1 numerical" />
                        <PasswordRequirement met={validations.hasSpecial} text="1 special character" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#6ab100]"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditMode(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setCurrentPassword('');
                    }}
                    disabled={isUpdating}
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
                  <p className="text-white">{user?.email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}