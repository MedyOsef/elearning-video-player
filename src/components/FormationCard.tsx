/**
 * Composant carte de formation pour la grille d'accueil
 * Style YouTube
 */
import { Play, CheckCircle, Clock, Film } from 'lucide-react';
import type { Formation, FormationProgress } from '@/types';

interface FormationCardProps {
  formation: Formation;
  progress: FormationProgress | null;
  onClick: () => void;
}

export function FormationCard({ formation, progress, onClick }: FormationCardProps) {
  // Calculer le pourcentage de complétion
  const completionPercentage = progress 
    ? Math.round((progress.completedVideoIds.length / formation.totalVideos) * 100)
    : 0;
  
  const isCompleted = completionPercentage === 100;
  const isInProgress = completionPercentage > 0 && completionPercentage < 100;
  
  // Formater le temps passé
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };
  
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden relative mb-3
                      transition-all duration-200 group-hover:rounded-lg">
        {/* Icône principale */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-16 h-16 text-[#717171] group-hover:text-[#AAAAAA] transition-colors" />
        </div>
        
        {/* Overlay au hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                        transition-opacity duration-200 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-[#FF0000] flex items-center justify-center
                          transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
        
        {/* Badge de statut */}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 
                          rounded text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Terminé
          </div>
        )}
        {isInProgress && (
          <div className="absolute top-2 right-2 bg-[#FF0000] text-white px-2 py-1 
                          rounded text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </div>
        )}
        
        {/* Barre de progression sur la thumbnail */}
        {completionPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#272727]">
            <div 
              className={`h-full ${isCompleted ? 'bg-green-600' : 'bg-[#FF0000]'}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Contenu */}
      <div>
        <h3 className="text-white font-semibold text-base mb-1 line-clamp-2 
                       group-hover:text-[#FF0000] transition-colors">
          {formation.displayName}
        </h3>
        
        <p className="text-[#AAAAAA] text-sm">
          {formation.totalVideos} vidéo{formation.totalVideos > 1 ? 's' : ''}
          {formation.sections.length > 1 && ` • ${formation.sections.length} sections`}
        </p>
        
        {/* Progression */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#272727] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-600' : 'bg-[#FF0000]'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${
            isCompleted ? 'text-green-500' : 'text-[#AAAAAA]'
          }`}>
            {completionPercentage}%
          </span>
        </div>
        
        {/* Temps passé */}
        {progress && progress.totalTimeSpent > 0 && (
          <p className="text-[#717171] text-xs mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(progress.totalTimeSpent)}
          </p>
        )}
      </div>
    </div>
  );
}
