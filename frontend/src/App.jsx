import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProblemEditor from "./pages/ProblemEditor";
import Lobby from "./pages/Lobby";
import BattleArena from "./pages/BattleArena";
import Leaderboard from "./pages/Leaderboard";
import PublicProfile from "./pages/PublicProfile";


const TOAST_OPTIONS = {
  duration: 4000,
  style: {
    background: "#11161d",
    color: "#f4f7fb",
    border: "1px solid #27313d",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  success: {
    iconTheme: {
      primary: "#34d399",
      secondary: "#11161d",
    },
  },
  error: {
    iconTheme: {
      primary: "#fb7185",
      secondary: "#11161d",
    },
  },
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId/edit"
            element={
              <ProtectedRoute>
                <ProblemEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomId/battle"
            element={
              <ProtectedRoute>
                <BattleArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/u/:username"
            element={
              <ProtectedRoute>
                <PublicProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
