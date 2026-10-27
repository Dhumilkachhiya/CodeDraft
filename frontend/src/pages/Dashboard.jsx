import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { userAPI, matchAPI, adminAPI, roomAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import NotificationBell from "../components/ui/NotificationBell";
import toast from "react-hot-toast";
import { Activity, DoorOpen, LogOut, Plus, Trophy, UserRound, Users } from "lucide-react";

const PAGE_STYLE = { minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#090c10", color: "#f4f7fb", fontFamily: "Inter, sans-serif" };
const NAV_STYLE = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid #27313d", backdropFilter: "blur(16px)", backgroundColor: "rgba(9, 12, 16, 0.92)", position: "relative", zIndex: 100 };
const LOGO_STYLE = { fontSize: "22px", fontWeight: 850, color: "#f4f7fb", letterSpacing: "0" };
const CONTENT_STYLE = { flex: 1, padding: "clamp(16px, 4vw, 40px)", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" };
const GREETING_STYLE = { fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 800, marginBottom: "6px", letterSpacing: "0" };
const SUBTEXT_STYLE = { fontSize: "14px", color: "#a8b3c3", marginBottom: "16px" };
const ELO_DISPLAY = { fontSize: "56px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: "#34d399", lineHeight: 1 };
const ELO_LABEL = { fontSize: "12px", color: "#687386", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "6px" };
const RANK_BADGE = { display: "inline-block", fontSize: "11px", fontWeight: 700, color: "#34d399", backgroundColor: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "6px", padding: "2px 8px", marginTop: "8px" };
const STATS_GRID = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "20px" };
const STAT_VALUE = { fontSize: "22px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" };
const STAT_LABEL_STYLE = { fontSize: "11px", color: "#687386", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" };
const EMPTY_STATE = { textAlign: "center", padding: "48px 24px", color: "#a8b3c3" };
const EMPTY_ICON = { fontSize: "40px", marginBottom: "12px" };
const EMPTY_HEADING = { fontSize: "16px", fontWeight: 600, color: "#f4f7fb", marginBottom: "6px" };
const EMPTY_DESC = { fontSize: "13px", color: "#a8b3c3", marginBottom: "20px" };
const SECTION_HEADING = { fontSize: "16px", fontWeight: 600, marginBottom: "16px", marginTop: "32px", color: "#f4f7fb", display: "flex", alignItems: "center", gap: "8px" };
const DIFF_BADGE = (d) => ({ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 7px", borderRadius: "4px", backgroundColor: d === "easy" ? "rgba(52,211,153,0.12)" : d === "medium" ? "rgba(245,158,11,0.12)" : "rgba(251,113,133,0.12)", color: d === "easy" ? "#34d399" : d === "medium" ? "#f59e0b" : "#fb7185", border: "1px solid", borderColor: d === "easy" ? "rgba(52,211,153,0.3)" : d === "medium" ? "rgba(245,158,11,0.3)" : "rgba(251,113,133,0.3)" });

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "8px", padding: "8px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}>
        <div style={{ color: "#a7f3d0", fontWeight: 700 }}>ELO: {payload[0].value}</div>
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const { user, logout, checkSession } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [profile, setProfile] = useState(null);
  const [problems, setProblems] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [battleFormat, setBattleFormat] = useState("1v1");
  const [isBlitz, setIsBlitz] = useState(false);
  const [creatorCompeting, setCreatorCompeting] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [collegeEmailInput, setCollegeEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [telemetry, setTelemetry] = useState(null);
  // Profile edit
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ college: "", degree: "", year: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  // Friends
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(null);
  const searchTimeoutRef = useRef(null);

  const [activities, setActivities] = useState([
    { id: 1, message: "Welcome to CodeDraft! Live battle activity scrolling feed active.", timestamp: new Date() }
  ]);

  const handleCreateRoom = async () => {
    try {
      const response = await roomAPI.createRoom({
        battleFormat,
        isBlitz,
        creatorCompeting,
      });
      toast.success("Battle room lobby initialized!");
      navigate(`/room/${response.data.roomId || response.roomId}`);
    } catch (err) {
      toast.error(err.message || "Failed to initialize battle room");
    }
  };

  const handleJoinRoom = async () => {
    const trimmedId = joinRoomId.trim().toUpperCase();
    if (!trimmedId) {
      toast.error("Please enter a Room ID");
      return;
    }
    try {
      // Verify room exists first
      await roomAPI.getRoomDetails(trimmedId);
      setShowJoinModal(false);
      setJoinRoomId("");
      toast.success("Joining battle lobby...");
      navigate(`/room/${trimmedId}`);
    } catch (err) {
      toast.error(err.message || "Room not found. Check the Room ID and try again.");
    }
  };

  const handleUpdateAvatar = async (avatar) => {
    try {
      await userAPI.updateAvatar(avatar);
      await checkSession();
      toast.success("Avatar updated successfully!");
      setShowAvatarModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to update avatar");
    }
  };

  const handleVerifyCollege = async () => {
    try {
      if (!collegeEmailInput || !collegeEmailInput.includes("@")) {
        return toast.error("Please enter a valid email address");
      }
      await userAPI.verifyCollege(collegeEmailInput);
      await checkSession();
      toast.success("College standing successfully verified!");
      setShowVerifyModal(false);
    } catch (err) {
      toast.error(err.message || "Verification failed");
    }
  };

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const [frRes, reqRes] = await Promise.allSettled([
        userAPI.getFriends(),
        userAPI.getFriendRequests(),
      ]);
      if (frRes.status === "fulfilled") setFriends(frRes.value.data?.friends || []);
      if (reqRes.status === "fulfilled") setFriendRequests(reqRes.value.data?.requests || []);
    } catch (err) { /* silent */ } finally { setFriendsLoading(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await userAPI.updateProfile(profileForm);
      const res = await userAPI.getProfile();
      setProfile(res.data || res);
      setShowProfileModal(false);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally { setSavingProfile(false); }
  };

  const handleSearchUsers = (q) => {
    setUserSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await userAPI.searchUsers(q);
        setSearchResults(res.data?.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const handleSendRequest = async (username) => {
    try {
      await userAPI.sendFriendRequest(username);
      toast.success(`Friend request sent to ${username}!`);
      setSearchResults(prev => prev.filter(u => u.username !== username));
    } catch (err) { toast.error(err.message || "Failed to send request"); }
  };

  const handleAcceptRequest = async (username) => {
    try {
      await userAPI.acceptFriendRequest(username);
      toast.success(`Now friends with ${username}!`);
      await loadFriends();
    } catch (err) { toast.error(err.message || "Failed to accept"); }
  };

  const handleRejectRequest = async (username) => {
    try {
      await userAPI.rejectFriendRequest(username);
      toast.success("Request rejected.");
      setFriendRequests(prev => prev.filter(r => r.from?.username !== username));
    } catch (err) { toast.error(err.message || "Failed to reject"); }
  };

  const handleRemoveFriend = async (username) => {
    try {
      await userAPI.removeFriend(username);
      toast.success(`Removed ${username} from friends.`);
      setFriends(prev => prev.filter(f => f.username !== username));
    } catch (err) { toast.error(err.message || "Failed to remove"); }
  };

  const handleInviteToBattle = async (username) => {
    setInvitingFriend(username);
    try {
      const res = await userAPI.inviteFriendToBattle(username, { battleFormat: "1v1" });
      const roomId = res.data?.roomId || res.roomId;
      toast.success(`Battle invite sent to ${username}!`);
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.message || "Failed to send invite");
    } finally { setInvitingFriend(null); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, probRes, histRes, telRes] = await Promise.allSettled([
          userAPI.getProfile(),
          userAPI.getProblemsCreated(),
          matchAPI.getMyMatchHistory(),
          adminAPI.getTelemetry(),
        ]);
        if (profileRes.status === "fulfilled") {
          const p = profileRes.value.data || profileRes.value;
          setProfile(p);
          setProfileForm({ college: p.college || "", degree: p.degree || "", year: p.year || "", bio: p.bio || "" });
        }
        if (probRes.status === "fulfilled") setProblems(probRes.value.data?.problems || []);
        if (histRes.status === "fulfilled") setMatchHistory(histRes.value.data?.history || histRes.value?.history || []);
        if (telRes.status === "fulfilled") setTelemetry(telRes.value.data || telRes.value);
      } catch (err) {
        toast.error("Failed to load dashboard data");
      }
    };
    load();
    loadFriends();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("global:activity", (act) => {
      setActivities((prev) => [
        { ...act, id: Date.now() },
        ...prev.slice(0, 9),
      ]);
    });
    return () => {
      socket.off("global:activity");
    };
  }, [socket]);


  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const displayUser = profile || user;
  const eloHistory = profile?.eloHistory || [];
  const chartData = eloHistory.map((h, i) => ({ match: i + 1, elo: h.eloRating }));
  const globalRank = profile?.globalRank || null;
  const winPct = displayUser?.matchesPlayed > 0 ? Math.round(((displayUser.wins || 0) / displayUser.matchesPlayed) * 100) : 0;

  return (
    <div style={PAGE_STYLE}>
      <nav className="responsive-nav-bar">
        <Link to="/" style={{ textDecoration: "none" }}>
          <span className="brand-mark" style={LOGO_STYLE}>CodeDraft</span>
        </Link>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <Link to="/leaderboard" style={{ textDecoration: "none", color: "#a8b3c3", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: 7 }}><Trophy size={15} /> Leaderboard</Link>
          <NotificationBell />
          <span style={{ color: "#27313d" }}>|</span>
          <span style={{ color: "#a8b3c3", fontSize: "14px" }} className="hide-mobile">{displayUser?.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut size={15} /> Log Out</Button>
        </div>
      </nav>

      <div style={{ backgroundColor: "#0d1117", borderBottom: "1px solid #27313d", padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#34d399", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", borderRight: "1px solid #27313d", paddingRight: "12px", whiteSpace: "nowrap" }}>
          <span className="status-dot" /> Live Feed
        </span>
        <div style={{ display: "flex", gap: "32px", overflowX: "auto", fontSize: "12px", color: "#a8b3c3", fontFamily: "JetBrains Mono, monospace" }}>
          {activities.map((act) => (
            <span key={act.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <span style={{ color: "#34d399" }}>✦</span>
              {act.message}
            </span>
          ))}
        </div>
      </div>

      <motion.div style={CONTENT_STYLE} variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", width: "100%", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={GREETING_STYLE}>Welcome back, {displayUser?.username || "Challenger"}</div>
            <div style={SUBTEXT_STYLE}>Track your performance, review matches, and challenge opponents.</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Button onClick={() => setShowJoinModal(true)} variant="secondary" style={{ padding: "12px 20px" }}><DoorOpen size={17} /> Join Room</Button>
            <Button onClick={() => setShowCreateModal(true)} variant="primary" style={{ padding: "12px 20px" }}><Plus size={17} /> Create Battle</Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ display: "flex", gap: "12px", borderBottom: "1px solid #27313d", paddingBottom: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
            { id: "dashboard", label: "My Dashboard", color: "#34d399", icon: UserRound },
            { id: "friends", label: `Friends${friendRequests.length > 0 ? ` (${friendRequests.length})` : ""}`, color: "#38bdf8", icon: Users },
            { id: "telemetry", label: "System Telemetry", color: "#f59e0b", icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px", borderRadius: "8px",
                backgroundColor: activeTab === tab.id ? `${tab.color}22` : "transparent",
                border: activeTab === tab.id ? `1px solid ${tab.color}` : "1px solid transparent",
                color: activeTab === tab.id ? tab.color : "#a8b3c3",
                fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontSize: "14px",
              }}
            >
              <tab.icon size={15} style={{ display: "inline", verticalAlign: "-2px", marginRight: 7 }} />{tab.label}
            </button>
          ))}
        </motion.div>

        {activeTab === "dashboard" ? (
          <>
            <motion.div className="dashboard-layout-grid" variants={itemVariants}>
              <Card style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px", borderBottom: "1px solid #27313d", paddingBottom: "12px" }}>
                  <div 
                    onClick={() => setShowAvatarModal(true)}
                    style={{ 
                      width: "60px", 
                      height: "60px", 
                      borderRadius: "50%", 
                      backgroundColor: "rgba(52,211,153,0.12)",
                      border: "2px solid rgba(52,211,153,0.4)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: "30px", 
                      cursor: "pointer", 
                      transition: "all 0.2s" 
                    }}
                    title="Change Avatar"
                  >
                    {displayUser?.avatar || "💻"}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#f4f7fb" }}>{displayUser?.username}</div>
                    <div 
                      onClick={() => setShowAvatarModal(true)} 
                      style={{ fontSize: "11px", color: "#34d399", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Edit Avatar
                    </div>
                    {displayUser?.collegeVerified ? (
                      <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 600, marginTop: "4px" }}>
                        🎓 {displayUser.college} (Verified)
                      </div>
                    ) : (
                      <div 
                        onClick={() => setShowVerifyModal(true)} 
                        style={{ fontSize: "10px", color: "#f59e0b", cursor: "pointer", textDecoration: "underline", marginTop: "4px", fontWeight: 600 }}
                      >
                        🎓 Verify College
                      </div>
                    )}
                  </div>
                </div>
                <div style={ELO_DISPLAY}>{displayUser?.eloRating || 1000}</div>
                <div style={ELO_LABEL}>ELO Rating</div>
                {globalRank && <div style={RANK_BADGE}>Global Rank #{globalRank}</div>}
                <div style={STATS_GRID}>
                  <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#34d399" }}>{displayUser?.wins || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Wins</div>
                  </div>
                  <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#fb7185" }}>{displayUser?.losses || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Losses</div>
                  </div>
                  <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ ...STAT_VALUE, color: "#f59e0b" }}>{displayUser?.draws || 0}</div>
                    <div style={STAT_LABEL_STYLE}>Draws</div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#0d1117", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#687386" }}>Win Rate</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "14px", fontWeight: 700, color: winPct >= 50 ? "#34d399" : "#fb7185" }}>{winPct}%</span>
                </div>

                <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#0d1117", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {profile?.degree && <div style={{ fontSize: "12px", color: "#a8b3c3" }}>🎓 {profile.degree}{profile?.year ? ` · ${profile.year} Year` : ""}</div>}
                  {profile?.college && !displayUser?.collegeVerified && <div style={{ fontSize: "12px", color: "#a8b3c3" }}>🏛 {profile.college}</div>}
                  {profile?.bio && <div style={{ fontSize: "12px", color: "#a8b3c3", fontStyle: "italic", lineHeight: 1.4 }}>"{profile.bio}"</div>}
                  <button
                    onClick={() => {
                      setProfileForm({ college: profile?.college || "", degree: profile?.degree || "", year: profile?.year || "", bio: profile?.bio || "" });
                      setShowProfileModal(true);
                    }}
                    style={{ marginTop: "4px", fontSize: "11px", color: "#34d399", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, textDecoration: "underline", fontWeight: 600 }}
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
              </Card>
    
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#f4f7fb" }}>ELO History</span>
                  <span style={{ fontSize: "11px", color: "#687386", fontFamily: "JetBrains Mono, monospace" }}>Last {chartData.length} matches</span>
                </div>
                {chartData.length === 0 ? (
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>📊</div>
                    <div style={EMPTY_HEADING}>No matches yet</div>
                    <div style={EMPTY_DESC}>Complete your first battle to see your ELO chart appear here.</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27313d" />
                      <XAxis dataKey="match" tick={{ fill: "#687386", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#687386", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="elo" stroke="#34d399" strokeWidth={2} fill="url(#eloGradient)" dot={{ fill: "#34d399", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#a7f3d0" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </motion.div>
    
            <motion.div variants={itemVariants}>
              <div style={SECTION_HEADING}>
                <span>✍️</span> Problems Created
              </div>
              {problems.length === 0 ? (
                <Card>
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>✍️</div>
                    <div style={EMPTY_HEADING}>No problems created</div>
                    <div style={EMPTY_DESC}>Create a room to write your first battle problem and challenge opponents.</div>
                    <Button size="md" onClick={() => setShowCreateModal(true)}>Create a Room</Button>
                  </div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
                  {problems.map((prob) => (
                    <Card key={prob.roomId} style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#f4f7fb", lineHeight: 1.3 }}>{prob.title}</span>
                        <span style={DIFF_BADGE(prob.difficulty)}>{prob.difficulty}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#687386", fontFamily: "JetBrains Mono, monospace" }}>
                        {prob.allowedLanguages?.join(", ")}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#687386" }}>Battles:</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#f4f7fb" }}>{prob.battlesPlayed}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
    
            <motion.div variants={itemVariants}>
              <div style={SECTION_HEADING}>
                <span>⚔️</span> Match History
              </div>
              {matchHistory.length === 0 ? (
                <Card>
                  <div style={EMPTY_STATE}>
                    <div style={EMPTY_ICON}>⚔️</div>
                    <div style={EMPTY_HEADING}>No matches yet</div>
                    <div style={EMPTY_DESC}>You haven&apos;t battled yet. Create a room to start your journey.</div>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #27313d", backgroundColor: "rgba(39,49,61,0.4)" }}>
                          {["Opponent", "Result", "Problem", "Time", "ELO Δ"].map((h) => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#687386", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((match, i) => {
                          const resultColor = match.result === "win" ? "#34d399" : match.result === "loss" ? "#fb7185" : "#f59e0b";
                          const resultBg = match.result === "win" ? "rgba(52,211,153,0.1)" : match.result === "loss" ? "rgba(251,113,133,0.1)" : "rgba(245,158,11,0.1)";
                          const eloDelta = match.eloChange;
                          const min = match.durationSec ? Math.floor(match.durationSec / 60) : 0;
                          const sec = match.durationSec ? match.durationSec % 60 : 0;
                          return (
                            <tr key={match.roomId || i} style={{ borderBottom: "1px solid #27313d" }}>
                              <td style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#a7f3d0" }}>
                                    {match.opponent?.avatar || match.opponent?.username?.slice(0, 2).toUpperCase() || "??"}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: "#f4f7fb" }}>{match.opponent?.username || "Unknown"}</div>
                                    <div style={{ fontSize: "11px", color: "#687386", fontFamily: "JetBrains Mono, monospace" }}>ELO {match.opponent?.eloRating || "—"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "14px 20px" }}>
                                <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "4px", color: resultColor, backgroundColor: resultBg }}>
                                  {match.result}
                                </span>
                              </td>
                              <td style={{ padding: "14px 20px", color: "#a8b3c3", maxWidth: "160px" }}>
                                {match.problemTitle || "—"}
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#a8b3c3" }}>
                                {match.durationSec ? `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : "—"}
                              </td>
                              <td style={{ padding: "14px 20px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: eloDelta == null ? "#687386" : eloDelta >= 0 ? "#34d399" : "#fb7185" }}>
                                {eloDelta == null ? "—" : eloDelta >= 0 ? `+${eloDelta}` : eloDelta}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </motion.div>
    

          </>
        ) : activeTab === "friends" ? (
          <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Add Friends Search */}
            <Card style={{ padding: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f4f7fb", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                🔍 Find & Add Friends
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearch}
                  onChange={e => handleSearchUsers(e.target.value)}
                  style={{ width: "100%", padding: "10px 16px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "10px", color: "#f4f7fb", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {searchLoading && <div style={{ fontSize: "12px", color: "#687386", marginTop: "8px" }}>Searching...</div>}
              {searchResults.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {searchResults.map(u => (
                    <div key={u._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#a7f3d0" }}>{u.avatar || u.username.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#f4f7fb", fontSize: "14px" }}>{u.username}</div>
                          <div style={{ fontSize: "11px", color: "#687386" }}>{u.college || "Independent"} · ELO {u.eloRating}</div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleSendRequest(u.username)}>+ Add Friend</Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Pending Friend Requests */}
            {friendRequests.length > 0 && (
              <Card style={{ padding: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#f59e0b", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  📩 Pending Requests <span style={{ fontSize: "11px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", padding: "1px 8px", borderRadius: "999px" }}>{friendRequests.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {friendRequests.map((req, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#f59e0b" }}>{req.from?.avatar || req.from?.username?.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#f4f7fb" }}>{req.from?.username}</div>
                          <div style={{ fontSize: "11px", color: "#687386" }}>{req.from?.college || "Independent"} · ELO {req.from?.eloRating}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button size="sm" onClick={() => handleAcceptRequest(req.from?.username)} style={{ background: "linear-gradient(135deg,#34d399,#4a9e72)", color: "#fff", border: "none" }}>✓ Accept</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRejectRequest(req.from?.username)}>✗ Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Friends List */}
            <Card style={{ padding: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f4f7fb", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                👥 My Friends <span style={{ fontSize: "11px", color: "#687386" }}>({friends.length})</span>
              </div>
              {friendsLoading ? (
                <div style={{ color: "#687386", fontSize: "13px" }}>Loading friends...</div>
              ) : friends.length === 0 ? (
                <div style={EMPTY_STATE}>
                  <div style={EMPTY_ICON}>🤝</div>
                  <div style={EMPTY_HEADING}>No friends yet</div>
                  <div style={EMPTY_DESC}>Search for users above and send a friend request to get started!</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                  {friends.map(f => (
                    <div key={f._id} style={{ padding: "16px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(52,211,153,0.12)", border: "2px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, color: "#a7f3d0" }}>{f.avatar || f.username?.slice(0, 2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#f4f7fb", fontSize: "14px" }}>{f.username}</div>
                          <div style={{ fontSize: "11px", color: "#687386", fontFamily: "JetBrains Mono, monospace" }}>ELO {f.eloRating} {f.degree && `· ${f.degree}`}</div>
                          {f.college && <div style={{ fontSize: "11px", color: "#a8b3c3", marginTop: "2px" }}>🏛 {f.college}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          size="sm"
                          style={{ flex: 1, background: "linear-gradient(135deg,#34d399,#6ee7b7)", color: "#fff", border: "none", fontWeight: 700 }}
                          onClick={() => handleInviteToBattle(f.username)}
                          disabled={invitingFriend === f.username}
                        >
                          {invitingFriend === f.username ? "Sending..." : "⚔️ Invite to Battle"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveFriend(f.username)} style={{ color: "#fb7185" }}>✕</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            <div className="telemetry-layout-grid">
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #27313d", borderRadius: "12px", background: "linear-gradient(135deg, #11161d, rgba(52,211,153,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Total Registered Combatants</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #a7f3d0, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.totalUsers ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#687386" }}>Registered users in database</span>
              </Card>
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #27313d", borderRadius: "12px", background: "linear-gradient(135deg, #11161d, rgba(245,158,11,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Total Battles Completed</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #a7f3d0, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.totalRooms ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#687386" }}>Historical battle instances</span>
              </Card>
              <Card style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", border: "1px solid #27313d", borderRadius: "12px", background: "linear-gradient(135deg, #11161d, rgba(52,211,153,0.05))" }}>
                <span style={{ fontSize: "11px", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Active WebSocket Duels</span>
                <span style={{ fontSize: "40px", fontWeight: 800, fontFamily: "JetBrains Mono, monospace", background: "linear-gradient(135deg, #dce4ee, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {telemetry?.activeRoomsCount ?? "—"}
                </span>
                <span style={{ fontSize: "12px", color: "#687386" }}>Rooms with status &quot;active&quot;</span>
              </Card>
            </div>

            <div className="telemetry-two-col-grid">
              <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f4f7fb", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>💾</span> Sandbox & Node Memory Usage
                </div>
                
                {telemetry?.memory ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a8b3c3" }}>
                      <span>V8 Heap Used</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {telemetry.memory.heapUsed} MB / {telemetry.memory.heapTotal} MB
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#0d1117", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, Math.round((telemetry.memory.heapUsed / telemetry.memory.heapTotal) * 100))}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, #34d399, #6ee7b7)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease-in-out" 
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#687386", fontSize: "13px" }}>Memory stats loading...</div>
                )}

                {telemetry?.memory ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#a8b3c3" }}>
                      <span>System Memory Usage</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {telemetry.memory.totalSystem - telemetry.memory.freeSystem} MB / {telemetry.memory.totalSystem} MB
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#0d1117", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, Math.round(((telemetry.memory.totalSystem - telemetry.memory.freeSystem) / telemetry.memory.totalSystem) * 100))}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, #f59e0b, #34d399)",
                          borderRadius: "4px",
                          transition: "width 0.5s ease-in-out" 
                        }} 
                      />
                    </div>
                  </div>
                ) : null}

                {telemetry?.memory ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#0d1117", borderRadius: "8px", fontSize: "12px", border: "1px solid #27313d" }}>
                    <span style={{ color: "#687386" }}>Process Resident Set Size (RSS)</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#f4f7fb" }}>{telemetry.memory.rss} MB</span>
                  </div>
                ) : null}
              </Card>

              <Card style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#f4f7fb", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚙️</span> Sandbox CPU & Load Averages
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#687386" }}>CPU Model</span>
                    <span style={{ color: "#f4f7fb", fontWeight: 600, textAlign: "right", maxWidth: "220px", fontSize: "11px" }}>{telemetry?.cpu?.model ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#687386" }}>Processing Cores</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#f4f7fb" }}>{telemetry?.cpu?.cores ?? "—"} Cores</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #27313d", paddingTop: "12px", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#687386", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>OS Load Averages (1m / 5m / 15m)</span>
                  {telemetry?.cpu?.loadAvg ? (
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      {telemetry.cpu.loadAvg.map((load, i) => (
                        <div key={i} style={{ flex: 1, backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: load > 2 ? "#fb7185" : "#34d399" }}>{load.toFixed(2)}</div>
                          <div style={{ fontSize: "9px", color: "#687386", textTransform: "uppercase", marginTop: "2px" }}>{i === 0 ? "1 min" : i === 1 ? "5 min" : "15 min"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#687386", fontSize: "12px" }}>Load averages not available</div>
                  )}
                </div>
              </Card>
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #27313d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#f4f7fb", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✍️</span> Rapid Problem Creators Audit
                </span>
                <span style={{ fontSize: "11px", color: "#687386", fontFamily: "JetBrains Mono, monospace" }}>Database aggregates</span>
              </div>
              
              {!telemetry?.creatorsAudit || telemetry.creatorsAudit.length === 0 ? (
                <div style={{ ...EMPTY_STATE, padding: "40px" }}>
                  <div style={EMPTY_ICON}>📭</div>
                  <div style={EMPTY_HEADING}>No problem creators found</div>
                  <div style={EMPTY_DESC}>User-generated battles will aggregate here.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #27313d", backgroundColor: "rgba(39,49,61,0.4)" }}>
                        {["Rank", "Creator", "College / Institution", "Battles Written", "ELO Rating"].map((h) => (
                          <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#687386", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry.creatorsAudit.map((creator, i) => (
                        <tr 
                          key={creator._id || i} 
                          style={{ borderBottom: "1px solid #27313d" }}
                        >
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: i === 0 ? "#f59e0b" : i === 1 ? "#a7f3d0" : i === 2 ? "#b45309" : "#687386" }}>
                            #{i + 1}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                                👤
                              </div>
                              <span style={{ fontWeight: 600, color: "#f4f7fb" }}>{creator.username || "Anonymous"}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", color: creator.college ? "#34d399" : "#687386", fontWeight: creator.college ? 600 : 400 }}>
                            {creator.college ? `🎓 ${creator.college}` : "Independent"}
                          </td>
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#a7f3d0" }}>
                            {creator.problemsCount} Problems
                          </td>
                          <td style={{ padding: "14px 24px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, color: "#f59e0b" }}>
                            {creator.eloRating}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}

      </motion.div>

      {showAvatarModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,3,12,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center", padding: "16px" }}>
          <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "16px", padding: "clamp(20px, 4vw, 32px)", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#f4f7fb" }}>Select Gaming Avatar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
              {["💻", "🔥", "⚡", "🏆", "💀", "👾", "🤖", "🐼"].map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => handleUpdateAvatar(avatar)}
                  style={{
                    fontSize: "32px",
                    padding: "10px",
                    borderRadius: "12px",
                    backgroundColor: displayUser?.avatar === avatar ? "rgba(52,211,153,0.2)" : "#0d1117",
                    border: displayUser?.avatar === avatar ? "2px solid #34d399" : "1px solid #27313d",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  className="hover:scale-110 active:scale-95"
                >
                  {avatar}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowAvatarModal(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,3,12,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center", padding: "16px" }}>
          <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "16px", padding: "clamp(20px, 4vw, 32px)", maxWidth: "420px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎮</div>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f4f7fb", marginBottom: "6px" }}>Join Battle Room</h3>
              <p style={{ fontSize: "13px", color: "#687386" }}>Enter the Room ID shared by your opponent to enter their battle lobby.</p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "11px", color: "#687386", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.08em", display: "block", marginBottom: "8px" }}>Room ID</label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                placeholder="e.g. NKJAYE"
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  backgroundColor: "#0d1117",
                  border: "1px solid #27313d",
                  color: "#f4f7fb",
                  fontSize: "18px",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 700,
                  textAlign: "center",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "#34d399"}
                onBlur={(e) => e.target.style.borderColor = "#27313d"}
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setShowJoinModal(false); setJoinRoomId(""); }}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleJoinRoom}>Join Lobby</Button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,3,12,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center", padding: "16px" }}>
          <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "16px", padding: "24px", maxWidth: "420px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#f4f7fb", textAlign: "center" }}>Create Coding Battle</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#687386", textTransform: "uppercase", fontWeight: 600 }}>Battle Format</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setBattleFormat("1v1")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: battleFormat === "1v1" ? "rgba(52,211,153,0.15)" : "#0d1117",
                      border: battleFormat === "1v1" ? "1px solid #34d399" : "1px solid #27313d",
                      color: battleFormat === "1v1" ? "#a7f3d0" : "#a8b3c3",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    1v1 Duel
                  </button>
                  <button
                    onClick={() => setBattleFormat("2v2")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: battleFormat === "2v2" ? "rgba(52,211,153,0.15)" : "#0d1117",
                      border: battleFormat === "2v2" ? "1px solid #34d399" : "1px solid #27313d",
                      color: battleFormat === "2v2" ? "#a7f3d0" : "#a8b3c3",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    2v2 Team Battle
                  </button>
                </div>
              </div>

            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleCreateRoom}>Initialize Lobby</Button>
            </div>
          </div>
        </div>
      )}
      {showVerifyModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,3,12,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", zIndex: 100, justifyContent: "center" }}>
          <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "#f4f7fb" }}>🎓 Verify College Standing</h3>
            <p style={{ fontSize: "12px", color: "#687386", marginBottom: "20px" }}>
              Enter your university domain email (ending in <b>.edu</b> or <b>.ac.in</b>) to verify your academic league standing.
            </p>
            <input
              type="email"
              value={collegeEmailInput}
              onChange={(e) => setCollegeEmailInput(e.target.value)}
              placeholder="e.g. coder@mit.edu"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#0d1117",
                border: "1px solid #27313d",
                color: "#f4f7fb",
                fontSize: "13px",
                marginBottom: "20px",
                textAlign: "center"
              }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowVerifyModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleVerifyCollege}>Verify Suffix</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ── */}
      {showProfileModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(5,3,12,0.92)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ backgroundColor: "#11161d", border: "1px solid #27313d", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#f4f7fb" }}>Edit Profile</div>
                <div style={{ fontSize: "12px", color: "#687386", marginTop: "4px" }}>Update your academic info and bio</div>
              </div>
              <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", color: "#687386", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#a8b3c3", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>🏛 College / University</label>
                <input
                  type="text"
                  placeholder="e.g. IIT Bombay, MIT, Stanford..."
                  value={profileForm.college}
                  onChange={e => setProfileForm(p => ({ ...p, college: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "10px", color: "#f4f7fb", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a8b3c3", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>📚 Degree</label>
                  <select
                    value={profileForm.degree}
                    onChange={e => setProfileForm(p => ({ ...p, degree: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "10px", color: profileForm.degree ? "#f4f7fb" : "#687386", fontSize: "14px", outline: "none", appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">Select degree</option>
                    <option>B.Tech</option>
                    <option>B.Sc</option>
                    <option>B.E.</option>
                    <option>BCA</option>
                    <option>MCA</option>
                    <option>M.Tech</option>
                    <option>M.Sc</option>
                    <option>MBA</option>
                    <option>Ph.D</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#a8b3c3", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>📅 Year</label>
                  <select
                    value={profileForm.year}
                    onChange={e => setProfileForm(p => ({ ...p, year: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "10px", color: profileForm.year ? "#f4f7fb" : "#687386", fontSize: "14px", outline: "none", appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">Select year</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>5th Year</option>
                    <option>Alumni</option>
                    <option>Working Professional</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#a8b3c3", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>📝 Bio <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>({profileForm.bio.length}/200)</span></label>
                <textarea
                  placeholder="A short intro about yourself..."
                  value={profileForm.bio}
                  onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value.slice(0, 200) }))}
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "#0d1117", border: "1px solid #27313d", borderRadius: "10px", color: "#f4f7fb", fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowProfileModal(false)}>Cancel</Button>
              <Button variant="primary" style={{ flex: 2 }} onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "💾 Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
