
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
  return (
    <aside className="bg-white rounded-xl shadow-md border border-gray-100 p-4 space-y-6">
      <SubscriptionPage />
      
      <div className="border-t border-gray-100 pt-6">
        <ForgotPassword />
      </div>
      
      {/* Who to follow */}
      <div className="border-t border-gray-100 pt-6">
        <div className="font-bold text-lg mb-2">Who to follow</div>
        <div className="flex flex-col gap-3">
          {suggestedUsers.map((u) => (
            <FollowRow key={u.handle} user={u} />
          ))}
        </div>
      </div>
      
      {/* Trending hashtags */}
      <div className="border-t border-gray-100 pt-6">
        <div className="font-bold text-lg mb-2">Trending Hashtags</div>
        <ul className="flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <li key={tag} className="text-blue-500 font-semibold hover:underline cursor-pointer bg-blue-50 px-3 py-1 rounded-full text-sm">{tag}</li>
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
