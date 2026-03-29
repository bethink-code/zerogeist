import { Switch, Route } from "wouter";
import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/not-found";

function App() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();

  // During auth loading, show Dashboard (which handles its own splash screen)
  if (isLoading) {
    return <Dashboard />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  // Auth complete — full routing available
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      {isAdmin && <Route path="/admin" component={Admin} />}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
