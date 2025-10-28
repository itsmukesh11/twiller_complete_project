import React from "react";

const conversations = [
  { name: "Alice", last: "Hey, how are you?" },
  { name: "Bob", last: "Let's catch up soon!" },
  { name: "Charlie", last: "Check out this tweet!" }
];

export default function Messages() {
  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-lg mb-4 text-blue-700">Messages</h2>
        <ul className="flex flex-col gap-3 mb-4">
          {conversations.map((c, i) => (
            <li key={i} className="bg-gray-50 px-4 py-2 rounded-lg shadow hover:bg-blue-50 cursor-pointer transition border border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-blue-600">{c.name}</span>
              <span className="text-gray-500 text-sm">{c.last}</span>
            </li>
          ))}
        </ul>
        <button className="w-full py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold shadow hover:scale-105 transition">Start chat</button>
      </div>
    </div>
  );
}
