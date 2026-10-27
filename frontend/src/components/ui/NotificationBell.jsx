import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { notificationAPI } from "../../services/api";
import { useSocket } from "../../context/SocketContext";

const BELL_WRAP = {
  position: "relative",
  cursor: "pointer",
};

const BELL_BTN = {
  background: "none",
  border: "none",
  color: "#a8b3c3",
  cursor: "pointer",
  fontSize: "18px",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.15s",
};

const BADGE = {
  position: "absolute",
  top: "-2px",
  right: "-4px",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  backgroundColor: "#fb7185",
  color: "#fff",
  fontSize: "9px",
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid #0d1117",
};

const DROPDOWN = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "340px",
  maxHeight: "400px",
  overflowY: "auto",
  backgroundColor: "#11161d",
  border: "1px solid #27313d",
  borderRadius: "12px",
  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
  zIndex: 100,
};

const DROPDOWN_HEADER = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid #27313d",
};

const NOTIF_ITEM = (read) => ({
  padding: "12px 16px",
  borderBottom: "1px solid #27313d",
  backgroundColor: read ? "transparent" : "rgba(52,211,153,0.05)",
  cursor: "pointer",
  transition: "background 0.15s",
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
});

const NOTIF_DOT = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#34d399",
  marginTop: "6px",
  flexShrink: 0,
};

const ICON_MAP = {
  match_result: "⚔️",
  challenge_invite: "🎯",
  tournament_invite: "🏆",
  system: "🔔",
};

function NotificationBell() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationAPI.getNotifications({ limit: 15 });
        setNotifications(res.data?.notifications || res.notifications || []);
        setUnreadCount(res.data?.unreadCount ?? res.unreadCount ?? 0);
      } catch (err) {
        /* silent */
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = ({ notification }) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);

      if (notification.type === "challenge_invite") {
        toast((t) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontWeight: 700, color: "#f4f7fb" }}>🎯 {notification.title}</div>
            <div style={{ fontSize: "12px", color: "#a8b3c3" }}>{notification.message}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/room/${notification.payload?.roomId}`);
                }}
                style={{
                  background: "linear-gradient(135deg,#34d399,#6ee7b7)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Accept & Join
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  background: "transparent",
                  border: "1px solid #27313d",
                  color: "#a8b3c3",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ), { duration: 10000 });
      } else {
        toast(notification.message, {
          icon: ICON_MAP[notification.type] || "🔔",
        });
      }
    };

    socket.on("notification:new", handleNewNotif);
    return () => socket.off("notification:new", handleNewNotif);
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      /* silent */
    }
  };

  const handleClickNotif = async (notif) => {
    if (!notif.read) {
      try {
        await notificationAPI.markOneRead(notif._id);
        setNotifications((prev) => prev.map((n) => n._id === notif._id ? { ...n, read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        /* silent */
      }
    }

    if (notif.payload?.roomId) {
      if (notif.type === "challenge_invite") {
        navigate(`/room/${notif.payload.roomId}`);
      }
      setIsOpen(false);
    }
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={BELL_WRAP} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={BELL_BTN}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={BADGE}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={DROPDOWN}>
          <div style={DROPDOWN_HEADER}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f4f7fb" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#34d399",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#687386",
                fontSize: "13px",
              }}
            >
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                style={NOTIF_ITEM(notif.read)}
                onClick={() => handleClickNotif(notif)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(39,49,61,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = notif.read ? "transparent" : "rgba(52,211,153,0.05)")}
              >
                {!notif.read && <div style={NOTIF_DOT} />}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "13px" }}>{ICON_MAP[notif.type] || "🔔"}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#f4f7fb" }}>
                      {notif.title}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#a8b3c3", lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#687386",
                      marginTop: "4px",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {formatTime(notif.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
