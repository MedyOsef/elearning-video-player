/**
 * Hook personnalisé pour gérer le lecteur vidéo
 * Gère la lecture, la progression, les sous-titres, etc.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Video } from '@/types';
import { convertSRTtoWebVTT, createVTTBlobUrl } from '@/utils/srtParser';

interface UseVideoPlayerOptions {
  video: Video;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  startTime?: number;
}

interface UseVideoPlayerReturn {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  
  // État
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  playbackRate: number;
  showControls: boolean;
  subtitleUrl: string | null;
  
  // Actions
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  setPlaybackRate: (rate: number) => void;
  showControlsTemporarily: () => void;
}

export function useVideoPlayer({
  video,
  onEnded,
  onTimeUpdate,
  autoPlay = false,
  startTime = 0
}: UseVideoPlayerOptions): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // État
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  
  // Timer pour cacher les contrôles
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Charger les sous-titres
  useEffect(() => {
    if (video.subtitleFile) {
      video.subtitleFile.text().then(content => {
        const vttContent = convertSRTtoWebVTT(content);
        const url = createVTTBlobUrl(vttContent);
        setSubtitleUrl(url);
      });
    } else {
      setSubtitleUrl(null);
    }
    
    return () => {
      if (subtitleUrl) {
        URL.revokeObjectURL(subtitleUrl);
      }
    };
  }, [video.subtitleFile]);
  
  // Gérer le démarrage automatique
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay bloqué par le navigateur
        setIsPlaying(false);
      });
    }
  }, [autoPlay]);
  
  // Gérer le temps de départ
  useEffect(() => {
    if (videoRef.current && startTime > 0) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  }, [startTime]);
  
  // Écouter les événements fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Actions
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPlaying]);
  
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);
  
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);
  
  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  }, [duration]);
  
  const seekForward = useCallback((seconds = 10) => {
    seek(currentTime + seconds);
  }, [currentTime, seek]);
  
  const seekBackward = useCallback((seconds = 10) => {
    seek(currentTime - seconds);
  }, [currentTime, seek]);
  
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume;
    }
    setVolumeState(clampedVolume);
    if (clampedVolume > 0) {
      setIsMuted(false);
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);
  
  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);
  
  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRateState(rate);
    }
  }, []);
  
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);
  
  // Gestionnaires d'événements vidéo
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      onTimeUpdate?.(videoElement.currentTime, videoElement.duration);
    };
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
      setIsLoading(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handleVolumeChange = () => {
      setVolumeState(videoElement.volume);
      setIsMuted(videoElement.muted);
    };
    
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [onTimeUpdate, onEnded]);
  
  return {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    isLoading,
    playbackRate,
    showControls,
    subtitleUrl,
    togglePlay,
    play,
    pause,
    seek,
    seekForward,
    seekBackward,
    setVolume,
    toggleMute,
    toggleFullscreen,
    setPlaybackRate,
    showControlsTemporarily
  };
}
