import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/useAuth";
import { NotificationsProvider } from "@/lib/useNotifications";
import { useAuth } from "@/lib/useAuth";

// Pages
import Login from "@/components/auth/Login";
import Signup from "@/components/auth/Signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Matches from "@/pages/matches";
import Referees from "@/pages/referees";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center">Loading...</div>;
  }

  return user ? <Component /> : <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/dashboard" component={() => <PrivateRoute component={Dashboard} />} />
      <Route path="/matches" component={() => <PrivateRoute component={Matches} />} />
      <Route path="/referees" component={() => <PrivateRoute component={Referees} />} />
      <Route path="/profile" component={() => <PrivateRoute component={Profile} />} />
      <Route path="/" component={() => <PrivateRoute component={Dashboard} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster />
        </QueryClientProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}