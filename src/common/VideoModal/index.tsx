import { useEffect, useState, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { IoMdClose, IoMdSettings, IoMdPlay, IoMdPause, IoMdExpand } from "react-icons/io";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

import Overlay from "../Overlay";
import { useGlobalContext } from "@/context/globalContext";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useMotion } from "@/hooks/useMotion";
import { useOnKeyPress } from "@/hooks/useOnKeyPress";

const firebaseConfig = {
  apiKey: "AIzaSyAn-U4aTP5LwHf9cIOdPAXp4fCMzYyrDV8",
  authDomain: "sebartv-efccb.firebaseapp.com",
  databaseURL: "https://sebartv-efccb-default-rtdb.firebaseio.com",
  projectId: "sebartv-efccb",
  storageBucket: "sebartv-efccb.firebasestorage.app",
  messagingSenderId: "18058839830",
  appId: "1:18058839830:web:2f4bd640d4d89c5eb77237",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// فەنکشن بۆ ڕێکخستنی کات (00:00)
const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const VideoModal = () => {
  const { videoId: movieData, closeModal, isModalOpen } = useGlobalContext();
  const { zoomIn } = useMotion();

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [keyInput, setKeyInput] = useState("");
  const [isVipVerified, setIsVipVerified] = useState(false);
  const [isLoadingVip, setIsLoadingVip] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [fbData, setFbData] = useState(null);
  const [isFetchingVideo, setIsFetchingVideo] = useState(true);
  const [localSubtitle, setLocalSubtitle] = useState("");

  // ستەیتەکانی پلەیەرە مۆدێرنەکە
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // ڕێکخستنەکانی ژێرنووس
  const [showSettings, setShowSettings] = useState(false);
  const [subSize, setSubSize] = useState("100");
  const [subColor, setSubColor] = useState("#ffffff");
  const [subBg, setSubBg] = useState("rgba(0,0,0,0.75)");

  const { ref: modalRef } = useOnClickOutside({
    action: () => {
      if (!document.fullscreenElement) closeModal();
    },
    enable: isModalOpen && !document.fullscreenElement,
  });

  useOnKeyPress({
    key: "Escape",
    action: () => {
      if (!document.fullscreenElement) closeModal();
    },
    enable: isModalOpen
  });

  // هێنانی داتا لە فایەربەیس
  useEffect(() => {
    if (isModalOpen && movieData?.id) {
      setIsFetchingVideo(true);
      setFbData(null);
      setLocalSubtitle("");
      setIsVipVerified(false);
      setErrorMsg("");

      const videoRefFb = ref(db, `np/${movieData.id}`);
      get(videoRefFb).then((snapshot) => {
        if (snapshot.exists()) setFbData(snapshot.val());
        setIsFetchingVideo(false);
      }).catch(() => setIsFetchingVideo(false));
    }
  }, [isModalOpen, movieData]);

  // ڕێگریکردن لە سکڕۆڵی شاشە
  useEffect(() => {
    const body = document.body;
    const rootNode = document.documentElement;
    if (isModalOpen) {
      const scrollTop = rootNode.scrollTop;
      body.style.top = `-${scrollTop}px`;
      body.classList.add("no-scroll");
      return;
    }
    const top = parseFloat(body.style.top) * -1;
    body.classList.remove("no-scroll");
    if (top) {
      rootNode.style.scrollBehavior = "auto";
      rootNode.scrollTop = top;
      rootNode.style.scrollBehavior = "smooth";
    }
  }, [isModalOpen]);

  // هێنانی ژێرنووس
  useEffect(() => {
    const subUrl = fbData?.subtitleKurdish || fbData?.subtitle_url || "";
    if (subUrl) {
      fetch(subUrl)
        .then((res) => res.text())
        .then((text) => {
          const blob = new Blob([text], { type: "text/vtt" });
          setLocalSubtitle(URL.createObjectURL(blob));
        })
        .catch(() => {});
    }
  }, [fbData]);

  // شاردنەوەی کۆنتڕۆڵەکان بەشێوەی ئۆتۆماتیکی
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) setShowControls(false);
    }, 3000);
  };

  // کۆنتڕۆڵی ڤیدیۆ (Play/Pause, Seek)
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skipTime = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  // سیستەمی کلیلەکانی VIP
  const verifyVipKey = async () => {
    if (!keyInput.trim()) {
      setErrorMsg("تکایە کلیلەکە داخڵ بکە!");
      return;
    }
    setIsLoadingVip(true);
    setErrorMsg("");
    try {
      const keyRefDb = ref(db, `activation_keys/${keyInput}`);
      const snapshot = await get(keyRefDb);
      if (snapshot.exists()) {
        const keyData = snapshot.val();
        const now = Date.now();

        if (keyData.expiry_date && now > keyData.expiry_date) {
          setErrorMsg("ببورە، کاتی ئەم کلیلە بەسەرچووە!");
          setIsLoadingVip(false);
          return;
        }

        let deviceId = localStorage.getItem("sebar_device_id");
        if (!deviceId) {
          deviceId = "dev_" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("sebar_device_id", deviceId);
        }

        if (keyData.used === false) {
          await update(keyRefDb, { used: true, device_id: deviceId });
          setIsVipVerified(true);
        } else if (keyData.device_id === deviceId) {
          setIsVipVerified(true);
        } else {
          setErrorMsg("ئەم کلیلە پێشتر لەلایەن کەسێکی ترەوە بەکارهاتووە!");
        }
      } else {
        setErrorMsg("ئەم کلیلە بوونی نییە یان هەڵەیە!");
      }
    } catch (error) {
      setErrorMsg("کێشەیەک ڕوویدا لە پەیوەندیکردن.");
    } finally {
      setIsLoadingVip(false);
    }
  };

  const isVip = fbData?.badge_text === "VIP";
  const canPlayVideo = !isVip || isVipVerified;
  
  const rawUrl = fbData?.url || fbData?.video_url || "";
  const WORKER_URL = "https://videoproxy.sarkotiktok36.workers.dev/?url=";
  const videoUrl = rawUrl ? `${WORKER_URL}${encodeURIComponent(rawUrl)}` : "";
  const posterImage = fbData?.image || movieData?.poster_path || "";

  return (
    <AnimatePresence>
      {isModalOpen && (
        <Overlay className="flex items-center justify-center backdrop-blur-sm z-50">
          <style>
            {`
              video::cue {
                font-size: ${subSize}%;
                color: ${subColor};
                background-color: ${subBg};
                text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                font-family: Arial, sans-serif;
              }
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #E50914;
                cursor: pointer;
                margin-top: -6px;
              }
              input[type=range]::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
              }
            `}
          </style>

          <m.div
            variants={zoomIn(0.9, 0.3)}
            initial="hidden"
            animate="show"
            exit="hidden"
            ref={modalRef}
            className="md:w-[900px] md:h-[520px] sm:w-[95vw] sm:h-[65vh] w-[100vw] h-[100vh] sm:rounded-2xl dark:bg-gray-900 bg-black relative flex flex-col shadow-2xl overflow-hidden"
          >
            {isFetchingVideo ? (
              <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a]">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-300 font-semibold text-lg animate-pulse">هێنان...</p>
              </div>
            ) : !videoUrl ? (
              <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] relative">
                <button onClick={closeModal} className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-red-600 transition"><IoMdClose size={24} /></button>
                <span className="text-red-500 text-6xl mb-4">⚠️</span>
                <p className="text-gray-200 text-xl font-bold">ببورە، لینکی ئەم فیلمە بەردەست نییە!</p>
              </div>
            ) : canPlayVideo ? (
              <div 
                ref={containerRef}
                className="w-full h-full relative group bg-black"
                onMouseMove={handleMouseMove}
                onClick={handleMouseMove}
              >
                <video
                  ref={videoRef}
                  key={videoUrl}
                  src={videoUrl}
                  autoPlay
                  playsInline
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
                  onPause={() => setIsPlaying(false)}
                  onWaiting={() => setIsBuffering(true)}
                  onClick={togglePlay}
                  className="w-full h-full object-contain outline-none cursor-pointer"
                  poster={posterImage?.startsWith("http") ? posterImage : `https://image.tmdb.org/t/p/original/${posterImage}`}
                >
                  {fbData?.hasSubtitle && localSubtitle && (
                    <track label="کوردی" kind="subtitles" srcLang="ku" src={localSubtitle} default />
                  )}
                </video>

                <div className={`absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}></div>

                <div className={`absolute inset-0 flex flex-col justify-between p-4 sm:p-6 transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}>
                  
                  <div className="flex items-center justify-between z-40">
                    <button onClick={closeModal} className="bg-white/10 hover:bg-red-600 backdrop-blur-md p-2 rounded-full text-white transition">
                      <IoMdClose size={24} />
                    </button>
                    <h2 className="text-white font-bold text-lg drop-shadow-md">{fbData?.title || "Sebar TV"}</h2>
                    <div className="w-10 h-10"></div> 
                  </div>

                  {isBuffering && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                      <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 sm:gap-12 z-40">
                    <button onClick={(e) => { e.stopPropagation(); skipTime(-10); }} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-white backdrop-blur-sm transition">
                      <span className="text-xs sm:text-sm font-bold">-10</span>
                    </button>
                    
                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-500 border-2 border-red-400/50 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.6)] transition transform hover:scale-105">
                      {isPlaying ? <IoMdPause size={36} /> : <IoMdPlay size={36} className="ml-1" />}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); skipTime(10); }} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-white backdrop-blur-sm transition">
                      <span className="text-xs sm:text-sm font-bold">+10</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 z-40 w-full mt-auto">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-white text-xs sm:text-sm font-medium drop-shadow-md">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      <div className="flex gap-4">
                        <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-white hover:text-red-500 transition">
                          <IoMdSettings size={22} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} className="text-white hover:text-red-500 transition">
                          <IoMdExpand size={24} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #E50914 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`
                      }}
                    />
                  </div>
                </div>

                {showSettings && (
                  <div className="absolute bottom-24 right-4 sm:right-8 z-50 bg-[#141414]/95 border border-gray-700 p-5 rounded-2xl shadow-2xl w-72 text-right backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                      <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white"><IoMdClose size={20}/></button>
                      <h3 className="text-white font-bold text-lg">ژێرنووس</h3>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-gray-400 text-sm block mb-2">قەبارەی دەق</label>
                      <input type="range" min="50" max="200" value={subSize} onChange={(e) => setSubSize(e.target.value)} className="w-full h-1 bg-gray-600 rounded-lg appearance-none accent-red-600" />
                    </div>

                    <div className="mb-4">
                      <label className="text-gray-400 text-sm block mb-2">ڕەنگی دەق</label>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setSubColor("#ffffff")} className={`w-7 h-7 rounded-full bg-white border-2 ${subColor === '#ffffff' ? 'border-red-500' : 'border-transparent'}`}></button>
                        <button onClick={() => setSubColor("#facc15")} className={`w-7 h-7 rounded-full bg-yellow-400 border-2 ${subColor === '#facc15' ? 'border-red-500' : 'border-transparent'}`}></button>
                        <button onClick={() => setSubColor("#38bdf8")} className={`w-7 h-7 rounded-full bg-sky-400 border-2 ${subColor === '#38bdf8' ? 'border-red-500' : 'border-transparent'}`}></button>
                        <button onClick={() => setSubColor("#4ade80")} className={`w-7 h-7 rounded-full bg-green-400 border-2 ${subColor === '#4ade80' ? 'border-red-500' : 'border-transparent'}`}></button>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-sm block mb-2">باگراوەند</label>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setSubBg("transparent")} className={`w-7 h-7 rounded-full bg-transparent border-2 ${subBg === 'transparent' ? 'border-red-500 text-red-500' : 'border-gray-500 text-gray-500'} text-xs flex items-center justify-center font-bold`}>X</button>
                        <button onClick={() => setSubBg("rgba(0,0,0,0.5)")} className={`w-7 h-7 rounded-full bg-black/50 border-2 ${subBg === 'rgba(0,0,0,0.5)' ? 'border-red-500' : 'border-gray-500'}`}></button>
                        <button onClick={() => setSubBg("rgba(0,0,0,0.9)")} className={`w-7 h-7 rounded-full bg-black border-2 ${subBg === 'rgba(0,0,0,0.9)' ? 'border-red-500' : 'border-gray-500'}`}></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a0a] relative">
                <button onClick={closeModal} className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-red-600 transition"><IoMdClose size={24} /></button>
                <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-6 border border-yellow-500/30">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-2">فیلمی <span className="text-yellow-500">VIP</span></h2>
                <p className="text-gray-400 text-sm mb-8 max-w-sm">ئەم فیلمە تەنها بۆ بەشداربووانی پریمیۆمە. تکایە کلیلەکە داخڵ بکە.</p>

                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="کلیلەکەت..."
                  className="w-full max-w-sm bg-[#141414] border border-gray-700 text-white p-4 rounded-xl focus:outline-none focus:border-red-600 text-center text-xl tracking-widest uppercase transition"
                />

                {errorMsg && <p className="text-red-500 text-sm mt-4 font-medium">{errorMsg}</p>}

                <button
                  onClick={verifyVipKey}
                  disabled={isLoadingVip}
                  className="mt-6 bg-red-600 max-w-sm w-full py-4 rounded-xl font-bold text-white text-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isLoadingVip ? "لە پشکنیندایە..." : "چالاککردن"}
                </button>
              </div>
            )}
          </m.div>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default VideoModal;
