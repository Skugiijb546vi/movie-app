import { useEffect, useState, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { IoMdClose, IoMdSettings, IoMdPlay, IoMdPause, IoMdExpand } from "react-icons/io";
import { FaTelegramPlane, FaAward } from "react-icons/fa";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

import Overlay from "../Overlay";
import { useGlobalContext } from "@/context/globalContext";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useMotion } from "@/hooks/useMotion";
import { useOnKeyPress } from "@/hooks/useOnKeyPress";

// هاوردەکردنی hls.js بۆ پشتگیریکردنی لایڤ لەسەر هەموو وێبگەڕەکان
import Hls from "hls.js";

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

  const [keyInput, setKeyInput] = useState("");
  const [isVipVerified, setIsVipVerified] = useState(false);
  const [isLoadingVip, setIsLoadingVip] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [fbData, setFbData] = useState(null);
  const [isFetchingVideo, setIsFetchingVideo] = useState(true);
  const [localSubtitle, setLocalSubtitle] = useState("");

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [subSize, setSubSize] = useState("100");
  const [subColor, setSubColor] = useState("#ffffff");
  const [subBg, setSubBg] = useState("rgba(0,0,0,0.75)");

  // 🛠️ لێرەدا کێشەی وۆرکەرەکەمان چارەسەر کردووە بەبێ تێکدانی لینکەکانی ترت
  const rawUrl = fbData?.url || fbData?.video_url || "";
  const WORKER_URL = "https://videoproxy.sarkotiktok36.workers.dev/?url=";
  
  const videoUrl = rawUrl 
    ? (rawUrl.includes(".m3u8") ? rawUrl : `${WORKER_URL}${encodeURIComponent(rawUrl)}`)
    : "";

  const posterImage = fbData?.image || movieData?.poster_path || "";

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

  // ⚡ دوگمەی کوژانەوە (Kill Switch) + بەڕێوببردنی HLS لە پشتەوە
  useEffect(() => {
    const videoEl = videoRef.current;
    let hls;

    if (videoEl && videoUrl) {
      if (videoUrl.includes(".m3u8")) {
        if (Hls.isSupported()) {
          hls = new Hls({ maxMaxBufferLength: 30 });
          hls.loadSource(videoUrl);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isPlaying && isModalOpen) videoEl.play().catch(() => {});
          });
        } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          videoEl.src = videoUrl;
        }
      } else {
        // ئەگەر لینکی ئاسایی بوو وەک MP4، ڕاستەوخۆ src بەکاردێنێت وەک پێشتر
        videoEl.src = videoUrl;
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (videoEl) {
        videoEl.pause(); 
        videoEl.removeAttribute("src"); 
        videoEl.load(); 
      }
    };
  }, [videoUrl, isModalOpen]);

  useEffect(() => {
    if (isModalOpen && movieData?.id !== undefined) {
      setIsFetchingVideo(true);
      setFbData(null);
      setLocalSubtitle("");
      setIsVipVerified(false);
      setErrorMsg("");
      setCurrentTime(0); 
      setDuration(0);
      setIsBuffering(true);
      setIsPlaying(true);

      const videoRefFb = ref(db, `np/${movieData.id}`);
      get(videoRefFb).then((snapshot) => {
        if (snapshot.exists()) setFbData(snapshot.val());
        setIsFetchingVideo(false);
      }).catch(() => setIsFetchingVideo(false));
    } else {
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    }
  }, [isModalOpen, movieData]);

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

  useEffect(() => {
    const subUrl = fbData?.subtitleKurdish || fbData?.subtitle_url || "";
    if (subUrl) {
      const finalUrl = subUrl.startsWith("http") ? subUrl : `https://${subUrl}`;
      fetch(finalUrl)
        .then((res) => res.text())
        .then((text) => {
          const cleanText = text.replace(/^\uFEFF/, "").trimStart();
          const blob = new Blob([cleanText], { type: "text/vtt" });
          setLocalSubtitle(URL.createObjectURL(blob));
        })
        .catch((err) => console.log("Subtitle Fetch Error:", err));
    }
  }, [fbData]);

  const handleToggleControls = (e) => {
    e.stopPropagation();
    setShowControls(!showControls);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
    }
  };

  const skipTime = (e, amount) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullScreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        if (window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock("landscape").catch(() => {});
        }
      }).catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

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
                <p className="text-gray-300 font-semibold text-lg animate-pulse">لە کردنەوە داین...</p>
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
                onClick={handleToggleControls}
              >
                {/* پلەیەرەکە وەک خۆیەتی و هیچ گۆڕانکاریەکی تێدا نەکراوە بۆ ئەوەی شێوازەکەی تێک نەچێت */}
                <video
                  ref={videoRef}
                  key={videoUrl}
                  autoPlay
                  playsInline
                  controlsList="nodownload" 
                  onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                  onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
                  onPause={() => setIsPlaying(false)}
                  onWaiting={() => setIsBuffering(true)}
                  className="w-full h-full object-contain outline-none cursor-pointer"
                  poster={posterImage?.startsWith("http") ? posterImage : `https://image.tmdb.org/t/p/original/${posterImage}`}
                >
                  {(fbData?.hasSubtitle || fbData?.hasKurdishSub) && localSubtitle && (
                    <track label="کوردی" kind="subtitles" srcLang="ku" src={localSubtitle} default />
                  )}
                </video>

                <div className={`absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}></div>

                <div className={`absolute inset-0 flex flex-col justify-between p-4 sm:p-6 transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}>
                  
                  <div className="flex items-center justify-between z-40">
                    <button onClick={(e) => { e.stopPropagation(); closeModal(); }} className="bg-white/10 hover:bg-red-600 backdrop-blur-md p-2 rounded-full text-white transition">
                      <IoMdClose size={24} />
                    </button>
                    <h2 className="text-white font-bold text-lg drop-shadow-md truncate max-w-[70%]">{fbData?.title || movieData?.title}</h2>
                    <div className="w-10"></div> 
                  </div>

                  {isBuffering && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
                      <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 sm:gap-12 z-40">
                    <button onClick={(e) => skipTime(e, -10)} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-white backdrop-blur-sm transition">
                      <span className="text-xs sm:text-sm font-bold">-10</span>
                    </button>
                    
                    <button onClick={togglePlay} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-500 border-2 border-red-400/50 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.6)] transition transform hover:scale-105">
                      {isPlaying ? <IoMdPause size={36} /> : <IoMdPlay size={36} className="ml-1" />}
                    </button>

                    <button onClick={(e) => skipTime(e, 10)} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex flex-col items-center justify-center text-white backdrop-blur-sm transition">
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
                        <button onClick={toggleFullScreen} className="text-white hover:text-red-500 transition">
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
                        background: `linear-gradient(to right, #ff0000 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`
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
              <div className="flex flex-col items-center justify-center h-full p-4 w-full bg-black/85 relative">
                <div className="bg-gradient-to-b from-[#3a0606] to-[#1a0202] border-[2.5px] border-[#FFD700] rounded-[2rem] p-6 sm:p-8 w-full max-w-[420px] flex flex-col items-center shadow-[0_0_35px_rgba(255,215,0,0.25)] relative z-10">
                  
                  <div className="mb-4 text-[#FFD700] drop-shadow-[0_0_18px_rgba(255,215,0,0.9)]">
                    <FaAward size={75} />
                  </div>

                  <h2 className="text-white text-xl sm:text-2xl font-bold mb-3 text-center leading-relaxed drop-shadow-md">
                    بۆ بینی ئەم فلمە تکایە سەرەتا تکتێکی سینەما بکڕە
                  </h2>
                  
                  <p className="text-gray-400 text-xs sm:text-sm mb-6 text-center">
                    VIP تەنها خاوەن تکتەکان دەتوانن سەیری ناوەڕۆکی بکەن.
                  </p>

                  <div className="w-full mb-4">
                    <input
                      type="text"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="...کلیلەکە لێرە بنووسە"
                      className="w-full bg-[#170202] border border-[#8a1414] text-[#FFD700] placeholder-gray-500 p-4 rounded-xl focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] text-right text-sm transition shadow-inner"
                      dir="rtl"
                    />
                  </div>

                  {errorMsg && <p className="text-red-400 text-sm mb-4 text-center font-medium bg-red-900/30 py-2 px-3 rounded-lg w-full border border-red-800/50">{errorMsg}</p>}

                  <button
                    onClick={verifyVipKey}
                    disabled={isLoadingVip}
                    className="w-full bg-gradient-to-r from-[#22c55e] to-[#15803d] hover:from-[#16a34a] hover:to-[#14532d] text-white font-bold py-3.5 rounded-xl mb-3 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.35)]"
                  >
                    {isLoadingVip ? (
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-lg">✨ چالاککردنی کلیل</span>
                    )}
                  </button>

                  <a
                    href="https://t.me/sarkoakram"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-[#FDE047] via-[#EAB308] to-[#CA8A04] hover:brightness-110 text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition mb-4 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  >
                    <span className="text-lg">داواکردنی کلیل (تێلیگرام) ➤</span>
                  </a>

                  <button onClick={closeModal} className="text-gray-400 hover:text-white text-sm transition mt-1 font-medium">
                    داخستن
                  </button>
                </div>
              </div>
            )}
          </m.div>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default VideoModal;
