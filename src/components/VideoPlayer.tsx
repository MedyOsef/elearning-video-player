/**
 * Composant lecteur vidéo — HTML5 natif avec contrôles custom
 * Sous-titres rendus manuellement en overlay (contourne les restrictions
 * du navigateur sur les blob URL dans les <track> dynamiques)
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import type { Video } from '@/types';
import { useAppStore } from '@/store/appStore';

// Subtitle cue type and inline SRT parser — no external dependency needed
interface ParsedSRT {
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

function parseSRT(srt: string): ParsedSRT[] {
  const cues: ParsedSRT[] = [];
  const timeToSec = (h: string, m: string, s: string, ms: string) =>
    parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
  const blocks = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLine = lines.find(l => l.includes(' --> '));
    if (!timeLine) continue;
    const m = timeLine.match(/(\d+):(\d{2}):(\d{2})[,\.](\d{3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,\.](\d{3})/);
    if (!m) continue;
    const textLines = lines.filter(l => !l.match(/^\d+$/) && !l.includes(' --> ')).join('\n');
    if (!textLines.trim()) continue;
    cues.push({ startTime: timeToSec(m[1],m[2],m[3],m[4]), endTime: timeToSec(m[5],m[6],m[7],m[8]), text: textLines });
  }
  return cues;
}
import { toast } from 'sonner';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, CheckCircle, Type, Eye, EyeOff,
  ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerProps {
  video: Video;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  startTime?: number;
  onNextVideo?: () => void;
  onPreviousVideo?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  formationId: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SUBTITLE_SIZES = [
  { label: 'Petit', value: 'small', px: '14px' },
  { label: 'Moyen', value: 'medium', px: '16px' },
  { label: 'Grand', value: 'large', px: '20px' },
  { label: 'Très grand', value: 'xlarge', px: '24px' },
];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer({
  video,
  onEnded,
  onTimeUpdate,
  autoPlay = true,
  startTime = 0,
  onNextVideo,
  onPreviousVideo,
  hasNext = false,
  hasPrevious = false,
  formationId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const videoUrlRef = useRef<string>('');
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitleSize, setSubtitleSize] = useState('medium');
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  // Subtitles rendered as overlay — avoids browser restrictions on dynamic blob tracks
  const [subtitles, setSubtitles] = useState<ParsedSRT[]>([]);
  const subtitlesRef = useRef<ParsedSRT[]>([]); // mirror for event listener (no stale closure)
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);

  const { markVideoAsCompleted } = useAppStore();

  // Keep subtitlesRef in sync with subtitles state
  useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);

  // ── Build object URLs + parse subtitles when video changes ───────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // Revoke old video URL
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);

    // Reset UI state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setBuffered(0);
    setSubtitles([]);
    setActiveSubtitle(null);

    // Assign new video src directly — no <track> elements needed
    const newVideoUrl = URL.createObjectURL(video.file);
    videoUrlRef.current = newVideoUrl;
    vid.src = newVideoUrl;
    vid.load();

    // Parse SRT into JS objects — rendered as a custom overlay div,
    // which works 100% reliably unlike dynamic <track> blob URLs
    if (video.subtitleFile) {
      video.subtitleFile.text().then(content => {
        const parsed = parseSRT(content);
        setSubtitles(parsed);
      });
    }

    return () => {
      URL.revokeObjectURL(newVideoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video]);

  // ── Video event listeners (stable, attached once) ─────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);

    const onCanPlay = () => {
      setIsLoading(false);
    };

    const onLoadedMetadata = () => {
      setDuration(vid.duration);
      // Apply startTime after metadata loaded
      if (startTime > 0) {
        vid.currentTime = startTime;
      }
      if (autoPlay) {
        vid.play().catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      const t = vid.currentTime;
      setCurrentTime(t);
      onTimeUpdateRef.current?.(t, vid.duration);

      // Update buffered
      if (vid.buffered.length > 0) {
        setBuffered((vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100);
      }

      // Update active subtitle from parsed array (overlay rendering)
      setActiveSubtitle(prev => {
        const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
        const text = found ? found.text : null;
        return text === prev ? prev : text;
      });

      // Mark completed at 90%
      if (vid.duration > 0 && t / vid.duration >= 0.9) {
        markVideoAsCompleted(formationId, video.id);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      markVideoAsCompleted(formationId, video.id);
      onEnded?.();
    };

    const onVolumeChange = () => {
      setVolume(vid.volume);
      setIsMuted(vid.muted);
    };

    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('waiting', onWaiting);
    vid.addEventListener('canplay', onCanPlay);
    vid.addEventListener('loadedmetadata', onLoadedMetadata);
    vid.addEventListener('timeupdate', handleTimeUpdate);
    vid.addEventListener('ended', handleEnded);
    vid.addEventListener('volumechange', onVolumeChange);

    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('waiting', onWaiting);
      vid.removeEventListener('canplay', onCanPlay);
      vid.removeEventListener('loadedmetadata', onLoadedMetadata);
      vid.removeEventListener('timeupdate', handleTimeUpdate);
      vid.removeEventListener('ended', handleEnded);
      vid.removeEventListener('volumechange', onVolumeChange);
    };
  // Only re-attach when truly needed (video id or formation change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, formationId, autoPlay, startTime, onEnded]);

  // ── Fullscreen listener ───────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const vid = videoRef.current;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          vid?.paused ? vid.play().catch(() => {}) : vid?.pause();
          break;
        case 'arrowright':
          e.preventDefault();
          if (vid) vid.currentTime = Math.min(vid.currentTime + (e.shiftKey ? 30 : 10), vid.duration);
          break;
        case 'arrowleft':
          e.preventDefault();
          if (vid) vid.currentTime = Math.max(vid.currentTime - (e.shiftKey ? 30 : 10), 0);
          break;
        case 'arrowup':
          e.preventDefault();
          if (vid) vid.volume = Math.min(vid.volume + 0.1, 1);
          break;
        case 'arrowdown':
          e.preventDefault();
          if (vid) vid.volume = Math.max(vid.volume - 0.1, 0);
          break;
        case 'm':
          e.preventDefault();
          if (vid) vid.muted = !vid.muted;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
        case 'pagedown':
          e.preventDefault();
          onNextVideo?.();
          break;
        case 'p':
        case 'pageup':
          e.preventDefault();
          onPreviousVideo?.();
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNextVideo, onPreviousVideo]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play().catch(() => {}) : vid.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    const bar = progressRef.current;
    if (!vid || !bar || !vid.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.currentTime = ratio * vid.duration;
    setCurrentTime(ratio * vid.duration);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const v = parseFloat(e.target.value);
    vid.volume = v;
    vid.muted = v === 0;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const changePlaybackRate = (rate: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const changeSubtitleSize = (size: string) => {
    setSubtitleSize(size);
  };

  const toggleSubtitles = () => {
    setSubtitlesVisible(v => !v);
    if (!subtitlesVisible) setActiveSubtitle(null); // clear on hide
  };

  const handleMarkCompleted = () => {
    markVideoAsCompleted(formationId, video.id);
    toast.success('Vidéo marquée comme terminée !');
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const subtitleFontSize = SUBTITLE_SIZES.find(s => s.value === subtitleSize)?.px ?? '16px';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => { if (isPlayingRef.current) setShowControls(false); }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
        style={{ cursor: showControls ? 'default' : 'none' }}
      />

      {/* ── Subtitle overlay ── */}
      {subtitlesVisible && activeSubtitle && (
        <div
          className="absolute bottom-[80px] left-0 right-0 flex justify-center pointer-events-none z-30 px-8"
        >
          <p
            className="text-white text-center leading-snug px-3 py-1 rounded"
            dangerouslySetInnerHTML={{ __html: activeSubtitle.replace(/\n/g, '<br/>') }}
            style={{ fontSize: subtitleFontSize, backgroundColor: 'rgba(0,0,0,0.82)' }}
          />
        </div>
      )}

      {/* ── Loading spinner ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#FF0000] animate-spin" />
        </div>
      )}

      {/* ── Top gradient + title + actions ── */}
      <div className={`
        absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-10
        bg-gradient-to-b from-black/80 to-transparent
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-white text-sm font-medium truncate drop-shadow">
            {video.displayName}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mark as completed */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleMarkCompleted}
              className="bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm text-xs h-7"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Marquer terminé
            </Button>

            {/* Subtitle toggle */}
            {subtitles.length > 0 && (
              <Button
                size="icon"
                variant="secondary"
                onClick={toggleSubtitles}
                title={subtitlesVisible ? 'Masquer sous-titres' : 'Afficher sous-titres'}
                className={`bg-black/60 hover:bg-black/80 border-0 backdrop-blur-sm w-7 h-7 ${subtitlesVisible ? 'text-white' : 'text-white/40'}`}
              >
                {subtitlesVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </Button>
            )}

            {/* Subtitle size */}
            {subtitles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="secondary"
                    className="bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm w-7 h-7">
                    <Type className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                  <DropdownMenuLabel className="text-[#AAA] text-xs">Taille des sous-titres</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#333]" />
                  {SUBTITLE_SIZES.map(s => (
                    <DropdownMenuItem key={s.value} onClick={() => changeSubtitleSize(s.value)}
                      className={`text-white hover:bg-[#272727] cursor-pointer ${subtitleSize === s.value ? 'text-[#FF0000]' : ''}`}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Playback speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary"
                  className="bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm text-xs h-7 px-2 gap-1">
                  <Settings className="w-3.5 h-3.5" />
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                <DropdownMenuLabel className="text-[#AAA] text-xs">Vitesse de lecture</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {PLAYBACK_RATES.map(r => (
                  <DropdownMenuItem key={r} onClick={() => changePlaybackRate(r)}
                    className={`text-white hover:bg-[#272727] cursor-pointer ${playbackRate === r ? 'text-[#FF0000]' : ''}`}>
                    {r === 1 ? 'Normal' : `${r}x`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div className={`
        absolute bottom-0 left-0 right-0 z-20 px-4 pt-10 pb-4
        bg-gradient-to-t from-black/90 to-transparent
        transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        {/* ── Progress bar ── */}
        <div
          ref={progressRef}
          className="relative h-1 hover:h-2 cursor-pointer mb-4 rounded-full bg-white/25 transition-all duration-150 group/bar"
          onClick={seek}
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
            style={{ width: `${buffered}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 bg-[#FF0000] rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FF0000] border-2 border-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* ── Controls row ── */}
        <div className="flex items-center gap-1">
          {/* Prev video */}
          <button
            onClick={onPreviousVideo}
            disabled={!hasPrevious}
            className="text-white/80 hover:text-white disabled:opacity-30 transition-colors p-1.5 rounded hover:bg-white/10"
            title="Vidéo précédente (P)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Seek -10s */}
          <button
            onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
            title="Reculer 10s (←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-[#FF0000] transition-colors p-1.5 rounded hover:bg-white/10"
            title={isPlaying ? 'Pause (K)' : 'Lecture (K)'}
          >
            {isPlaying
              ? <Pause className="w-6 h-6" fill="currentColor" />
              : <Play className="w-6 h-6" fill="currentColor" />
            }
          </button>

          {/* Seek +10s */}
          <button
            onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); }}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
            title="Avancer 10s (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Next video */}
          <button
            onClick={onNextVideo}
            disabled={!hasNext}
            className="text-white/80 hover:text-white disabled:opacity-30 transition-colors p-1.5 rounded hover:bg-white/10"
            title="Vidéo suivante (N)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol ml-1">
            <button
              onClick={toggleMute}
              className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
            >
              {isMuted || volume === 0
                ? <VolumeX className="w-4 h-4" />
                : <Volume2 className="w-4 h-4" />
              }
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 accent-[#FF0000] cursor-pointer h-1"
            />
          </div>

          {/* Time display */}
          <span className="text-white/70 text-xs tabular-nums ml-2 select-none whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
            title="Plein écran (F)"
          >
            {isFullscreen
              ? <Minimize className="w-5 h-5" />
              : <Maximize className="w-5 h-5" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}