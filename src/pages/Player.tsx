/**
 * Page de lecture - Lecteur vidéo avec sidebar
 * Style YouTube
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Sidebar } from '@/components/Sidebar';
import { ResumeDialog } from '@/components/ResumeDialog';
import { useAppStore } from '@/store/appStore';
import { 
  getFormationProgress, 
  markVideoCompleted,
  updateVideoTime,
  addVideoHistory
} from '@/services/indexedDB';
import type { Video, FormationProgress } from '@/types';

export function Player() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [progress, setProgress] = useState<FormationProgress | null>(null);
  const [startTime, setStartTime] = useState(0);
  
  const {
    currentFormation,
    currentVideo,
    setCurrentVideo,
    markVideoAsCompleted: markVideoInStore,
    updateCurrentTime: updateTimeInStore
  } = useAppStore();
  
  // Rediriger si pas de formation sélectionnée
  useEffect(() => {
    if (!currentFormation) {
      navigate('/');
      return;
    }
    
    loadProgress();
  }, [currentFormation, navigate]);
  
  // Charger la progression de la formation
  const loadProgress = async () => {
    if (!currentFormation) return;
    
    try {
      const prog = await getFormationProgress(currentFormation.id);
      if (prog) {
        setProgress(prog);
        
        const hasProgress = prog.completedVideoIds.length > 0 || prog.currentTime > 0;
        if (hasProgress && !currentVideo) {
          setShowResumeDialog(true);
        }
        
        if (!currentVideo) {
          findAndSetVideo(prog.currentVideoId);
        }
      } else if (!currentVideo) {
        const firstVideo = currentFormation.sections[0]?.videos[0];
        if (firstVideo) {
          setCurrentVideo(firstVideo);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error);
    }
  };

  // Rafraîchir la progression depuis IndexedDB
  const refreshProgress = useCallback(async () => {
    if (!currentFormation) return;
    try {
      const prog = await getFormationProgress(currentFormation.id);
      if (prog) setProgress(prog);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    }
  }, [currentFormation]);
  
  // Trouver et définir une vidéo par son ID
  const findAndSetVideo = (videoId: string) => {
    if (!currentFormation) return;
    
    for (const section of currentFormation.sections) {
      const video = section.videos.find(v => v.id === videoId);
      if (video) {
        setCurrentVideo(video);
        return;
      }
    }
    
    const firstVideo = currentFormation.sections[0]?.videos[0];
    if (firstVideo) {
      setCurrentVideo(firstVideo);
    }
  };
  
  // Reprendre la lecture
  const handleResume = () => {
    if (progress) {
      setStartTime(progress.currentTime);
      findAndSetVideo(progress.currentVideoId);
    }
    setShowResumeDialog(false);
  };
  
  // Recommencer depuis le début
  const handleRestart = () => {
    setStartTime(0);
    if (currentFormation) {
      const firstVideo = currentFormation.sections[0]?.videos[0];
      if (firstVideo) {
        setCurrentVideo(firstVideo);
      }
    }
    setShowResumeDialog(false);
  };
  
  // Mettre à jour le temps de lecture
  const handleTimeUpdate = useCallback(async (currentTime: number, duration: number) => {
    if (!currentFormation || !currentVideo) return;
    
    // Sauvegarder toutes les 5 secondes
    if (Math.floor(currentTime) % 5 === 0) {
      try {
        await updateVideoTime(currentFormation.id, currentVideo.id, currentTime);
        updateTimeInStore(currentFormation.id, currentVideo.id, currentTime);
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    
    // Marquer comme terminé si 90% atteint
    if (duration > 0 && currentTime / duration >= 0.9) {
      const isAlreadyCompleted = progress?.completedVideoIds.includes(currentVideo.id);
      if (!isAlreadyCompleted) {
        try {
          await markVideoCompleted(currentFormation.id, currentVideo.id);
          markVideoInStore(currentFormation.id, currentVideo.id);
          await refreshProgress();
          toast.success('Vidéo marquée comme terminée !');
        } catch (error) {
          console.error('Erreur lors du marquage:', error);
        }
      }
    }
  }, [currentFormation, currentVideo, progress, markVideoInStore, updateTimeInStore, refreshProgress]);
  
  // Vidéo terminée
  const handleVideoEnded = useCallback(async () => {
    if (!currentFormation || !currentVideo) return;
    
    try {
      await markVideoCompleted(currentFormation.id, currentVideo.id);
      markVideoInStore(currentFormation.id, currentVideo.id);
      await addVideoHistory(currentFormation.id, currentVideo.id, 0);
      await refreshProgress();
      
      toast.success('Vidéo terminée !');
      
      // Passer à la vidéo suivante
      const nextVideo = getNextVideo();
      if (nextVideo) {
        setTimeout(() => {
          handleVideoSelect(nextVideo);
          toast.info('Passage à la vidéo suivante...');
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la fin de vidéo:', error);
    }
  }, [currentFormation, currentVideo, markVideoInStore, refreshProgress]);
  
  // Obtenir la vidéo suivante
  const getNextVideo = (): Video | null => {
    if (!currentFormation || !currentVideo) return null;
    
    let foundCurrent = false;
    
    for (const section of currentFormation.sections) {
      for (const video of section.videos) {
        if (foundCurrent) {
          return video;
        }
        if (video.id === currentVideo.id) {
          foundCurrent = true;
        }
      }
    }
    
    return null;
  };
  
  // Obtenir la vidéo précédente
  const getPreviousVideo = (): Video | null => {
    if (!currentFormation || !currentVideo) return null;
    
    let previousVideo: Video | null = null;
    
    for (const section of currentFormation.sections) {
      for (const video of section.videos) {
        if (video.id === currentVideo.id) {
          return previousVideo;
        }
        previousVideo = video;
      }
    }
    
    return null;
  };
  
  // Sélectionner une vidéo
  const handleVideoSelect = async (video: Video) => {
    if (!currentFormation) return;
    
    if (currentVideo) {
      await updateVideoTime(currentFormation.id, currentVideo.id, 0);
    }
    
    setCurrentVideo(video);
    setStartTime(0);
    setIsSidebarOpen(false);
    
    const prog = await getFormationProgress(currentFormation.id);
    if (prog) {
      setProgress(prog);
      if (prog.currentVideoId === video.id) {
        setStartTime(prog.currentTime);
      }
    }
  };
  
  // Aller à la vidéo suivante
  const handleNextVideo = () => {
    const next = getNextVideo();
    if (next) {
      handleVideoSelect(next);
    }
  };
  
  // Aller à la vidéo précédente
  const handlePreviousVideo = () => {
    const prev = getPreviousVideo();
    if (prev) {
      handleVideoSelect(prev);
    }
  };
  
  // Retour à l'accueil
  const handleBack = () => {
    navigate('/');
  };
  
  // Marquer manuellement comme terminé
  const handleMarkCompleted = async () => {
    if (!currentFormation || !currentVideo) return;
    
    try {
      await markVideoCompleted(currentFormation.id, currentVideo.id);
      markVideoInStore(currentFormation.id, currentVideo.id);
      await refreshProgress();
      toast.success('Vidéo marquée comme terminée !');
    } catch (error) {
      toast.error('Erreur lors du marquage');
    }
  };
  
  if (!currentFormation || !currentVideo) {
    return null;
  }
  
  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header style YouTube */}
      <header className="bg-[#0f0f0f] border-b border-[#272727] flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-[#AAAAAA] hover:text-white hover:bg-[#272727]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-white font-semibold truncate max-w-[300px] sm:max-w-md">
              {currentFormation.displayName}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkCompleted}
              className="text-[#AAAAAA] hover:text-green-400 hover:bg-[#272727] hidden sm:flex"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marquer terminé
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-[#AAAAAA] hover:text-white hover:bg-[#272727]"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lecteur vidéo */}
        <main className="flex-1 relative">
          <VideoPlayer
            video={currentVideo}
            formationId={currentFormation.id}
            onEnded={handleVideoEnded}
            onTimeUpdate={handleTimeUpdate}
            autoPlay={true}
            startTime={startTime}
            onNextVideo={handleNextVideo}
            onPreviousVideo={handlePreviousVideo}
            hasNext={!!getNextVideo()}
            hasPrevious={!!getPreviousVideo()}
          />
        </main>
        
        {/* Sidebar */}
        <Sidebar
          formation={currentFormation}
          currentVideoId={currentVideo.id}
          progress={progress}
          onVideoSelect={handleVideoSelect}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      {/* Dialog de reprise */}
      <ResumeDialog
        isOpen={showResumeDialog}
        onClose={() => setShowResumeDialog(false)}
        onResume={handleResume}
        onRestart={handleRestart}
        progress={progress}
        videoName={currentFormation.sections
          .flatMap(s => s.videos)
          .find(v => v.id === progress?.currentVideoId)?.displayName || ''}
      />
    </div>
  );
}