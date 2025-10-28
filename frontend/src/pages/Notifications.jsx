import React from "react";

const notifications = [
  "Someone liked your tweet",
  "Your tweet with cricket got highlighted",
  "You have a new follower",
  "Your subscription was renewed",
  "Audio tweet received 10 likes"
];

export default function Notifications() {
  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-lg mb-4 text-blue-700">Notifications</h2>
        <ul className="flex flex-col gap-3">
          {notifications.map((note, i) => (
            <li key={i} className="bg-gray-50 px-4 py-2 rounded-lg shadow hover:bg-blue-50 cursor-pointer transition border border-gray-100">
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
