import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, setStoredToken, clearStoredToken } from "../services/api";

const AuthContext = createContext(null);

const AUTH_STATES = {
  LOADING: "loading",
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);

  const checkSession = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.user);
      if (response.data.token) {
        setStoredToken(response.data.token);
      }
      setAuthState(AUTH_STATES.AUTHENTICATED);
    } catch {
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      clearStoredToken();
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    if (response.data.token) {
      setStoredToken(response.data.token);
    }
    setUser(response.data.user);
    setAuthState(AUTH_STATES.AUTHENTICATED);
    return response;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    if (response.data.token) {
      setStoredToken(response.data.token);
    }
    setUser(response.data.user);
    setAuthState(AUTH_STATES.AUTHENTICATED);
    return response;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn("Logout request failed, clearing session locally:", err);
    } finally {
      clearStoredToken();
      setUser(null);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
    }
  };

  const value = {
    user,
    authState,
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,
    isLoading: authState === AUTH_STATES.LOADING,
    login,
    register,
    logout,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
