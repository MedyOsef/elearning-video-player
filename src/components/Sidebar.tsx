/**
 * Composant Sidebar pour la navigation des vidéos
 * Style YouTube
 */
import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  PlayCircle,
  X,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Formation, Video, FormationProgress } from '@/types';

interface SidebarProps {
  formation: Formation;
  currentVideoId: string;
  progress: FormationProgress | null;
  onVideoSelect: (video: Video) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  formation,
  currentVideoId,
  progress,
  onVideoSelect,
  isOpen,
  onClose
}: SidebarProps) {
  // État pour les sections dépliées
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const currentSection = formation.sections.find(s => 
      s.videos.some(v => v.id === currentVideoId)
    );
    return currentSection ? new Set([currentSection.id]) : new Set();
  });
  
  // Toggle une section
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  
  // Obtenir le statut d'une vidéo
  const getVideoStatus = (videoId: string): 'not-started' | 'in-progress' | 'completed' => {
    if (progress?.completedVideoIds.includes(videoId)) {
      return 'completed';
    }
    if (videoId === currentVideoId) {
      return 'in-progress';
    }
    if (progress?.currentVideoId === videoId) {
      return 'in-progress';
    }
    return 'not-started';
  };
  
  // Calculer la progression globale
  const completionPercentage = progress 
    ? Math.round((progress.completedVideoIds.length / formation.totalVideos) * 100)
    : 0;
  
  // Compter les vidéos complétées par section
  const getSectionProgress = (section: typeof formation.sections[0]): { completed: number; total: number } => {
    const completed = section.videos.filter(v => 
      progress?.completedVideoIds.includes(v.id)
    ).length;
    return { completed, total: section.videos.length };
  };
  
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 bg-[#0f0f0f] border-r border-[#272727]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#272727]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <BookOpen className="w-5 h-5 text-[#FF0000] flex-shrink-0" />
              <h2 className="text-white font-semibold line-clamp-2">
                {formation.displayName}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden text-[#AAAAAA] hover:text-white hover:bg-[#272727]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Progression globale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#AAAAAA] flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Progression
              </span>
              <span className={completionPercentage === 100 ? 'text-green-500' : 'text-[#FF0000]'}>
                {completionPercentage}%
              </span>
            </div>
            <div className="h-1.5 bg-[#272727] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  completionPercentage === 100 ? 'bg-green-500' : 'bg-[#FF0000]'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-[#717171] text-xs">
              {progress?.completedVideoIds.length || 0} / {formation.totalVideos} vidéos terminées
            </p>
          </div>
        </div>
        
        {/* Liste des sections et vidéos */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {formation.sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const sectionProgress = getSectionProgress(section);
              const isSectionCompleted = sectionProgress.completed === sectionProgress.total;
              
              return (
                <div key={section.id} className="space-y-1">
                  {/* Header de section */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-lg
                      transition-colors duration-200
                      hover:bg-[#272727]
                      ${isExpanded ? 'bg-[#272727]/50' : ''}
                    `}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#AAAAAA]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#AAAAAA]" />
                    )}
                    <span className="flex-1 text-left text-sm font-medium text-white min-w-0">
                      {section.displayName}
                    </span>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full flex-shrink-0
                      ${isSectionCompleted 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-[#272727] text-[#AAAAAA]'
                      }
                    `}>
                      {sectionProgress.completed}/{sectionProgress.total}
                    </span>
                  </button>
                  
                  {/* Liste des vidéos */}
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5">
                      {section.videos.map((video, index) => {
                        const status = getVideoStatus(video.id);
                        const isCurrent = video.id === currentVideoId;
                        
                        return (
                          <button
                            key={video.id}
                            onClick={() => onVideoSelect(video)}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 rounded-lg
                              transition-all duration-200 text-left
                              ${isCurrent 
                                ? 'bg-[#FF0000] text-white' 
                                : 'text-[#AAAAAA] hover:bg-[#272727] hover:text-white'
                              }
                            `}
                          >
                            {/* Icône de statut */}
                            <div className="flex-shrink-0">
                              {status === 'completed' && (
                                <CheckCircle2 className={`
                                  w-4 h-4 
                                  ${isCurrent ? 'text-white' : 'text-green-500'}
                                `} />
                              )}
                              {status === 'in-progress' && (
                                <PlayCircle className={`
                                  w-4 h-4 
                                  ${isCurrent ? 'text-white' : 'text-[#FF0000]'}
                                `} />
                              )}
                              {status === 'not-started' && (
                                <Circle className={`
                                  w-4 h-4 
                                  ${isCurrent ? 'text-white' : 'text-[#717171]'}
                                `} />
                              )}
                            </div>
                            
                            {/* Numéro et nom */}
                            <span className="text-xs text-[#717171] flex-shrink-0">
                              {index + 1}.
                            </span>
                            <span className="text-sm line-clamp-2 flex-1 min-w-0">
                              {video.displayName}
                            </span>
                            
                            {/* Indicateur "En cours" */}
                            {isCurrent && (
                              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded flex-shrink-0">
                                En cours
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Footer avec légende */}
        <div className="p-4 border-t border-[#272727]">
          <div className="flex items-center justify-center gap-4 text-xs text-[#717171]">
            <div className="flex items-center gap-1">
              <Circle className="w-3 h-3" />
              <span>Non commencé</span>
            </div>
            <div className="flex items-center gap-1">
              <PlayCircle className="w-3 h-3 text-[#FF0000]" />
              <span>En cours</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>Terminé</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
