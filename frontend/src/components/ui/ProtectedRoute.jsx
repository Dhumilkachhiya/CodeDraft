import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const SPINNER_STYLES = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1117",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #27313d",
    borderTop: "3px solid #34d399",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={SPINNER_STYLES.container}>
        <div style={SPINNER_STYLES.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
