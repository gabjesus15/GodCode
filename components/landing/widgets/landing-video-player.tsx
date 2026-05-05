"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

interface LandingVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitle?: string;
}

export function LandingVideoPlayer({
  src,
  poster,
  title = "Video demo del producto",
  subtitle = "Versión de demo privada disponible para reuniones comerciales y partners.",
}: LandingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(
        (videoRef.current.currentTime / videoRef.current.duration) * 100 || 0
      );
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nextProgress = Number(e.target.value);
    setProgress(nextProgress);

    if (!videoRef.current || !Number.isFinite(videoRef.current.duration) || videoRef.current.duration <= 0) {
      return;
    }

    videoRef.current.currentTime = (nextProgress / 100) * videoRef.current.duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nextVolume = Number(e.target.value);
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }

      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen permission failures.
    }
  };

  const handlePlayEnded = () => {
    setIsPlaying(false);
    setIsBuffering(false);
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-inner"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.35),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]" />

      {/* Video */}
      <video
        ref={videoRef}
        className="relative z-10 h-full w-full object-cover"
        src={src}
        poster={poster}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onStalled={() => setIsBuffering(true)}
        onSeeking={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onSeeked={() => setIsBuffering(false)}
        onEnded={handlePlayEnded}
        playsInline
        onClick={togglePlay}
      />

      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center bg-black/25">
          <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 text-xs text-slate-100 ring-1 ring-white/10">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-indigo-300" aria-hidden />
            Cargando video...
          </div>
        </div>
      )}

      {/* Overlay when not playing */}
      {!isPlaying && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20 px-6 text-center transition-opacity"
          onClick={togglePlay}
        >
          <button
            onClick={togglePlay}
            className="mb-6 flex h-18 w-18 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-200 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/20 hover:text-indigo-100"
            aria-label="Reproducir video"
          >
            <Play className="h-7 w-7 fill-current" />
          </button>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
            {subtitle}
          </p>
        </div>
      )}

      {/* Controls (visible when playing or hovering) */}
      {isPlaying && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-200 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Progress Bar */}
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={handleSeekChange}
            onClick={(e) => e.stopPropagation()}
            aria-label="Barra de progreso del video"
            disabled={duration <= 0}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="rounded p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="rounded p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={isMuted ? "Activar volumen" : "Silenciar"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                aria-label="Ajustar volumen"
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-indigo-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="rounded p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
