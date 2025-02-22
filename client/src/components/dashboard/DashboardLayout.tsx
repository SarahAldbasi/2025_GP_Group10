import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#171717] text-white flex">
      <div className="fixed inset-y-0 left-0">
        <Sidebar />
      </div>
      <main className="flex-1 pl-64 p-8">
        {children}
      </main>
    </div>
  );
}