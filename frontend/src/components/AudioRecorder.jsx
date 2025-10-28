

import React, { useState, useRef, useContext } from "react";
import API from "../api";
import NotificationContext from "../notificationContext";

export default function AudioRecorder({ onUploaded }) {
  const { enabled: notificationsEnabled } = useContext(NotificationContext);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef();

  async function startRecording(){
    const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hour = istNow.getHours();
  if (hour < 14 || hour >= 19) return alert("Audio uploads allowed only 2PM-7PM IST");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const localChunks = [];
    mr.ondataavailable = e => localChunks.push(e.data);
    mr.onstop = ()=> setChunks(localChunks);
    mr.start();
    setMediaRecorder(mr);
    setRecording(true);

    setTimeout(() => {
      if (mr.state === "recording") mr.stop();
      setRecording(false);
    }, 300000);
  }

  function stopRecording(){
    if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
    setRecording(false);
  }

  function play(){
    if (!chunks.length) return;
  const blob = new Blob(chunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    audioRef.current.src = url;
    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current.duration);
    };
    audioRef.current.play();
  }

  async function sendOtp(){
    setError("");
    setLoading(true);
    try {
  await API.post("/audio/send-otp");
      setOtpSent(true);
      setError("OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  }

  async function verifyOtp(){
    setError("");
    setLoading(true);
    try {
  await API.post("/audio/verify-otp", { code: otp });
      setOtpVerified(true);
      setError("OTP verified, now you can upload audio.");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  }

  async function upload(){
    setError("");
    if (!chunks.length) return setError("No audio recorded");
    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size > 100 * 1024 * 1024) return setError("File too big");
    if (duration > 300) return setError("Audio is longer than 5 minutes");
    if (!otpVerified) return setError("Please verify OTP before uploading");
    setLoading(true);
    try {
    const fd = new FormData();
    fd.append("audio", blob, "audio.webm");
    const res = await API.post("/audio/upload", fd);
      setError("Uploaded successfully!");
      setChunks([]);
      setOtpVerified(false);
      setOtpSent(false);
      setOtp("");
      onUploaded && onUploaded();
      try {
        const tweet = res.data && res.data.tweet;
        const text = (tweet && tweet.text) || "New audio tweet";
        const shouldNotify = (tweet && /(cricket|science)/i.test(text)) || /(cricket|science)/i.test(text);
        if (notificationsEnabled && shouldNotify && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("New Audio Tweet", { body: text });
        }
      } catch (e) {
        console.debug("Notification failed", e);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-blue-100 flex flex-col gap-4">
      <div>
        <h4 className="text-lg font-bold text-blue-700">Audio Tweet</h4>
        <div className="border-b border-blue-200 mt-1 mb-3"></div>
      </div>
      {error && <div style={{color: error.includes("success") ? "#388e3c" : "#d32f2f", marginBottom:8, fontWeight:500}}>{error}</div>}
      <div className="flex gap-2 flex-wrap mb-2">
        <button onClick={recording ? stopRecording : startRecording} disabled={loading}
          className={`px-4 py-2 rounded-full font-semibold shadow ${recording ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"} hover:bg-blue-200 transition`}>
          {recording ? "Stop" : "Record (max 5 min)"}
        </button>
        <button onClick={play} disabled={loading}
          className="px-4 py-2 rounded-full font-semibold shadow bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
          Play
        </button>
      </div>
      <audio ref={audioRef} controls className="w-full mb-2" />
      {duration > 0 && <div className="text-sm text-gray-500">Duration: {Math.floor(duration/60)}:{("0"+Math.floor(duration%60)).slice(-2)} min</div>}
      <div className="flex gap-2 flex-wrap items-center mb-2">
        {!otpSent && <button onClick={sendOtp} disabled={loading}
          className="px-4 py-2 rounded-full font-semibold shadow bg-blue-100 text-blue-700 hover:bg-blue-200 transition">Send OTP to verify</button>}
        {otpSent && !otpVerified && <>
          <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder={"Enter OTP"} disabled={loading}
            className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <button onClick={verifyOtp} disabled={loading}
            className="px-4 py-2 rounded-full font-semibold shadow bg-blue-100 text-blue-700 hover:bg-blue-200 transition">Verify OTP</button>
        </>}
        {otpVerified && <span className="text-green-600 font-semibold">OTP Verified!</span>}
      </div>
      <button onClick={upload} disabled={!otpVerified || loading}
        className="w-full px-4 py-2 rounded-full font-bold shadow bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:scale-105 transition flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        )}
        Upload
      </button>
    </div>
  );
}
