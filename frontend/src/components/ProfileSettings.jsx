
import React, { useState, useEffect } from "react";
import API from "../api";

export default function ProfileSettings({ notificationsEnabled = true, onNotificationChange }){
  const [allow, setAllow] = useState(notificationsEnabled);
  const [msg, setMsg] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");
  // model preference removed from profile settings UI per request
  const [bio, setBio] = useState("");
  const [bioMsg, setBioMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
  // previously fetched model preference here; removed to simplify UI
        // load current bio
        try {
          const me = await API.get("/auth/me");
          if (mounted && me.data && me.data.user) setBio(me.data.user.bio || "");
        } catch (e) {
          console.debug(e);
        }
      } catch (e) {
        console.debug(e);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function toggle(){
    setMsg("");
    if (!allow) {
      const p = await Notification.requestPermission();
      if (p !== "granted") {
        setMsg("Please enable notifications in your browser (browser will prompt). ");
        return;
      }
    }
    // persist preference on server (use centralized auth endpoint)
    try {
      const res = await API.post("/auth/notifications", { enabled: !allow });
      if (res.data && res.data.success) {
        setAllow(!allow);
        if (onNotificationChange) onNotificationChange(!allow);
        setMsg("Notification preference saved!");
      } else {
        setMsg("Failed to save preference");
      }
    } catch (e) {
      console.debug(e);
      setMsg("Failed to save preference");
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target.result);
        setUploadMsg("Profile picture updated (local preview only)");
      };
      reader.readAsDataURL(file);
      // Upload to server
      const fd = new FormData();
      fd.append("avatar", file);
      (async () => {
        try {
          setUploadMsg("Uploading...");
          const res = await API.post("/auth/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
          if (res.data && res.data.avatar) {
            setAvatar((process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "") + res.data.avatar);
            setUploadMsg("Profile picture updated");
          }
        } catch (err) {
          setUploadMsg("Upload failed");
        }
      })();
    }
  }

  return (
    <div className="card border-2 border-blue-400 bg-blue-50 mb-6 p-4 rounded-xl">
      <h3 className="text-blue-500 font-bold mb-2 text-lg">🔔 Notification Preferences</h3>
      <div className="notification-row mb-2">
        <div className="notification-checkbox">
          <input id="notifCheck" type="checkbox" checked={allow} onChange={toggle} />
        </div>
        <div className="notification-text">
          <label htmlFor="notifCheck" className="font-medium">Enable browser notifications for tweets containing <b>cricket</b> or <b>science</b></label>
        </div>
      </div>
      {msg && <div className={msg.includes("saved") ? "text-green-700 mt-2 font-semibold" : "text-red-600 mt-2 font-semibold"}>{msg}</div>}
      <div className="text-sm text-gray-600 mt-2 mb-4">
        You can change this anytime. Notifications help you stay updated on trending topics!
      </div>
      <div className="mt-4">
        <h4 className="font-bold text-blue-500 mb-2">Profile Picture</h4>
        <div className="flex items-center gap-4">
          <img src={avatar || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"} alt="avatar" className="w-16 h-16 rounded-full border-2 border-blue-300" />
          <div>
            <label htmlFor="avatarInput" className="px-3 py-2 rounded-full bg-white border cursor-pointer text-sm">Choose picture</label>
            <input id="avatarInput" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
            <div className="text-xs text-gray-600 mt-1">PNG/JPG up to 5MB</div>
          </div>
        </div>
        {uploadMsg && <div className="text-green-700 mt-2 font-semibold">{uploadMsg}</div>}
      </div>
      <div className="mt-4">
        <h4 className="font-bold text-blue-500 mb-2">Bio</h4>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} className="w-full px-3 py-2 rounded-lg border" rows={3} />
        <div className="mt-2 flex gap-2">
          <button onClick={async ()=>{
            setBioMsg("");
            try {
              const res = await API.post("/auth/bio", { bio });
              if (res.data && res.data.success) setBioMsg("Saved");
            } catch (e) {
              setBioMsg("Save failed");
            }
          }} className="px-3 py-2 rounded-full bg-blue-500 text-white font-semibold">Save Bio</button>
          {bioMsg && <div className="text-sm text-green-700">{bioMsg}</div>}
        </div>
      </div>
      {/* Model preference removed from ProfileSettings per request */}
    </div>
  );
}
