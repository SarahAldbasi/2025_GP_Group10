import { Link, useLocation } from 'wouter';
import { LogOut, Home, Calendar, Users, UserCircle, CheckCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';

export default function Sidebar() {
  const [location] = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const isActive = (path: string) => location === path;

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="w-48 bg-[#212121] h-screen flex flex-col">
      <div className="p-4">
      <img src="/assets/Hakkim_white_temp.png" alt="Hakkim Logo" className="mx-auto w-36 mt-6" />
      {/* Changed Logo */}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 pt-16"> {/* Added relative top-12 */}
        <Link href="/dashboard">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/dashboard') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Home className="mr-3 h-5.5 w-5.5" />
            <span className="text-sm truncate">Dashboard</span>
          </div>
        </Link>

        <Link href="/matches">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/matches') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Calendar className="mr-3 h-5.5 w-5.5" />
            <span className="text-sm truncate">Matches</span>
          </div>
        </Link>

        <Link href="/referees">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/referees') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <Users className="mr-3 h-5.5 w-5.5" />
            <span className="text-sm truncate">Referees</span>
          </div>
        </Link>

          
        <Link href="/verification"> {/* Added Verification Link */}
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/verification') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <CheckCircle className="mr-3 h-5.5 w-5.5" />
            <span className="text-sm truncate">Verification</span>
          </div>
        </Link>

        <Link href="/profile">
          <div className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer ${
            isActive('/profile') ? 'bg-[#6ab100]' : 'hover:bg-[#2b2b2b]'
          }`}>
            <UserCircle className="mr-3 h-5.5 w-5.5" />
            <span className="text-sm truncate">Profile</span>
          </div>
        </Link>
      </nav>

      <div className="p-4 border-t border-[#2b2b2b]">
        <Button
          onClick={() => setShowLogoutDialog(true)}
          variant="ghost"
          className="flex items-center justify-center w-full text-[#787878] hover:text-white"
        >
          <LogOut className="mr-2" />
          Logout
        </Button>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-[#212121] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to logout? You will need to login again to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowLogoutDialog(false)}
              className="bg-[#2b2b2b] text-white hover:bg-[#363636]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-700 hover:bg-[#5a9700]"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}