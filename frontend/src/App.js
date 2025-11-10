

import React, { useEffect, useState, useCallback } from "react";
import API from "./api";
import Sidebar from "./layout/Sidebar";
import RightPanel from "./layout/RightPanel";
import AuthForm from "./components/AuthForm";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotificationContext from "./notificationContext";


function AppContent({ user, handleLogout, notificationsEnabled, setNotificationsEnabled }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location]);

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-30 md:hidden">
        <div className="h-full px-4 flex items-center justify-between">
          <button
            onClick={toggleDrawer}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="text-xl font-bold text-blue-600">Twiller</div>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex min-h-screen pt-16 md:pt-0">
        {/* Sidebar - acts as drawer on mobile */}
        <Sidebar 
          user={user} 
          onLogout={handleLogout}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 w-full max-w-[600px] mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        {/* Right Panel - hidden on mobile */}
        <aside className="hidden md:block w-[320px] shrink-0">
          <div className="sticky top-4 p-4">
            <RightPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}

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
          <AppContent 
            user={user}
            handleLogout={handleLogout}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
          />
      </BrowserRouter>
    </NotificationContext.Provider>
  );
}