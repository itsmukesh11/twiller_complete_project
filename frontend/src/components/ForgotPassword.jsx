import React, { useState } from "react";
import API from "../api";

export default function ForgotPassword(){
  const [email, setEmail] = useState("");

  async function send(){
    try {
      const res = await API.post("/auth/forgot", { email });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="card">
      <h4>Forgot Password</h4>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email" />
      <button onClick={send}>Request Reset (once per day)</button>
    </div>
  );
}
