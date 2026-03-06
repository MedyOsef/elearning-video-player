/**
 * Store Zustand pour la gestion d'état globale de l'application
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Formation, Video, FormationProgress, VideoHistory } from '@/types';

interface AppState {
  // ========== FORMATIONS ==========
  formations: Formation[];
  currentFormation: Formation | null;
  currentVideo: Video | null;
  
  // ========== PROGRESSION ==========
  formationsProgress: Map<string, FormationProgress>;
  videoHistory: VideoHistory[];
  
  // ========== UI ==========
  isSidebarOpen: boolean;
  isLoading: boolean;
  loadingMessage: string;
  
  // ========== ACTIONS ==========
  // Formations
  setFormations: (formations: Formation[]) => void;
  addFormation: (formation: Formation) => void;
  removeFormation: (formationId: string) => void;
  setCurrentFormation: (formation: Formation | null) => void;
  setCurrentVideo: (video: Video | null) => void;
  
  // Progression
  setFormationProgress: (progress: FormationProgress) => void;
  markVideoAsCompleted: (formationId: string, videoId: string) => void;
  updateCurrentTime: (formationId: string, videoId: string, currentTime: number) => void;
  addVideoHistory: (history: VideoHistory) => void;
  
  // UI
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  
  // Import/Export
  exportData: () => string;
  importData: (jsonData: string) => { success: boolean; error?: string };
  clearAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ========== ÉTAT INITIAL ==========
      formations: [],
      currentFormation: null,
      currentVideo: null,
      formationsProgress: new Map(),
      videoHistory: [],
      isSidebarOpen: true,
      isLoading: false,
      loadingMessage: '',

      // ========== ACTIONS FORMATIONS ==========
      setFormations: (formations) => set({ formations }),
      
      addFormation: (formation) => set((state) => ({
        formations: [...state.formations.filter(f => f.id !== formation.id), formation]
      })),
      
      removeFormation: (formationId) => set((state) => ({
        formations: state.formations.filter(f => f.id !== formationId),
        formationsProgress: new Map([...state.formationsProgress].filter(([id]) => id !== formationId))
      })),
      
      setCurrentFormation: (formation) => set({ currentFormation: formation }),
      
      setCurrentVideo: (video) => set({ currentVideo: video }),

      // ========== ACTIONS PROGRESSION ==========
      setFormationProgress: (progress) => set((state) => {
        const newMap = new Map(state.formationsProgress);
        newMap.set(progress.id, progress);
        return { formationsProgress: newMap };
      }),
      
      markVideoAsCompleted: (formationId, videoId) => set((state) => {
        const newMap = new Map(state.formationsProgress);
        const existing = newMap.get(formationId);
        
        if (existing) {
          if (!existing.completedVideoIds.includes(videoId)) {
            newMap.set(formationId, {
              ...existing,
              completedVideoIds: [...existing.completedVideoIds, videoId],
              lastAccessed: new Date()
            });
          }
        } else {
          newMap.set(formationId, {
            id: formationId,
            currentVideoId: videoId,
            currentTime: 0,
            completedVideoIds: [videoId],
            lastAccessed: new Date(),
            totalTimeSpent: 0
          });
        }
        
        return { formationsProgress: newMap };
      }),
      
      updateCurrentTime: (formationId, videoId, currentTime) => set((state) => {
        const newMap = new Map(state.formationsProgress);
        const existing = newMap.get(formationId);
        
        if (existing) {
          newMap.set(formationId, {
            ...existing,
            currentVideoId: videoId,
            currentTime,
            lastAccessed: new Date()
          });
        } else {
          newMap.set(formationId, {
            id: formationId,
            currentVideoId: videoId,
            currentTime,
            completedVideoIds: [],
            lastAccessed: new Date(),
            totalTimeSpent: 0
          });
        }
        
        return { formationsProgress: newMap };
      }),
      
      addVideoHistory: (history) => set((state) => ({
        videoHistory: [...state.videoHistory, history]
      })),

      // ========== ACTIONS UI ==========
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      
      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),

      // ========== IMPORT/EXPORT ==========
      exportData: () => {
        const state = get();
        const data = {
          formations: Array.from(state.formationsProgress.values()),
          history: state.videoHistory,
          exportDate: new Date().toISOString(),
          version: '1.0.0'
        };
        return JSON.stringify(data, null, 2);
      },
      
      importData: (jsonData) => {
        try {
          const data = JSON.parse(jsonData);
          
          if (!data.formations || !Array.isArray(data.formations)) {
            return { success: false, error: 'Format de données invalide' };
          }
          
          const newMap = new Map<string, FormationProgress>();
          data.formations.forEach((progress: FormationProgress) => {
            newMap.set(progress.id, {
              ...progress,
              lastAccessed: new Date(progress.lastAccessed)
            });
          });
          
          const history: VideoHistory[] = (data.history || []).map((h: VideoHistory) => ({
            ...h,
            watchedAt: new Date(h.watchedAt)
          }));
          
          set({
            formationsProgress: newMap,
            videoHistory: history
          });
          
          return { success: true };
        } catch (error) {
          return { success: false, error: 'Erreur lors de l\'import : ' + (error as Error).message };
        }
      },
      
      clearAllData: () => set({
        formations: [],
        currentFormation: null,
        currentVideo: null,
        formationsProgress: new Map(),
        videoHistory: []
      })
    }),
    {
      name: 'elearning-storage',
      partialize: (state) => ({
        formationsProgress: Array.from(state.formationsProgress.entries()),
        videoHistory: state.videoHistory
      }),
      onRehydrateStorage: () => (state) => {
        // Reconvertir les tableaux en Map après rehydratation
        if (state && Array.isArray(state.formationsProgress)) {
          state.formationsProgress = new Map(state.formationsProgress);
        }
      }
    }
  )
);

// Hook utilitaire pour récupérer la progression d'une formation
export function useFormationProgress(formationId: string): FormationProgress | null {
  const { formationsProgress } = useAppStore();
  return formationsProgress.get(formationId) || null;
}

// Hook utilitaire pour calculer le pourcentage de complétion
export function useCompletionPercentage(formation: Formation | null): number {
  const { formationsProgress } = useAppStore();
  
  if (!formation || formation.totalVideos === 0) return 0;
  
  const progress = formationsProgress.get(formation.id);
  if (!progress) return 0;
  
  return Math.round((progress.completedVideoIds.length / formation.totalVideos) * 100);
}

// Hook utilitaire pour obtenir le statut d'une vidéo
export function useVideoStatus(videoId: string, formationId: string): 'not-started' | 'in-progress' | 'completed' {
  const { formationsProgress, currentVideo } = useAppStore();
  
  const progress = formationsProgress.get(formationId);
  if (!progress) return 'not-started';
  
  if (progress.completedVideoIds.includes(videoId)) {
    return 'completed';
  }
  
  if (currentVideo?.id === videoId) {
    return 'in-progress';
  }
  
  if (progress.currentVideoId === videoId) {
    return 'in-progress';
  }
  
  return 'not-started';
}
