
import React, { useEffect, useState } from "react";
import API from "../api";

const plans = [
  { key: "free", label: "Free (1 tweet)", price: 0, quota: 1 },
  { key: "bronze", label: "Bronze (3 tweets)", price: 100, quota: 3 },
  { key: "silver", label: "Silver (5 tweets)", price: 300, quota: 5 },
  { key: "gold", label: "Gold (unlimited)", price: 1000, quota: Infinity }
];

function inISTWindow(start, end) {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const h = istNow.getHours();
  return h >= start && h < end;
}

async function fetchTodayCount(user, setTodayCount) {
  const res = await API.get("/tweets");
  const myId = user?._id;
  if (!myId) return;
  const today = new Date();
  const istToday = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const start = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 0, 0, 0);
  const end = new Date(istToday.getFullYear(), istToday.getMonth(), istToday.getDate(), 23, 59, 59);
  setTodayCount(res.data.filter(t => t.user?._id === myId && new Date(t.createdAt) >= start && new Date(t.createdAt) <= end).length);
}

export default function SubscriptionPage() {
  const [user, setUser] = useState(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    async function fetchUser() {
      const res = await API.get("/auth/me");
      setUser(res.data.user);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodayCount(user, setTodayCount);
    }
  }, [user]);

  async function buy(plan) {
    if (!inISTWindow(10, 11)) return alert("Payments allowed only 10-11 AM IST");
    try {
      const res = await API.post("/payments/create-checkout-session", { plan });
      window.location = res.data.url;
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  const currentPlan = user?.subscription?.plan || "free";
  const quota = plans.find(p => p.key === currentPlan)?.quota;

  return (
    <div className="card">
      <h4>Subscriptions</h4>
      <div className="mb-2">
        <strong>Current Plan:</strong> {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
        {quota !== Infinity && (
          <span> &mdash; {todayCount}/{quota} tweets today</span>
        )}
        {quota === Infinity && (
          <span> &mdash; Unlimited tweets</span>
        )}
      </div>
      {plans.map(p => (
        <div key={p.key} className="flex items-center justify-between mb-2 p-2 rounded-lg bg-white shadow-sm border border-gray-100">
          <div>
            <strong>{p.label}</strong>
            <span className="ml-2 text-gray-500 font-medium">₹{p.price}</span>
          </div>
          <div className="flex items-center gap-2">
            {!inISTWindow(10,11) && <div className="text-xs text-red-500">Payments allowed 10–11 AM IST</div>}
            {currentPlan === p.key ? (
              <div className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">Active</div>
            ) : (
              <button
                onClick={() => buy(p.key)}
                disabled={!inISTWindow(10,11)}
                className={`px-4 py-2 rounded-full text-white font-bold shadow ${inISTWindow(10,11) ? "bg-gradient-to-r from-blue-500 to-cyan-400 hover:scale-105" : "bg-gray-300 cursor-not-allowed"}`}
              >Buy</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
