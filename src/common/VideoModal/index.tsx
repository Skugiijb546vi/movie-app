import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { IoMdClose, IoMdSettings } from "react-icons/io";

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

const VideoModal = () => {
  const { videoId: movieData, closeModal, isModalOpen } = useGlobalContext();
  const { zoomIn } = useMotion();

  const [keyInput, setKeyInput] = useState("");
  const [isVipVerified, setIsVipVerified] = useState(false);
  const [isLoadingVip, setIsLoadingVip] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [fbData, setFbData] = useState(null);
  const [isFetchingVideo, setIsFetchingVideo] = useState(true);
  const [localSubtitle, setLocalSubtitle] = useState("");

  // ڕێکخستنەکانی ژێرنووس
  const [showSettings, setShowSettings] = useState(false);
  const [subSize, setSubSize] = useState("100"); // سەدی
  const [subColor, setSubColor] = useState("#ffffff");
  const [subBg, setSubBg] = useState("rgba(0,0,0,0.75)");

  const { ref: modalRef } = useOnClickOutside({
    action: closeModal,
    enable: isModalOpen,
  });

  useOnKeyPress({
    key: "Escape",
    action: closeModal,
    enable: isModalOpen
  });

  useEffect(() => {
    if (isModalOpen && movieData?.id) {
      setIsFetchingVideo(true);
      setFbData(null);
      setLocalSubtitle("");
      setIsVipVerified(false);
      setErrorMsg("");

      const videoRef = ref(db, `np/${movieData.id}`);
      get(videoRef).then((snapshot) => {
        if (snapshot.exists()) {
          setFbData(snapshot.val());
        }
        setIsFetchingVideo(false);
      }).catch(() => {
        setIsFetchingVideo(false);
      });
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
      fetch(subUrl)
        .then((res) => res.text())
        .then((text) => {
          const blob = new Blob([text], { type: "text/vtt" });
          setLocalSubtitle(URL.createObjectURL(blob));
        })
        .catch(() => {});
    }
  }, [fbData]);

  // سیستەمی نوێی VIP بۆ کلیلەکان
  const verifyVipKey = async () => {
    if (!keyInput.trim()) {
      setErrorMsg("تکایە کلیلەکە داخڵ بکە!");
      return;
    }
    setIsLoadingVip(true);
    setErrorMsg("");
    try {
      const keyRef = ref(db, `activation_keys/${keyInput}`);
      const snapshot = await get(keyRef);
      if (snapshot.exists()) {
        const keyData = snapshot.val();
        const now = Date.now();

        // ١. پشکنینی کاتی بەسەرچوون (ئەگەر دانرابێت)
        if (keyData.expiry_date && now > keyData.expiry_date) {
          setErrorMsg("ببورە، کاتی ئەم کلیلە بەسەرچووە!");
          setIsLoadingVip(false);
          return;
        }

        // ٢. دروستکردن یان هێنانی ئایدی مۆبایلەکە
        let deviceId = localStorage.getItem("sebar_device_id");
        if (!deviceId) {
          deviceId = "dev_" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("sebar_device_id", deviceId);
        }

        // ٣. پشکنینی بەکارهێنان
        if (keyData.used === false) {
          // یەکەم جارە بەکاردێت، بۆیە لای خۆمان تۆماری دەکەین
          await update(keyRef, { used: true, device_id: deviceId });
          setIsVipVerified(true);
        } else if (keyData.device_id === deviceId) {
          // پێشتر بەکارهاتووە، بەڵام هەر لەلایەن هەمان کەسەوەیە
          setIsVipVerified(true);
        } else {
          setErrorMsg("ئەم کلیلە پێشتر لەلایەن کەسێکی ترەوە چالاک کراوە!");
        }
      } else {
        setErrorMsg("ئەم کلیلە بوونی نییە یان هەڵەیە!");
      }
    } catch (error) {
      setErrorMsg("کێشەیەک ڕوویدا لە پەیوەندیکردن بە سێرڤەر.");
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
        <Overlay className="flex items-center justify-center backdrop-blur-sm">
          {/* ستایلی تایبەت بە ژێرنووسەکان بۆ ئەوەی بە دڵی بەکارهێنەر بگۆڕێت */}
          <style>
            {`
              video::cue {
                font-size: ${subSize}%;
                color: ${subColor};
                background-color: ${subBg};
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
              }
            `}
          </style>

          <m.div
            variants={zoomIn(0.9, 0.3)}
            initial="hidden"
            animate="show"
            exit="hidden"
            ref={modalRef}
            className="md:w-[850px] md:h-[500px] sm:w-[95vw] sm:h-[65vh] w-[95vw] xs:h-[45vh] h-[50vh] dark:bg-gray-900 bg-black z-[25] shadow-2xl shadow-red-900/40 rounded-xl relative overflow-hidden flex flex-col"
          >
            {/* دوگمەی داخستن */}
            <button
              type="button"
              className="absolute -right-0 -top-0 bg-red-600 hover:bg-red-700 p-2 text-white z-50 rounded-bl-xl transition shadow-lg"
              onClick={closeModal}
            >
              <IoMdClose size={24} />
            </button>

            {isFetchingVideo ? (
              <div className="flex items-center justify-center h-full w-full bg-[#111]">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-300 font-semibold">ئامادەکردنی فیلمەکە...</p>
                </div>
              </div>
            ) : !videoUrl ? (
              <div className="flex flex-col items-center justify-center h-full w-full bg-[#111]">
                <span className="text-red-500 text-6xl mb-4">⚠️</span>
                <p className="text-gray-200 text-xl font-bold">ببورە، لینکی فیلمەکە نەدۆزرایەوە!</p>
              </div>
            ) : canPlayVideo ? (
              <div className="w-full h-full relative group bg-black">
                {/* دوگمەی ڕێکخستنی ژێرنووس */}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="absolute top-4 left-4 z-40 bg-black/60 p-2 rounded-full text-white hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                >
                  <IoMdSettings size={22} />
                </button>

                {/* مێنیوی ڕێکخستنی ژێرنووس */}
                {showSettings && (
                  <div className="absolute top-14 left-4 z-50 bg-gray-900/95 border border-gray-700 p-4 rounded-xl shadow-2xl w-64 text-right">
                    <h3 className="text-white font-bold mb-3 border-b border-gray-700 pb-2">ڕێکخستنی ژێرنووس</h3>
                    
                    <div className="mb-3">
                      <label className="text-gray-300 text-sm block mb-1">قەبارەی دەق</label>
                      <input type="range" min="50" max="200" value={subSize} onChange={(e) => setSubSize(e.target.value)} className="w-full accent-red-600" />
                    </div>

                    <div className="mb-3">
                      <label className="text-gray-300 text-sm block mb-2">ڕەنگی دەق</label>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setSubColor("#ffffff")} className="w-6 h-6 rounded-full bg-white border border-gray-500"></button>
                        <button onClick={() => setSubColor("#facc15")} className="w-6 h-6 rounded-full bg-yellow-400"></button>
                        <button onClick={() => setSubColor("#38bdf8")} className="w-6 h-6 rounded-full bg-sky-400"></button>
                        <button onClick={() => setSubColor("#4ade80")} className="w-6 h-6 rounded-full bg-green-400"></button>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-300 text-sm block mb-2">باگراوەند</label>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setSubBg("transparent")} className="w-6 h-6 rounded-full bg-transparent border-2 border-red-500 text-white text-xs flex items-center justify-center">X</button>
                        <button onClick={() => setSubBg("rgba(0,0,0,0.5)")} className="w-6 h-6 rounded-full bg-black/50 border border-gray-500"></button>
                        <button onClick={() => setSubBg("rgba(0,0,0,0.9)")} className="w-6 h-6 rounded-full bg-black"></button>
                        <button onClick={() => setSubBg("rgba(220,38,38,0.7)")} className="w-6 h-6 rounded-full bg-red-600/70"></button>
                      </div>
                    </div>
                  </div>
                )}

                {/* controlsList="nodownload" بۆ لابردنی دوگمەی داونلۆد دانراوە */}
                <video
                  key={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  controlsList="nodownload" 
                  className="w-full h-full object-contain outline-none"
                  poster={posterImage?.startsWith("http") ? posterImage : `https://image.tmdb.org/t/p/original/${posterImage}`}
                >
                  <source src={videoUrl} type="video/mp4" />
                  
                  {fbData?.hasSubtitle && localSubtitle && (
                    <track
                      label="کوردی"
                      kind="subtitles"
                      srcLang="ku"
                      src={localSubtitle}
                      default
                    />
                  )}
                  براوزەرەکەت پشتگیری ڤیدیۆ ناکات.
                </video>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-gray-900 to-black relative z-40">
                <div className="w-20 h-20 bg-gradient-to-tr from-yellow-600 to-yellow-400 text-black rounded-full flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-3 tracking-wide">فیلمی <span className="text-yellow-400">VIP</span></h2>
                <p className="text-gray-400 text-sm mb-8 max-w-sm">ئەم فیلمە تەنها بۆ بەکارهێنەرانی پریمیۆمە. تکایە کلیلی چالاککردن داخڵ بکە بۆ سەیرکردن.</p>

                <div className="w-full max-w-md relative">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="کلیلەکەت لێرە بنووسە..."
                    className="w-full bg-gray-800/50 border border-gray-600 text-white p-4 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-center text-xl font-mono uppercase transition"
                  />
                </div>

                {errorMsg && <m.p initial={{opacity: 0, y: -10}} animate={{opacity: 1, y: 0}} className="text-red-400 text-sm mt-3 font-semibold bg-red-400/10 py-1 px-3 rounded-lg">{errorMsg}</m.p>}

                <button
                  onClick={verifyVipKey}
                  disabled={isLoadingVip}
                  className="mt-6 bg-gradient-to-r from-red-600 to-red-700 max-w-md w-full py-4 rounded-xl font-bold text-white text-lg hover:from-red-500 hover:to-red-600 transition shadow-lg shadow-red-900/50 disabled:opacity-50"
                >
                  {isLoadingVip ? "لە پشکنیندایە..." : "چالاککردن و سەیرکردن"}
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
