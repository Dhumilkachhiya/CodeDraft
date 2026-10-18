import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";

const PAGE_STYLE = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  position: "relative",
  overflow: "hidden",
};

const FORM_CONTAINER = {
  width: "100%",
  maxWidth: "420px",
  zIndex: 1,
};

const LOGO_STYLE = {
  fontSize: "28px",
  fontWeight: 800,
  background: "linear-gradient(135deg, #6ee7b7, #f59e0b)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textAlign: "center",
  marginBottom: "8px",
};

const TITLE_STYLE = {
  fontSize: "24px",
  fontWeight: 700,
  textAlign: "center",
  marginBottom: "4px",
  color: "#f4f7fb",
};

const SUBTITLE_STYLE = {
  fontSize: "14px",
  color: "#a8b3c3",
  textAlign: "center",
  marginBottom: "32px",
};

const FORM_CARD = {
  backgroundColor: "#11161d",
  border: "1px solid #27313d",
  borderRadius: "16px",
  padding: "32px",
};

const FIELD_STYLE = {
  marginBottom: "20px",
};

const LABEL_STYLE = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#a8b3c3",
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const INPUT_STYLE = {
  width: "100%",
  padding: "12px 16px",
  backgroundColor: "#0d1117",
  border: "1px solid #27313d",
  borderRadius: "8px",
  color: "#f4f7fb",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const FOOTER_TEXT = {
  textAlign: "center",
  marginTop: "24px",
  fontSize: "14px",
  color: "#a8b3c3",
};

const GLOW = {
  position: "absolute",
  width: "500px",
  height: "500px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 70%)",
  top: "-200px",
  left: "-100px",
  pointerEvents: "none",
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={PAGE_STYLE}>
      <div style={GLOW} />
      <motion.div
        style={FORM_CONTAINER}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={LOGO_STYLE}>CodeDraft</div>
        </Link>
        <div style={TITLE_STYLE}>Welcome back</div>
        <div style={SUBTITLE_STYLE}>Log in to continue battling</div>

        <div style={FORM_CARD}>
          <form onSubmit={handleSubmit}>
            <div style={FIELD_STYLE}>
              <label htmlFor="login-email" style={LABEL_STYLE}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={INPUT_STYLE}
                placeholder="you@example.com"
                required
                autoComplete="email"
                onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                onBlur={(e) => (e.target.style.borderColor = "#27313d")}
              />
            </div>
            <div style={FIELD_STYLE}>
              <label htmlFor="login-password" style={LABEL_STYLE}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={INPUT_STYLE}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                onBlur={(e) => (e.target.style.borderColor = "#27313d")}
              />
            </div>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="md"
              style={{ marginTop: "8px" }}
            >
              Log In
            </Button>
          </form>
        </div>

        <div style={FOOTER_TEXT}>
          Don&apos;t have an account?{" "}
          <Link to="/register" state={{ from: location.state?.from }} style={{ color: "#6ee7b7", fontWeight: 600 }}>
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
