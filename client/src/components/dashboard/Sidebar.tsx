import { Link, useLocation } from 'wouter';
import { LogOut, Home, Calendar, Users, UserCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export default function Sidebar() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="w-64 bg-[#212121] h-screen flex flex-col">
      <div className="p-4">
        <img src="/Hakkim_white.png" alt="Hakkim Logo" className="w-32" />
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <Link href="/dashboard">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/dashboard') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Home className="mr-3" />
            Dashboard
          </div>
        </Link>

        <Link href="/matches">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/matches') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Calendar className="mr-3" />
            Matches
          </div>
        </Link>

        <Link href="/referees">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/referees') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Users className="mr-3" />
            Referees
          </div>
        </Link>

        <Link href="/profile">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/profile') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <UserCircle className="mr-3" />
            Profile
          </div>
        </Link>
      </nav>

      <div className="p-4 border-t border-[#2b2b2b]">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="flex items-center justify-center w-full text-[#787878] hover:text-white"
        >
          <LogOut className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}