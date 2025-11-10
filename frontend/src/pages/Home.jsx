import React, { useEffect, useState } from "react";
import Feed from "../layout/Feed";
import API from "../api";

// Home will fetch tweets and pass to Feed
function useTweets() {
  const [tweets, setTweets] = useState([]);
  async function fetchTweets() {
    const res = await API.get("/tweets");
    setTweets(res.data);
  }
  useEffect(()=>{ fetchTweets(); }, []);
  return { tweets, fetchTweets };
}

export default function Home() {
  const { tweets, fetchTweets } = useTweets();
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 py-4 px-4 sm:px-6">
      {/* Composer kept inside Feed to avoid duplicate upload areas */}
      <Feed tweets={tweets} fetchTweets={fetchTweets} />
    </div>
  );
}
