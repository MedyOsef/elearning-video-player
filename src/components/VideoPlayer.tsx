/**
 * Composant lecteur vidéo avec Plyr
 * Gestion robuste des URLs et des sous-titres
 */
import { useRef, useEffect, useState } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import type { Video } from '@/types';
import { convertSRTtoWebVTT } from '@/utils/srtParser';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';
import { CheckCircle, Type, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

// Tailles de police des sous-titres
const SUBTITLE_SIZES = [
  { label: 'Petit', value: 'small' },
  { label: 'Moyen', value: 'medium' },
  { label: 'Grand', value: 'large' },
  { label: 'Très grand', value: 'xlarge' },
];

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
  const playerRef = useRef<Plyr | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // URLs stockées pour éviter les recréations
  const videoUrlRef = useRef<string>('');
  const subtitleUrlRef = useRef<string>('');
  
  // États
  const [isReady, setIsReady] = useState(false);
  const [subtitleSize, setSubtitleSize] = useState('medium');
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  
  const { markVideoAsCompleted } = useAppStore();

  // Créer les URLs une seule fois quand la vidéo change
  useEffect(() => {
    // Révoquer les anciennes URLs
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    if (subtitleUrlRef.current) {
      URL.revokeObjectURL(subtitleUrlRef.current);
    }
    
    // Créer nouvelle URL vidéo
    videoUrlRef.current = URL.createObjectURL(video.file);
    
    // Créer URL sous-titres si disponible
    if (video.subtitleFile) {
      video.subtitleFile.text().then(content => {
        const vttContent = convertSRTtoWebVTT(content);
        subtitleUrlRef.current = URL.createObjectURL(
          new Blob([vttContent], { type: 'text/vtt' })
        );
        setIsReady(false);
        setTimeout(() => setIsReady(true), 50);
      });
    } else {
      subtitleUrlRef.current = '';
      setIsReady(true);
    }
    
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
      if (subtitleUrlRef.current) {
        URL.revokeObjectURL(subtitleUrlRef.current);
      }
    };
  }, [video]);

  // Initialiser Plyr
  useEffect(() => {
    if (!videoRef.current || !isReady) return;
    
    // Détruire l'ancien player s'il existe
    if (playerRef.current) {
      playerRef.current.destroy();
    }
    
    // Configurer Plyr
    playerRef.current = new Plyr(videoRef.current, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen',
      ],
      settings: ['captions', 'quality', 'speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: true },
      tooltips: { controls: true, seek: true },
      iconPrefix: 'plyr',
      iconUrl: '',
      blankVideo: '',
      autoplay: autoPlay,
      invertTime: false,
      toggleInvert: true,
      clickToPlay: true,
      hideControls: true,
      resetOnEnd: false,
      disableContextMenu: true,
      loadSprite: false,
      previewThumbnails: { enabled: false },
    });
    
    // Appliquer le temps de départ
    if (startTime > 0 && videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
    
    // Écouter les événements
    playerRef.current.on('timeupdate', (event: Plyr.PlyrEvent) => {
      const instance = event.detail.plyr;
      const time = instance.currentTime;
      const dur = instance.duration;
      onTimeUpdate?.(time, dur);
      
      // Marquer comme terminé à 90%
      if (dur > 0 && time / dur >= 0.9) {
        markVideoAsCompleted(formationId, video.id);
      }
    });
    
    playerRef.current.on('ended', () => {
      onEnded?.();
    });
    
    playerRef.current.on('ready', () => {
      if (autoPlay) {
        const playPromise = playerRef.current?.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {});
        }
      }
    });
    
    return () => {
      playerRef.current?.destroy();
    };
  }, [isReady, video, formationId, autoPlay, startTime, onTimeUpdate, onEnded, markVideoAsCompleted]);

  // Raccourcis clavier personnalisés
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current) return;
      
      // Ignorer si dans un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
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
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNextVideo, onPreviousVideo]);

  // Marquer comme terminé manuellement
  const handleMarkCompleted = () => {
    markVideoAsCompleted(formationId, video.id);
    toast.success('Vidéo marquée comme terminée !');
  };

  // Changer la taille des sous-titres
  const handleSubtitleSizeChange = (size: string) => {
    setSubtitleSize(size);
    
    const fontSize = size === 'small' ? '14px' : 
                     size === 'medium' ? '16px' : 
                     size === 'large' ? '20px' : '24px';
    
    const container = containerRef.current;
    if (container) {
      container.style.setProperty('--plyr-captions-font-size', fontSize);
    }
  };

  // Toggle sous-titres
  const toggleSubtitles = () => {
    if (playerRef.current) {
      const newState = !subtitlesVisible;
      setSubtitlesVisible(newState);
      playerRef.current.toggleCaptions(newState);
    }
  };

  if (!isReady) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF0000]"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black video-player-youtube">
      {/* Contrôles custom au-dessus de Plyr */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Marquer comme terminé */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleMarkCompleted}
          className="bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm border-0"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Marquer terminé
        </Button>
        
        {/* Contrôles sous-titres */}
        {subtitleUrlRef.current && (
          <>
            {/* Toggle sous-titres */}
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleSubtitles}
              className={`bg-black/70 backdrop-blur-sm border-0 ${
                subtitlesVisible ? 'text-white' : 'text-gray-500'
              }`}
              title={subtitlesVisible ? 'Masquer les sous-titres' : 'Afficher les sous-titres'}
            >
              {subtitlesVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            
            {/* Taille des sous-titres */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm border-0"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Taille
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#272727]">
                {SUBTITLE_SIZES.map((size) => (
                  <DropdownMenuItem
                    key={size.value}
                    onClick={() => handleSubtitleSizeChange(size.value)}
                    className={`text-white hover:bg-[#272727] cursor-pointer ${
                      subtitleSize === size.value ? 'bg-[#FF0000] hover:bg-[#cc0000]' : ''
                    }`}
                  >
                    {size.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        
        {/* Navigation */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={onPreviousVideo}
            disabled={!hasPrevious}
            className="bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm border-0 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onNextVideo}
            disabled={!hasNext}
            className="bg-black/70 text-white hover:bg-black/90 backdrop-blur-sm border-0 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </Button>
        </div>
      </div>

      {/* Info vidéo */}
      <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-sm rounded px-3 py-2">
        <p className="text-white text-sm font-medium">{video.displayName}</p>
      </div>

      {/* Lecteur Plyr */}
      <video
        ref={videoRef}
        className="plyr-js w-full h-full"
        crossOrigin="anonymous"
        playsInline
      >
        <source src={videoUrlRef.current} type={video.file.type || 'video/mp4'} />
        {subtitleUrlRef.current && (
          <track
            kind="captions"
            src={subtitleUrlRef.current}
            srcLang="fr"
            label="Français"
            default={subtitlesVisible}
          />
        )}
      </video>
    </div>
  );
}
