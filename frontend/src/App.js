

import React, { useEffect, useState } from "react";
import API from "./api";
import Sidebar from "./layout/Sidebar";
import RightPanel from "./layout/RightPanel";
import AuthForm from "./components/AuthForm";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotificationContext from "./notificationContext";


export default function App() {
  const [tweets, setTweets] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem("notificationsEnabled");
    return saved === null ? true : saved === "true";
  });
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  // Google OAuth: capture JWT from URL and store in localStorage

  // On mount: check for token in URL or localStorage, fetch user info
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      token = localStorage.getItem("token");
    }
    if (token && !user) {
      fetchUserFromToken(token);
    }
  }, []);

  async function fetchUserFromToken(token) {
    try {
      // Always get token from localStorage if not provided
      if (!token) {
        token = localStorage.getItem("token");
      }
      console.log("Sending token to /auth/me:", token);
      if (!token) {
        console.warn("No token found in localStorage. User not authenticated.");
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        return;
      }
      const res = await API.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error("/auth/me 401 error. Token used:", token, err);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }

  useEffect(() => {
    if (user) fetchTweets();
  }, [user]);


  async function fetchTweets() {
  const res = await API.get("/tweets");
  setTweets(res.data);
  }

  useEffect(() => {
    if (!notificationsEnabled || !("Notification" in window)) return;
    tweets.forEach(t => {
      if (!t._notified && t.text && /(cricket|science)/i.test(t.text)) {
        if (Notification.permission === "granted") {
          new Notification("New Tweet", { body: t.text });
          t._notified = true;
        }
      }
    });
  }, [tweets, notificationsEnabled]);

  function handleAuth(u) {
  setUser(u);
  localStorage.setItem("user", JSON.stringify(u));
  }

  function handleLogout() {
  setUser(null);
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  }

  if (!user) {
    return <AuthForm onAuth={handleAuth} />;
  }

  return (
    <NotificationContext.Provider value={{ enabled: notificationsEnabled, setEnabled: (v) => { setNotificationsEnabled(v); localStorage.setItem("notificationsEnabled", v ? "true" : "false"); } }}>
      <BrowserRouter>
        {/* Top navigation (Sidebar renders the top nav when mobile flag is false) */}
        <Sidebar user={user} onLogout={handleLogout} />
        {/* Central app container */}
        <div className="app">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
          <RightPanel />
        </div>
      </BrowserRouter>
    </NotificationContext.Provider>
  );
}