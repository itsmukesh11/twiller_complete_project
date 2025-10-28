

import React, { useEffect, useRef, useContext } from "react";
import PostComposer from "../components/PostComposer";
import AudioRecorder from "../components/AudioRecorder";
import TweetCard from "../components/TweetCard";
import NotificationContext from "../notificationContext";

function showBrowserNotification(tweet) {
  if (Notification.permission === "granted") {
    new Notification("New Tweet", { body: tweet.text });
  }
}

export default function Feed({ tweets = [], fetchTweets }) {
  const notifiedIds = useRef(new Set());
  const { enabled: notificationsEnabled } = useContext(NotificationContext);

  useEffect(() => {
    // Ensure browser permission requested once when notifications are enabled
    if (notificationsEnabled && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    tweets.forEach(tweet => {
      if (!tweet) return;
  const shouldNotify = tweet.notify || (tweet.text && /(cricket|science)/i.test(tweet.text));
      if (notificationsEnabled && shouldNotify && !notifiedIds.current.has(tweet._id)) {
        showBrowserNotification(tweet);
        notifiedIds.current.add(tweet._id);
      }
    });
  }, [tweets, notificationsEnabled]);

  return (
    <div className="feed-container">
      <div className="feed-header">Home</div>

      <div className="card composer-wrapper">
        <PostComposer onPosted={fetchTweets} />
        <div className="audio-wrapper">
          <AudioRecorder onUploaded={fetchTweets} />
        </div>
      </div>

      <div className="tweets-list">
        {tweets.map((t) => (
          <TweetCard key={t._id} tweet={t} />
        ))}
      </div>
    </div>
  );
}
