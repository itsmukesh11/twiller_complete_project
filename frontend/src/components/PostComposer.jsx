import React, { useRef, useState, useEffect, useContext } from "react";
import API from "../api";
import NotificationContext from "../notificationContext";

function highlightCaption(text) {
  // Highlight hashtags and @mentions in blue
  const regex = /([#@][\w]+)/g;
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} className="text-blue-500 font-semibold">{part}</span>
      : part
  );
}

export default function PostComposer({ onPosted }) {
  const { enabled: notificationsEnabled } = useContext(NotificationContext);
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]); // Array of File
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [user, setUser] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [quotaInfo, setQuotaInfo] = useState({ allowed: 1, remaining: 1, reason: "" });

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/auth/me");
        const u = res.data.user;
        setUser(u);
        // fetch tweets and compute today's count
        const tweetsRes = await API.get("/tweets");
        const all = tweetsRes.data || [];
        const myId = u?._id;
        const today = new Date();
        const istToday = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const start = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 0, 0, 0);
        const end = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 23, 59, 59);
        const used = all.filter(t => t.user?._id === myId && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end).length;
        setTodayCount(used);

        // compute allowed posts by subscription
        const plan = u?.subscription?.plan || "free";
        const planMap = { free: 1, bronze: 3, silver: 5, gold: Infinity };
        let allowedByPlan = planMap[plan] ?? 1;

        // follow-based allowances
        const follows = (u?.follows || []).length;
        let allowedByFollows = 0;
        if (follows === 0) {
          allowedByFollows = 1; // limited to 1 but time-window enforced on post
        } else if (follows === 2) {
          allowedByFollows = 2;
        } else if (follows > 10) {
          allowedByFollows = Infinity;
        }

        const allowed = allowedByFollows === 0 ? allowedByPlan : Math.max(allowedByPlan, allowedByFollows);
        const remaining = allowed === Infinity ? Infinity : Math.max(0, allowed - used);
        setQuotaInfo({ allowed, remaining, reason: "" });
      } catch (e) {
        // ignore
      }
    }
    load();
  }, []);

  function handleUploadClick() {
    fileInputRef.current.click();
  }

  function handleFileChange(e) {
    let files = Array.from(e.target.files);
    validateAndSetFiles(files);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    let files = Array.from(e.dataTransfer.files);
    validateAndSetFiles(files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function validateAndSetFiles(files) {
    setError("");
    let images = files.filter(f => f.type.startsWith("image"));
    let videos = files.filter(f => f.type.startsWith("video"));
    if (videos.length > 1 || (videos.length && images.length)) {
      setError("You can upload up to 4 images or 1 video only.");
      return;
    }
    if (images.length > 4) {
      setError("Maximum 4 images allowed.");
      return;
    }
    for (let img of images) {
      if (img.size > 5 * 1024 * 1024) {
        setError("Each image must be ≤ 5MB.");
        return;
      }
    }
    for (let vid of videos) {
      if (vid.size > 100 * 1024 * 1024) {
        setError("Video must be ≤ 100MB.");
        return;
      }
    }
    setMediaFiles([...images, ...videos]);
  }

  function removeMedia(idx) {
    setMediaFiles(mediaFiles.filter((_, i) => i !== idx));
  }

  function handleCaptionChange(e) {
    setCaption(e.target.value);
  }

  async function post() {
    setLoading(true);
    setError("");
    // Check quota and time window for 0-followers
    try {
      const now = new Date();
      const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hour = istNow.getHours();
      const follows = (user?.follows || []).length;
      if (follows === 0) {
          // only 10:00 - 10:30 allowed
          const minute = istNow.getMinutes();
          if (!(hour === 10 && minute >= 0 && minute <= 30)) {
          setError("Users who follow nobody can post only between 10:00-10:30 IST");
          setLoading(false);
          return;
        }
      }
      if (quotaInfo.remaining !== Infinity && quotaInfo.remaining <= 0) {
        setError("You have reached your posting limit for today.");
        setLoading(false);
        return;
      }
    } catch (e) {
      // proceed
    }
    try {
      const fd = new FormData();
      fd.append("text", caption);
      if (mediaFiles && mediaFiles.length) {
        for (const f of mediaFiles) fd.append("media", f);
      }
      const res = await API.post("/tweets", fd);
      // Show browser notification if backend signals notify or text contains keywords
      try {
        const shouldNotify = (res.data && res.data.notify) || (caption && /(cricket|science)/i.test(caption));
        if (notificationsEnabled && shouldNotify && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("New Tweet", { body: caption || "New tweet posted" });
        }
      } catch (e) {
        console.debug("Notification error", e);
      }
      setCaption("");
      setMediaFiles([]);
      onPosted && onPosted();
      // refresh quota
      const res2 = await API.get("/auth/me");
      const tweetsRes = await API.get("/tweets");
      const all = tweetsRes.data || [];
      const myId = res2.data.user?._id;
      const today = new Date();
      const istToday = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const start = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 0, 0, 0);
      const end = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 23, 59, 59);
      const used = all.filter(t => t.user?._id === myId && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end).length;
      const plan = res2.data.user?.subscription?.plan || "free";
      const planMap = { free: 1, bronze: 3, silver: 5, gold: Infinity };
      let allowed = planMap[plan] ?? 1;
      const follows = (res2.data.user?.follows || []).length;
      if (follows === 0) allowed = Math.min(allowed, 1);
      else if (follows >= 2 && follows <= 10) allowed = Math.min(allowed, 2);
      const remaining = allowed === Infinity ? Infinity : Math.max(0, allowed - used);
      setTodayCount(used);
      setQuotaInfo({ allowed, remaining, reason: "" });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  }

  return (
    <div className="composer bg-white rounded-xl shadow-lg p-4 flex flex-col gap-4 max-w-xl mx-auto">
      <div
        className={`border-2 ${dragActive ? "border-blue-400 bg-blue-50" : "border-dashed border-gray-300"} rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition mb-2 relative`}
        onClick={handleUploadClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ minHeight: "120px" }}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold shadow hover:scale-105 transition mb-2"
        >
          Upload Media
        </button>
        <span className="text-gray-400 text-sm">Drag & drop images (max 4) or 1 video here</span>
      </div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {mediaFiles.length > 0 && (
        <div className="mb-2">
          {/* Image grid or video preview */}
          {mediaFiles[0].type.startsWith("image") ? (
            <div className="grid grid-cols-2 gap-3">
              {mediaFiles.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="preview"
                    className="rounded-lg shadow border border-gray-200 object-cover w-full h-32"
                  />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeMedia(idx); }}
                    className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-gray-700 hover:text-red-500 shadow group-hover:scale-110 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <video
                src={URL.createObjectURL(mediaFiles[0])}
                controls
                className="rounded-lg shadow border border-gray-200 w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeMedia(0); }}
                className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-gray-700 hover:text-red-500 shadow transition"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
      <textarea
        value={caption}
        onChange={handleCaptionChange}
        placeholder="Write a caption…"
        className="w-full rounded-2xl border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-2"
        rows={2}
      ></textarea>
      {/* Hashtag/@mention highlight preview */}
      {caption && (
        <div className="mb-2 text-base">
          {highlightCaption(caption)}
        </div>
      )}
      {/* Quota display */}
      <div className="text-sm text-gray-600 mb-2">
        {quotaInfo.allowed === Infinity ? (
          <span>Plan: Unlimited tweets</span>
        ) : (
          <span>Today: {todayCount}/{quotaInfo.allowed} &mdash; Remaining: {quotaInfo.remaining}</span>
        )}
      </div>
      <button
        onClick={post}
        disabled={
          loading ||
          (!caption.trim() && mediaFiles.length === 0) ||
          (quotaInfo.remaining !== Infinity && quotaInfo.remaining <= 0)
        }
        className="self-end px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold shadow hover:scale-105 transition flex items-center gap-2"
      >
        {loading && (
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 01-8 8z" />
          </svg>
        )}
        Tweet
      </button>
    </div>
  );
}
