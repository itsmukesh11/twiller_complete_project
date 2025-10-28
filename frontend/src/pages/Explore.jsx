import React, { useEffect, useState } from "react";
import API from "../api";

export default function Explore() {
  const [hashtags, setHashtags] = useState(["#React", "#AI", "#Cricket", "#Tailwind"]);

  useEffect(() => {
    async function load() {
      try {
  const res = await API.get("/tweets/trending/hashtags");
        if (res.data && res.data.length) setHashtags(res.data);
      } catch (e) {
        console.debug("Trending fetch failed", e);
      }
    }
    load();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <input
          type="text"
          placeholder="Search Twitter..."
          className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
        />
        <h2 className="font-bold text-lg mb-2 text-blue-700">Trending Hashtags</h2>
        <ul className="flex flex-wrap gap-3">
          {hashtags.map(tag => (
            <li key={tag} className="bg-blue-50 px-3 py-1 rounded-full text-blue-600 font-medium shadow hover:bg-blue-100 cursor-pointer transition">
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
