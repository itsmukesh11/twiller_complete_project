


import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: "🏠", label: "Home", to: "/" },
  { icon: "🔍", label: "Explore", to: "/explore" },
  { icon: "🔔", label: "Notifications", to: "/notifications" },
  { icon: "✉️", label: "Messages", to: "/messages" },
  { icon: "👤", label: "Profile", to: "/profile" },
];

export default function Sidebar({ user, onLogout, open, onClose }) {
  const location = useLocation();
  // On small screens the Sidebar will be rendered as a slide-in drawer. When `open` is false it stays off-canvas.
  // On larger screens it behaves as a normal in-flow sidebar.
  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div className={`sidebar-backdrop ${open ? 'visible' : ''}`} onClick={onClose} />

      <aside className={`sidebar drawer ${open ? 'open' : ''}`} role="navigation" aria-label="Main sidebar">
        <div className="sidebar-left">
          <div className="brand">Twiller</div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <SidebarLink key={item.label} icon={item.icon} label={item.label} to={item.to} active={location.pathname === item.to} onClick={onClose} />
            ))}
          </nav>
        </div>
        <div className="sidebar-right">
          <div className="profile-row sidebar-profile">
            <img className="w-10 h-10 rounded-full bg-gray-200" src={user?.avatar || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"} alt="avatar" />
            <div className="profile-meta">
              <div className="font-bold text-sm">{user?.name}</div>
              <div className="text-xs text-gray-500">@{user?.email?.split("@")[0]}</div>
            </div>
          </div>
          <button onClick={() => { onLogout && onLogout(); onClose && onClose(); }} className="sidebar-link logout-button">
            <span className="link-icon">🚪</span>
            <span className="link-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ icon, label, to, active }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? "active" : ""}`}>
      <span className="link-icon">{icon}</span>
      <span className="link-label">{label}</span>
    </Link>
  );
}
