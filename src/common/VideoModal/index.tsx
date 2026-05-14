import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { IoMdClose } from "react-icons/io";

// هێنانی فایەربەیس بۆ پشکنینی کلیلەکان
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";

import Overlay from "../Overlay";
import { useGlobalContext } from "@/context/globalContext";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useMotion } from "@/hooks/useMotion";
import { useOnKeyPress } from "@/hooks/useOnKeyPress";

// زانیارییەکانی فایەربەیسەکەی خۆت
const firebaseConfig = {
  apiKey: "AIzaSyAn-U4aTP5LwHf9cIOdPAXp4fCMzYyrDV8",
  authDomain: "sebartv-efccb.firebaseapp.com",
  databaseURL: "https://sebartv-efccb-default-rtdb.firebaseio.com",
  projectId: "sebartv-efccb",
  storageBucket: "sebartv-efccb.firebasestorage.app",
  messagingSenderId: "18058839830",
  appId: "1:18058839830:web:2f4bd640d4d89c5eb77237",
};

// کارپێکردنی فایەربەیس
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const VideoModal = () => {
  const { videoId: movieData, closeModal, isModalOpen } = useGlobalContext();
  const { zoomIn } = useMotion();
  
  const [keyInput, setKeyInput] = useState("");
  const [isVipVerified, setIsVipVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    if (!isModalOpen) {
      setIsVipVerified(false);
      setKeyInput("");
      setErrorMsg("");
    }
  }, [isModalOpen]);

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

  const verifyVipKey = async () => {
    if (!keyInput.trim()) {
      setErrorMsg("تکایە کلیلەکە داخڵ بکە!");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const keyRef = ref(db, `activation_keys/${keyInput}`);
      const snapshot = await get(keyRef);

      if (snapshot.exists()) {
        const keyData = snapshot.val();
        if (keyData.used === false) {
          await update(keyRef, { used: true });
          setIsVipVerified(true);
        } else {
          setErrorMsg("ببورە، ئەم کلیلە پێشتر بەکارهاتووە.");
        }
      } else {
        setErrorMsg("ئەم کلیلە بوونی نییە یان هەڵەیە!");
      }
    } catch (error) {
      setErrorMsg("کێشەیەک ڕوویدا لە پەیوەندیکردن بە سێرڤەر.");
    } finally {
      setIsLoading(false);
    }
  };

  const isVip = movieData?.badge_text === "VIP";
  const canPlayVideo = !isVip || isVipVerified;
  
  const videoUrl = movieData?.url || movieData?.video_url || "";
  const subtitleUrl = movieData?.subtitleKurdish || movieData?.subtitle_url || "";
  const posterImage = movieData?.image || movieData?.poster_path || "";

  return (
    <AnimatePresence>
      {isModalOpen && (
        <Overlay className="flex items-center justify-center backdrop-blur-sm">
          <m.div
            variants={zoomIn(0.9, 0.3)}
            initial="hidden"
            animate="show"
            exit="hidden"
            ref={modalRef}
            className="md:w-[800px] md:h-[450px] sm:w-[90vw] sm:h-[60vh] w-[95vw] xs:h-[40vh] h-[45vh] dark:bg-gray-900 bg-mainColor z-[25] shadow-2xl shadow-red-900/20 rounded-xl relative overflow-hidden flex flex-col"
          >
            <button
              type="button"
              className="absolute -right-0 -top-0 bg-red-600 hover:bg-red-700 p-2 text-white z-50 rounded-bl-xl transition"
              onClick={closeModal}
            >
              <IoMdClose size={24} />
            </button>

            {canPlayVideo ? (
              // لێرەدا چارەسەری کێشەی safetensors کرا
              <video
                key={videoUrl}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full bg-black object-contain outline-none"
                poster={posterImage?.startsWith("http") ? posterImage : `https://image.tmdb.org/t/p/original/${posterImage}`}
              >
                {/* ئەم هێڵە بە براوزەرەکە دەڵێت ئەمە ڤیدیۆی MP4ە گوێ بە ناوەکەی مەدە */}
                <source src={videoUrl} type="video/mp4" />
                
                {movieData?.hasSubtitle && subtitleUrl && (
                  <track
                    label="کوردی"
                    kind="subtitles"
                    srcLang="ku"
                    src={subtitleUrl}
                    default
                  />
                )}
                براوزەرەکەت پشتگیری ڤیدیۆ ناکات.
              </video>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">فیلمی VIP</h2>
                <p className="text-gray-400 text-sm mb-6">بۆ سەیرکردنی ئەم فیلمە پێویستت بە کلیلی چالاککردنە.</p>
                
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="کلیلەکە لێرە بنووسە..."
                  className="w-full max-w-sm bg-gray-800 border border-gray-700 text-white p-3 mb-2 rounded-lg focus:outline-none focus:border-red-500 text-center text-lg uppercase transition"
                />
                
                {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}
                
                <button
                  onClick={verifyVipKey}
                  disabled={isLoading}
                  className="mt-4 bg-red-600 max-w-sm w-full py-3 rounded-lg font-bold text-white hover:bg-red-700 transition disabled:opacity-50 shadow-lg"
                >
                  {isLoading ? "چاوەڕێ بە..." : "سەلماندن و سەیرکردن"}
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
