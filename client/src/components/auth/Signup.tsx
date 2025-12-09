import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function Signup() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const { toast } = useToast();

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
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    setValidations(validate);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match"
      });
      return;
    }

    if (!Object.values(validations).every(Boolean)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please meet all password requirements"
      });
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { 
        displayName: `${firstName} ${lastName}`,
      });
      setLocation('/dashboard');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email address already in use"
      });
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[#171717] bg-[url('/assets/ball-net.png')] bg-cover bg-center opacity-35"></div>

      <div className="relative z-10 flex items-center justify-center w-full">
        <img src="/assets/Hakkim_white_temp.png" alt="Hakkim Logo" className="fixed top-8 left-8 w-48" />

        <Card className="w-full max-w-md mx-4 bg-[#212121] rounded-xl border-0">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-white mb-6">Let's get started!</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
                  required
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
                  required
                />
              </div>
              <Input
                type="email"
                placeholder="example@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
                required
              />
              <div className="relative">
                <Input
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
                >
                  {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="flex flex-wrap gap-4">
                  <PasswordRequirement met={validations.minLength} text="Minimum 8 characters" />
                  <PasswordRequirement met={validations.hasUpper} text="1 UPPERCASE letter" />
                  <PasswordRequirement met={validations.hasLower} text="1 lowercase letter" />
                  <PasswordRequirement met={validations.hasNumber} text="1 numerical" />
                  <PasswordRequirement met={validations.hasSpecial} text="1 special character" />
                </div>
              )}

              <div className="relative">
                <Input
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg ${
                    confirmPassword && password !== confirmPassword ? 'border-red-500' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
                >
                  {confirmPasswordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-sm">Passwords do not match</p>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#6ab100] hover:bg-[#5a9700] text-white rounded-lg"
              >
                SIGN UP
              </Button>
            </form>

            <Link href="/login">
              <span className="block text-center mt-6 text-[#787878] cursor-pointer">
                Already have an account? <span className="text-[#6ab100]">Log in</span>
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}