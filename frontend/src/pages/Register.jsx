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
  background: "radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)",
  bottom: "-200px",
  right: "-100px",
  pointerEvents: "none",
};

const PASSWORD_HINT = {
  fontSize: "12px",
  color: "#687386",
  marginTop: "6px",
  lineHeight: 1.4,
};

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ username, email, password });
      toast.success("Account created! Welcome to CodeDraft.");
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
        <div style={TITLE_STYLE}>Create your account</div>
        <div style={SUBTITLE_STYLE}>Join the arena and start battling</div>

        <div style={FORM_CARD}>
          <form onSubmit={handleSubmit}>
            <div style={FIELD_STYLE}>
              <label htmlFor="register-username" style={LABEL_STYLE}>
                Username
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={INPUT_STYLE}
                placeholder="codebattler42"
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
                onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                onBlur={(e) => (e.target.style.borderColor = "#27313d")}
              />
            </div>
            <div style={FIELD_STYLE}>
              <label htmlFor="register-email" style={LABEL_STYLE}>
                Email
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" style={LABEL_STYLE}>
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={INPUT_STYLE}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                onFocus={(e) => (e.target.style.borderColor = "#34d399")}
                onBlur={(e) => (e.target.style.borderColor = "#27313d")}
              />
              <div style={PASSWORD_HINT}>
                Minimum 8 characters with uppercase, lowercase, and a number
              </div>
            </div>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="md"
              style={{ marginTop: "8px" }}
            >
              Create Account
            </Button>
          </form>
        </div>

        <div style={FOOTER_TEXT}>
          Already have an account?{" "}
          <Link to="/login" state={{ from: location.state?.from }} style={{ color: "#6ee7b7", fontWeight: 600 }}>
            Log in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
