import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation('/dashboard');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid email or password"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background with opacity */}
      <div className="absolute inset-0 bg-[#171717] bg-[url('/assets/ball-net.png')] bg-cover bg-center opacity-35"></div>

      {/* Content positioned above the background */}
      <div className="relative z-10 flex items-center justify-center w-full">
      <img src="/assets/Hakkim_white_temp.png" alt="Hakkim Logo" className="fixed top-8 left-8 w-48" />

        <Card className="w-full max-w-md mx-4 bg-[#212121] rounded-xl border-0">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-white mb-6">Welcome Back!</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
            />
            <div className="relative">
              <Input
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#2b2b2b] border-0 text-white placeholder:text-[#787878] rounded-lg"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#787878] hover:text-white transition-colors"
              >
                {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <Link href="/forgot-password">
              <span className="block text-right text-sm text-[#6ab100] cursor-pointer">
                Forgot Password?
              </span>
            </Link>

            <Button 
              type="submit" 
              className="w-full bg-[#6ab100] hover:bg-[#5a9700] text-white rounded-lg"
            >
              LOG IN
            </Button>
          </form>

          <Link href="/signup">
            <span className="block text-center mt-6 text-[#787878] cursor-pointer">
              Don't have an account? <span className="text-[#6ab100]">Sign up</span>
            </span>
          </Link>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}