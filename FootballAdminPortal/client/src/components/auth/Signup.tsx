import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { auth, googleProvider } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SiGoogle } from 'react-icons/si';

export default function Signup() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword]);

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
        description: "Failed to create account"
      });
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setLocation('/dashboard');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign up with Google"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#171717] bg-[url('/ball-net.png')] bg-cover bg-center">
      <img src="/Hakkim_white.png" alt="Hakkim Logo" className="absolute top-4 left-4 w-32" />

      <Card className="w-full max-w-md mx-4 bg-[#212121] rounded-xl border-0">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-white text-center mb-6">Let's get started!</h1>

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
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
              required
            />
            <div>
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg ${
                  passwordError ? 'border-red-500' : ''
                }`}
                required
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#6ab100] hover:bg-[#5a9700] text-white rounded-lg"
            >
              SIGN UP
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#787878] mb-4">or sign up with</p>
            <div className="flex justify-center">
              <button
                onClick={handleGoogleSignUp}
                className="w-12 h-12 rounded-full bg-[#2b2b2b] flex items-center justify-center hover:bg-[#3b3b3b] transition-colors"
              >
                <SiGoogle className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <Link href="/login">
            <span className="block text-center mt-6 text-[#787878] cursor-pointer">
              Already have an account? <span className="text-[#6ab100]">Log in</span>
            </span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}