/**
 * Dialog de reprise de lecture
 * Style YouTube
 */
import { Play, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FormationProgress } from '@/types';

interface ResumeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onRestart: () => void;
  progress: FormationProgress | null;
  videoName: string;
}

export function ResumeDialog({
  isOpen,
  onClose,
  onResume,
  onRestart,
  progress,
  videoName
}: ResumeDialogProps) {
  // Formater le temps
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-[#272727] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="w-6 h-6 text-[#FF0000]" />
            Reprendre la lecture ?
          </DialogTitle>
          <DialogDescription className="text-[#AAAAAA]">
            Vous avez déjà commencé cette formation. Que souhaitez-vous faire ?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-[#272727] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#AAAAAA]">Dernière vidéo</span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {videoName}
              </span>
            </div>
            {progress && progress.currentTime > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#AAAAAA]">Temps écoulé</span>
                <span className="text-[#FF0000] font-medium">
                  {formatTime(progress.currentTime)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#AAAAAA]">Vidéos terminées</span>
              <span className="text-green-500 font-medium">
                {progress?.completedVideoIds.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#AAAAAA]">Dernier accès</span>
              <span className="text-white">
                {progress?.lastAccessed 
                  ? new Date(progress.lastAccessed).toLocaleDateString('fr-FR')
                  : 'Jamais'
                }
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onRestart}
            className="border-[#3f3f3f] text-[#AAAAAA] hover:bg-[#272727] w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
          <Button
            onClick={onResume}
            className="bg-[#FF0000] hover:bg-[#cc0000] text-white w-full sm:w-auto"
          >
            <Play className="w-4 h-4 mr-2" fill="white" />
            Reprendre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
