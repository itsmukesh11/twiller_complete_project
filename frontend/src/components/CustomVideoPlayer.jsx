
import React, { useRef, useState } from "react";

export default function CustomVideoPlayer({ src, onNext, onClose, onShowComments }) {
  const videoRef = useRef();
  const taps = useRef([]);
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  function handleTouch(e){
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const third = rect.width / 3;
    taps.current.push({ t: Date.now(), x });
    taps.current = taps.current.filter(a => Date.now() - a.t < 800);
    const len = taps.current.length;

    if (len === 1) {
      setTimeout(()=> {
        if (taps.current.length === 1) {
          const pos = taps.current[0].x;
          if (pos > third && pos < 2*third) {
            const v = videoRef.current;
            if (v.paused) v.play(); else v.pause();
          }
          taps.current = [];
        }
      }, 250);
    } else if (len === 2) {
      const avgX = (taps.current[0].x + taps.current[1].x) / 2;
      const v = videoRef.current;
  if (avgX > 2*third) v.currentTime = Math.min(v.duration, v.currentTime + 10);
  else if (avgX < third) v.currentTime = Math.max(0, v.currentTime - 10);
      taps.current = [];
    } else if (len >= 3) {
      const avgX = (taps.current[0].x + taps.current[1].x + taps.current[2].x) / 3;
      const v = videoRef.current;
      if (avgX > 2*third) {
        window.close();
      } else if (avgX < third) {
        // show comments modal through callback or internal modal
        if (typeof onShowComments === "function") onShowComments();
        else setShowCommentsModal(true);
      } else {
        const evt = new CustomEvent("nextVideo");
        window.dispatchEvent(evt);
        if (typeof onNext === "function") onNext();
      }
      taps.current = [];
    }
  }

  return (
    <div className="video-container" style={{position:'relative'}}>
      {loading && (
        <div style={{
          position:'absolute', left:0, top:0, right:0, bottom:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(255,255,255,0.7)', zIndex:2
        }}>
          <span style={{color:'#1d9bf0', fontWeight:600}}>Loading video...</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        controls
        onTouchStart={handleTouch}
        style={{ width: '100%', maxHeight: 400 }}
        onLoadedData={()=>setLoading(false)}
        onWaiting={()=>setLoading(true)}
        onPlaying={()=>setLoading(false)}
      />
      {showCommentsModal && (
        <div style={{position:'absolute', left:0, top:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10}}>
          <div style={{background:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:420}}>
            <h3 style={{margin:0, marginBottom:8}}>Comments</h3>
            <textarea placeholder="Write a comment..." style={{width:'100%', minHeight:80, padding:8, marginBottom:8}} />
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button onClick={()=>setShowCommentsModal(false)} style={{padding:'8px 12px'}}>Close</button>
              <button onClick={()=>setShowCommentsModal(false)} style={{padding:'8px 12px', background:'#1d9bf0', color:'#fff', border:'none', borderRadius:6}}>Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
