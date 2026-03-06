/**
 * Page d'accueil - Sélection de formation
 * Style YouTube
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Settings, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DropZone } from '@/components/DropZone';
import { FormationCard } from '@/components/FormationCard';
import { DataManager } from '@/components/DataManager';
import { useAppStore } from '@/store/appStore';
import { getAllFormationProgress } from '@/services/indexedDB';
import type { Formation, FormationProgress } from '@/types';

export function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressMap, setProgressMap] = useState<Map<string, FormationProgress>>(new Map());
  
  const { 
    formations, 
    addFormation, 
    setCurrentFormation,
    setCurrentVideo 
  } = useAppStore();
  
  // Charger les progressions au montage
  useEffect(() => {
    loadProgressions();
  }, []);
  
  const loadProgressions = async () => {
    try {
      const progressions = await getAllFormationProgress();
      const map = new Map<string, FormationProgress>();
      progressions.forEach(p => map.set(p.id, p));
      setProgressMap(map);
    } catch (error) {
      console.error('Erreur lors du chargement des progressions:', error);
    }
  };
  
  // Gérer le loading
  const handleSetLoading = (loading: boolean, message = '') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };
  
  // Quand des formations sont détectées
  const handleFormationsDetected = (newFormations: Formation[]) => {
    newFormations.forEach(formation => {
      addFormation(formation);
    });
    
    toast.success(`${newFormations.length} formation(s) ajoutée(s)`);
  };
  
  // Ouvrir une formation
  const handleOpenFormation = (formation: Formation) => {
    setCurrentFormation(formation);
    
    const progress = progressMap.get(formation.id);
    let targetVideo = formation.sections[0]?.videos[0];
    
    if (progress) {
      for (const section of formation.sections) {
        const video = section.videos.find(v => v.id === progress.currentVideoId);
        if (video) {
          targetVideo = video;
          break;
        }
      }
    }
    
    if (targetVideo) {
      setCurrentVideo(targetVideo);
      navigate('/player');
    } else {
      toast.error('Aucune vidéo trouvée dans cette formation');
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header style YouTube */}
      <header className="border-b border-[#272727] bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF0000] flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">E-Learning Player</h1>
                <p className="text-[#AAAAAA] text-xs">Lecteur vidéo de formation</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <DataManager />
              <Button
                variant="ghost"
                size="icon"
                className="text-[#AAAAAA] hover:text-white hover:bg-[#272727]"
                onClick={() => toast.info('Version 1.0.0')}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Zone de drop */}
        <section className="mb-12">
          <DropZone 
            onFormationsDetected={handleFormationsDetected}
            isLoading={isLoading}
            setIsLoading={handleSetLoading}
          />
        </section>
        
        {/* Liste des formations */}
        {formations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-[#FF0000]" />
                Mes formations
              </h2>
              <span className="text-[#AAAAAA] text-sm">
                {formations.length} formation{formations.length > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {formations.map((formation) => (
                <FormationCard
                  key={formation.id}
                  formation={formation}
                  progress={progressMap.get(formation.id) || null}
                  onClick={() => handleOpenFormation(formation)}
                />
              ))}
            </div>
          </section>
        )}
        
        {/* État vide */}
        {formations.length === 0 && !isLoading && (
          <section className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#1a1a1a] 
                            flex items-center justify-center">
              <Film className="w-12 h-12 text-[#717171]" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">
              Aucune formation
            </h3>
            <p className="text-[#AAAAAA] max-w-md mx-auto">
              Glissez-déposez un dossier de formation ou utilisez le bouton 
              &quot;Sélectionner un dossier&quot; pour commencer.
            </p>
          </section>
        )}
        
        {/* Loading */}
        {isLoading && (
          <section className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#272727] 
                            border-t-[#FF0000] animate-spin" />
            <p className="text-[#AAAAAA]">{loadingMessage}</p>
          </section>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[#272727] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#717171] text-sm">
              E-Learning Video Player • Client-side only • Données stockées localement
            </p>
            <div className="flex items-center gap-4 text-[#717171] text-sm">
              <span>Raccourcis : Espace = Play/Pause</span>
              <span>•</span>
              <span>Flèches = Avancer/Reculer</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
