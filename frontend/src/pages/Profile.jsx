import React, { useState, useEffect, useContext } from "react";
import ProfileSettings from "../components/ProfileSettings";
import API from "../api";
import NotificationContext from "../notificationContext";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [tweets, setTweets] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0, mutual: 0 });

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/auth/me");
        setUser(res.data.user);
        setNotificationsEnabled(res.data.notificationsEnabled ?? true);
        // fetch profile by handle (email prefix)
        const handle = (res.data.user.email || "").split("@")[0];
        let p = null;
        try {
          p = await API.get(`/profile/${handle}`);
        } catch (err) {
          // try by id as a fallback
          try {
            p = await API.get(`/profile/id/${res.data.user._id}`);
          } catch (err2) {
            p = null;
          }
        }
        if (p && p.data) {
          setUser(p.data.user);
          setCounts(p.data.counts || { followers: 0, following: 0, mutual: 0 });
          setTweets(p.data.posts || []);
          // determine if we are following this user
          try {
            API.get("/auth/is-following/" + (p.data.user.email || "").split("@")[0])
              .then((r) => {
                if (r.data) setFollowing(!!r.data.following);
              })
              .catch((err) => {
                console.debug(err);
              });
          } catch (e) {
            console.debug(e);
          }
        } else {
          // last resort: fetch all tweets and filter by current user id
          try {
            const t = await API.get("/tweets");
            const myId = res.data.user._id;
            setTweets((t.data || []).filter((x) => x.user && String(x.user._id) === String(myId)));
          } catch (e) {
            console.debug(e);
          }
        }
      } catch (e) {
        // Log error for debugging
        console.debug(e);
      }
    }
    load();
  }, []);

  async function handleNotificationChange(enabled) {
    setNotificationsEnabled(enabled);
    try {
      await API.post("/auth/notifications", { enabled });
    } catch (e) {
      console.debug(e);
    }
  }

  const notificationCtx = useContext(NotificationContext);
  useEffect(() => {
    if (typeof notificationCtx?.setEnabled === "function") notificationCtx.setEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  const [following, setFollowing] = useState(false);

  async function toggleFollow() {
          try {
            if (following) {
              const res = await API.post(
                "/auth/unfollow/" + (user.email || "").split("@")[0]
              );
              if (res.data && typeof res.data.follows !== "undefined") {
                setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
                setFollowing(false);
              }
            } else {
              const res = await API.post(
                "/auth/follow/" + (user.email || "").split("@")[0]
              );
              if (res.data && typeof res.data.follows !== "undefined") {
                setCounts((c) => ({ ...c, followers: c.followers + 1 }));
                setFollowing(true);
              }
            }
    } catch (e) {
      console.debug(e);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <ProfileSettings notificationsEnabled={notificationsEnabled} onNotificationChange={handleNotificationChange} />

      <div className="bg-white rounded-xl shadow p-6 mb-6 flex flex-col items-center">
  <img src={user?.avatar || "https://ui-avatars.com/api/?name=Twiller+User&background=0D8ABC&color=fff"} alt="avatar" className="w-24 h-24 rounded-full shadow mb-3 object-cover" onError={(e)=>{e.currentTarget.src = "https://ui-avatars.com/api/?name=Twiller+User&background=0D8ABC&color=fff";}} />
        <div className="mb-2 flex gap-2">
          <label className="cursor-pointer bg-white border border-gray-200 rounded-full px-3 py-1 text-sm font-semibold">Change Photo</label>
        </div>
  <div className="text-lg font-bold text-blue-700">{user?.name || user?.email?.split("@")[0] || "Twiller User"}</div>
        <div className="text-gray-500">{user?.email}</div>
        <div className="text-sm text-gray-600 mt-2">{user?.bio}</div>
        <div className="text-gray-400 text-sm">Joined {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</div>
        <div className="mt-3 text-sm text-gray-600">
          <strong>Plan:</strong> {user?.subscription?.plan || "free"} {user?.subscription?.plan === "gold" ? "(Unlimited)" : ""}
        </div>
        <div className="mt-3 flex gap-4 text-sm text-gray-700">
          <div><strong>{counts.followers}</strong> followers</div>
          <div><strong>{counts.following}</strong> following</div>
          <div><strong>{counts.mutual}</strong> mutual</div>
        </div>
        <div className="mt-3">
          <button onClick={toggleFollow} className="px-3 py-2 rounded-full bg-blue-500 text-white font-semibold">
            {following ? "Unfollow" : "Follow"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-lg mb-4 text-blue-700">Your Tweets</h2>
        <ul className="flex flex-col gap-3">
          {tweets.length === 0 && <div className="text-sm text-gray-500">You have not posted any tweets yet.</div>}
          {tweets.map((t) => (
            <li key={t._id} className="bg-gray-50 px-4 py-2 rounded-lg shadow border border-gray-100">
              <div className="font-medium">{t.text}</div>
              <div className="text-gray-400 text-xs">{new Date(t.createdAt).toLocaleString()}</div>
              {t.mediaUrls && t.mediaUrls.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {t.mediaUrls.map((m, idx) => (
                    <img key={idx} src={m.startsWith("http") ? m : (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "") + m} alt={`post-${idx}`} className="w-full h-40 object-cover rounded" />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
