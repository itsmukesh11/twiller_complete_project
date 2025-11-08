import React, { useState } from "react";
import API from "../api";

export default function TweetCard({
  tweet,
  onDelete,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [likes, setLikes] = useState(tweet.likes?.length || 0);
  const [shares, setShares] = useState(tweet.shares || 0);
  const [comments, setComments] = useState(tweet.comments || []);
  const [commentsCount, setCommentsCount] = useState(comments.length || 0);
  const [showComments, setShowComments] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isOwner = currentUser._id === tweet.user?._id;

  async function like() {
    try {
      const res = await API.post(`/tweets/${tweet._id}/like`);
      setLikes(res.data.likes);
    } catch (e) {
      console.debug(e);
    }
  }

  async function share() {
    try {
      const res = await API.post(`/tweets/${tweet._id}/share`);
      setShares(res.data.shares);
      // Optionally copy link
      const link = `${window.location.origin}/?shared=${tweet._id}`;
      navigator.clipboard?.writeText(link);
      alert("Link copied to clipboard");
    } catch (e) {
      console.debug(e);
    }
  }

  async function deleteTweet() {
  if (!window.confirm("Are you sure you want to delete this tweet?")) return;
    
    try {
      setIsDeleting(true);
      await API.delete(`/tweets/${tweet._id}`);
      if (onDelete) onDelete(tweet._id);
    } catch (e) {
  console.error("Error deleting tweet:", e);
  alert("Failed to delete tweet. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteComment(commentId) {
  if (!window.confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      const res = await API.delete(`/tweets/${tweet._id}/comments/${commentId}`);
      if (res.data && res.data.comments) {
        setComments(res.data.comments);
        setCommentsCount(res.data.comments.length);
      }
    } catch (e) {
  console.error("Error deleting comment:", e);
  alert("Failed to delete comment. Please try again.");
    }
  }



  async function comment() {
    const text = prompt("Write a comment");
    if (!text) return;
    try {
      const res = await API.post(`/tweets/${tweet._id}/comment`, { text });
      if (res.data && res.data.comments) {
        setComments(res.data.comments);
        setCommentsCount(res.data.comments.length);
        setShowComments(true);
      }
    } catch (e) {
      console.debug(e);
    }
  }

  const apiBase = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 hover:bg-gray-50 transition flex flex-col gap-2 tweet-card-compact">
    <div className="flex items-center gap-3 mb-1 justify-between">
      <div className="flex items-center gap-3">
        <img className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" src={tweet.user?.avatar || "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"} alt="avatar" onError={(e)=>{e.currentTarget.src = "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";}} />
        <div>
          <span className="font-bold">{tweet.user?.name}</span>
          <span className="ml-2 text-xs text-gray-500">@{tweet.user?.email?.split("@")[0]}</span>
          <span className="ml-2 text-xs text-gray-400">· {new Date(tweet.createdAt).toLocaleString()}</span>
        </div>
      </div>
      {isOwner && (
        <button 
          onClick={deleteTweet}
          disabled={isDeleting}
          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
        >
          {isDeleting ? "Deleting..." : "🗑️"}
        </button>
      )}
    </div>
      <div className="text-base text-gray-800 mb-2">{tweet.text}</div>
      {tweet.audioUrl && (
        <audio controls className="w-full mt-2">
          <source src={`${apiBase}${tweet.audioUrl}`} type={tweet.audioUrl.endsWith(".webm") ? "audio/webm" : "audio/mpeg"} />
        </audio>
      )}
      {tweet.mediaUrls && tweet.mediaUrls.length > 0 && (
        <div className="mt-2">
            {tweet.mediaUrls.map((m, i) => (
            m.endsWith(".mp4") || m.endsWith(".webm") ? (
              <video key={i} controls className="w-full rounded-lg mb-2 max-h-96 object-contain">
                <source src={m.startsWith("http") ? m : `${apiBase}${m}`} />
              </video>
              ) : (
              <img key={i} src={m.startsWith("http") ? m : `${apiBase}${m}`} alt={`media-${i}`} className="w-full rounded-lg mb-2 object-contain max-h-96 hero" />
            )
          ))}
        </div>
      )}
      <div className="flex gap-8 mt-2 text-gray-500">
        <button onClick={like} className="flex items-center gap-1 hover:text-blue-500 transition"><span role="img" aria-label="like">❤️</span> {likes}</button>
        <button onClick={comment} className="flex items-center gap-1 hover:text-blue-500 transition"><span role="img" aria-label="comment">💬</span> {commentsCount}</button>
        <button onClick={share} className="flex items-center gap-1 hover:text-blue-500 transition"><span role="img" aria-label="share">🔗</span> {shares}</button>
      </div>
      {/* Comments preview / list */}
      {commentsCount > 0 && (
        <div className="mt-3 text-sm text-gray-700">
          {!showComments && comments.length > 2 && (
            <button onClick={() => setShowComments(true)} className="text-blue-500 hover:underline mb-2">Show all {commentsCount} comments</button>
          )}
          <div className="flex flex-col gap-2">
            {(showComments ? comments : comments.slice(0, 2)).map((c, i) => (
              <div key={i} className="bg-gray-50 p-2 rounded flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{c.user?.name || "Unknown"}</div>
                  <div className="text-sm text-gray-700">{c.text}</div>
                </div>
                {c.user?._id === currentUser._id && (
                  <button
                    onClick={() => deleteComment(c._id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
