import { useAuth } from "./lib/auth";
import Landing from "./pages/Landing";
import CustomerPortal from "./pages/CustomerPortal";
import AdminDashboard from "./pages/AdminDashboard";
import { Spinner } from "./components/ui";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Spinner className="w-8 h-8 text-amber-600" />
      </div>
    );
  }

  if (!user) return <Landing />;
  if (user.role === "admin") return <AdminDashboard />;
  return <CustomerPortal />;
}

export default App;
