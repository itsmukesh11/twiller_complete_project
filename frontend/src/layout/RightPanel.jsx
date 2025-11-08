
import React from "react";
import SubscriptionPage from "../components/SubscriptionPage";
import ForgotPassword from "../components/ForgotPassword";
import API from "../api";

const suggestedUsers = [
  { name: "Jane Doe", handle: "janedoe", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "John Smith", handle: "johnsmith", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
  { name: "Alice Blue", handle: "aliceblue", avatar: "https://randomuser.me/api/portraits/women/46.jpg" },
];
const hashtags = ["#React", "#Tailwind", "#WebDev", "#OpenAI", "#NodeJS", "#MongoDB"];

export default function RightPanel() {
  const [isVisible, setIsVisible] = React.useState(false);

  const togglePanel = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <button 
        className="mobile-subscription-toggle"
        onClick={togglePanel}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 101,
          background: '#1d9bf0',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '24px'
        }}
      >
        💎
      </button>
      <aside className={`rightpanel p-4 ${isVisible ? 'visible' : ''}`} style={{
      background: "rgba(255,255,255,0.7)",
      boxShadow: "0 8px 32px rgba(29,155,240,0.18)",
      borderRadius: "28px",
      backdropFilter: "blur(12px)",
      border: "1.5px solid #e6ecf0"
    }}>
      <SubscriptionPage />
      <div className="mt-8">
        <div style={{ marginBottom: 8 }}>
          <ForgotPassword />
        </div>
      </div>
      {/* Who to follow */}
      <div className="mt-8">
        <div className="font-bold text-lg mb-2">Who to follow</div>
        <div className="flex flex-col gap-3">
          {suggestedUsers.map((u) => (
            <FollowRow key={u.handle} user={u} />
          ))}
        </div>
      </div>
      {/* Trending hashtags */}
      <div className="mt-8">
        <div className="font-bold text-lg mb-2">Trending Hashtags</div>
        <ul className="flex flex-col gap-2">
          {hashtags.map((tag) => (
            <li key={tag} className="text-blue-500 font-semibold hover:underline cursor-pointer">{tag}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

  function FollowRow({ user }) {
    const [following, setFollowing] = React.useState(false);
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await API.get("/auth/is-following/" + user.handle);
          if (mounted && res.data) setFollowing(!!res.data.following);
        } catch (e) {
          // ignore
        }
      })();
      return () => { mounted = false; };
    }, [user.handle]);

    async function toggle() {
        try {
          const endpoint = following ? "/auth/unfollow/" + user.handle : "/auth/follow/" + user.handle;
          const res = await API.post(endpoint);
          if (res.data && typeof res.data.follows !== "undefined") {
            const tId = res.data.targetId;
            const nowFollowing = (res.data.follows || []).map(String).includes(String(tId));
            setFollowing(nowFollowing);
          } else {
            setFollowing(!following);
          }
        } catch (e) {
          console.debug(e);
        }
    }

    return (
      <div className="flex items-center gap-3 bg-white/80 rounded-lg p-2">
        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
        <div className="flex-1">
          <div className="font-semibold">{user.name}</div>
          <div className="text-xs text-gray-500">@{user.handle}</div>
        </div>
        <button
          onClick={toggle}
          className={
            following
              ? "px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700"
              : "px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-400 text-white"
          }
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>
    );
  }
