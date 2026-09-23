"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SHOW_INTRO_MODE, type ShowIntroMode } from "@/lib/intro-config";

const INTRO_SESSION_KEY = "trinity-intro-session-seen";
const INTRO_STORAGE_KEY = "trinity-intro-seen";

function shouldShowIntro(mode: ShowIntroMode): boolean {
  if (mode === "every-visit") {
    return true;
  }

  if (typeof window === "undefined") {
    return true;
  }

  if (mode === "session") {
    return !sessionStorage.getItem(INTRO_SESSION_KEY);
  }

  if (mode === "first") {
    return !localStorage.getItem(INTRO_STORAGE_KEY);
  }

  return true;
}

function markIntroSeen(mode: ShowIntroMode) {
  if (typeof window === "undefined") {
    return;
  }

  if (mode === "session") {
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  }

  if (mode === "first") {
    localStorage.setItem(INTRO_STORAGE_KEY, "1");
  }
}

export function VideoIntroOverlay() {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollYRef = useRef(0);

  const [show, setShow] = useState(!isAdminRoute);
  const [closing, setClosing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (isAdminRoute) {
      setShow(false);
      return;
    }

    const shouldDisplay = shouldShowIntro(SHOW_INTRO_MODE);
    setShow(shouldDisplay);

    if (!shouldDisplay) {
      return;
    }
  }, [isAdminRoute]);

  const lockBodyScroll = useCallback(() => {
    scrollYRef.current = window.scrollY || window.pageYOffset || 0;

    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }, []);

  const unlockBodyScroll = useCallback(() => {
    const body = document.body;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.width = "";
    body.style.overflow = "";

    window.scrollTo({ top: scrollYRef.current, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!show || isAdminRoute) {
      if (isAdminRoute) {
        unlockBodyScroll();
      }

      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isAdminRoute, lockBodyScroll, unlockBodyScroll, show]);

  const handleStart = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      console.log("intro: no video element");
      return;
    }

    console.log("intro: try play", { muted: video.muted, paused: video.paused, src: video.currentSrc || video.src });

    try {
      setStarted(true);
      setHasError(false);
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      video.playsInline = true;
      await video.play();
      console.log("intro: play resolved", { paused: video.paused, muted: video.muted, readyState: video.readyState });
    } catch (error) {
      console.log("intro: play failed", error);
      setHasError(true);
      setStarted(false);
      try {
        video.pause();
      } catch {
        // browser may reject video.pause when not ready
      }
    }
  }, []);

  const finishIntro = useCallback(() => {
    if (!show) {
      return;
    }

    markIntroSeen(SHOW_INTRO_MODE);
    setClosing(true);
    window.setTimeout(() => {
      setShow(false);
      unlockBodyScroll();
    }, 420);
  }, [show, unlockBodyScroll]);

  if (isAdminRoute || !show) {
    return null;
  }

  return (
    <div className={`video-intro-overlay ${closing ? "video-intro-overlay-closing" : ""}`.trim()} role="dialog" aria-modal="true" aria-label="Trinity introduction video">
      <video
        ref={videoRef}
        className="video-intro-video"
        src="/video/Hero_Vid.mp4"
        playsInline
        preload="auto"
        loop={false}
        onEnded={finishIntro}
        onError={() => setHasError(true)}
      />

      <div className="video-intro-scrim" aria-hidden="true" />

      {!started && (
        <button
          type="button"
          className="video-intro-play"
          aria-label="Start the Trinity introduction video"
          onClick={handleStart}
        >
          <img src="/images/Asset 1.png" className="video-intro-cross" alt="" aria-hidden="true" />
          <span className="video-intro-click-label">CLICK HERE</span>
        </button>
      )}

      {hasError && <span className="video-intro-error" aria-live="polite">Video unavailable</span>}
    </div>
  );
}
