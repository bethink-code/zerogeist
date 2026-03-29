import { Switch, Route } from "wouter";
import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";

function App() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();

  // While auth is loading OR user is authenticated → show Dashboard
  // Dashboard handles its own loading state via the DashboardHeader phases
  if (isLoading || isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        {isAdmin && <Route path="/admin" component={Admin} />}
        <Route component={Dashboard} />
      </Switch>
    );
  }

  return <Landing />;
}

export default App;
