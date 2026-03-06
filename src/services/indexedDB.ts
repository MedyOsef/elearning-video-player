/**
 * Service IndexedDB pour le stockage local des données
 * Utilise la library 'idb' pour une API moderne et typée
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FormationProgress, VideoHistory } from '@/types';

// Schéma de la base de données
interface ELearningDB extends DBSchema {
  formations: {
    key: string;
    value: FormationProgress;
    indexes: {
      'by-last-accessed': Date;
    };
  };
  history: {
    key: string;
    value: VideoHistory;
    indexes: {
      'by-formation': string;
      'by-watched-at': Date;
    };
  };
}

const DB_NAME = 'elearning-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ELearningDB>> | null = null;

/**
 * Initialise et retourne la connexion à la base de données
 */
export function initDB(): Promise<IDBPDatabase<ELearningDB>> {
  if (dbPromise) return dbPromise;
  
  dbPromise = openDB<ELearningDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Création du store pour les formations
      if (!db.objectStoreNames.contains('formations')) {
        const formationStore = db.createObjectStore('formations', { keyPath: 'id' });
        formationStore.createIndex('by-last-accessed', 'lastAccessed', { unique: false });
      }
      
      // Création du store pour l'historique
      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('by-formation', 'formationId', { unique: false });
        historyStore.createIndex('by-watched-at', 'watchedAt', { unique: false });
      }
    }
  });
  
  return dbPromise;
}

/**
 * Ferme la connexion à la base de données
 */
export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

// ==================== FORMATIONS ====================

/**
 * Sauvegarde ou met à jour la progression d'une formation
 */
export async function saveFormationProgress(progress: FormationProgress): Promise<void> {
  const db = await initDB();
  await db.put('formations', {
    ...progress,
    lastAccessed: new Date()
  });
}

/**
 * Récupère la progression d'une formation
 */
export async function getFormationProgress(formationId: string): Promise<FormationProgress | undefined> {
  const db = await initDB();
  return db.get('formations', formationId);
}

/**
 * Récupère toutes les progressions de formations
 */
export async function getAllFormationProgress(): Promise<FormationProgress[]> {
  const db = await initDB();
  return db.getAll('formations');
}

/**
 * Supprime la progression d'une formation
 */
export async function deleteFormationProgress(formationId: string): Promise<void> {
  const db = await initDB();
  await db.delete('formations', formationId);
}

/**
 * Marque une vidéo comme terminée
 */
export async function markVideoCompleted(
  formationId: string, 
  videoId: string
): Promise<FormationProgress> {
  const db = await initDB();
  
  const existing = await db.get('formations', formationId);
  
  let progress: FormationProgress;
  
  if (existing) {
    const completedIds = new Set(existing.completedVideoIds);
    completedIds.add(videoId);
    
    progress = {
      ...existing,
      completedVideoIds: Array.from(completedIds),
      lastAccessed: new Date()
    };
  } else {
    progress = {
      id: formationId,
      currentVideoId: videoId,
      currentTime: 0,
      completedVideoIds: [videoId],
      lastAccessed: new Date(),
      totalTimeSpent: 0
    };
  }
  
  await db.put('formations', progress);
  return progress;
}

/**
 * Met à jour le temps actuel d'une vidéo
 */
export async function updateVideoTime(
  formationId: string,
  videoId: string,
  currentTime: number
): Promise<FormationProgress> {
  const db = await initDB();
  
  const existing = await db.get('formations', formationId);
  
  let progress: FormationProgress;
  
  if (existing) {
    progress = {
      ...existing,
      currentVideoId: videoId,
      currentTime,
      lastAccessed: new Date()
    };
  } else {
    progress = {
      id: formationId,
      currentVideoId: videoId,
      currentTime,
      completedVideoIds: [],
      lastAccessed: new Date(),
      totalTimeSpent: 0
    };
  }
  
  await db.put('formations', progress);
  return progress;
}

// ==================== HISTORIQUE ====================

/**
 * Ajoute une entrée à l'historique
 */
export async function addVideoHistory(
  formationId: string,
  videoId: string,
  duration: number
): Promise<VideoHistory> {
  const db = await initDB();
  
  const history: VideoHistory = {
    id: `${formationId}-${videoId}-${Date.now()}`,
    formationId,
    videoId,
    watchedAt: new Date(),
    duration
  };
  
  await db.add('history', history);
  return history;
}

/**
 * Récupère l'historique d'une formation
 */
export async function getFormationHistory(formationId: string): Promise<VideoHistory[]> {
  const db = await initDB();
  const index = db.transaction('history').store.index('by-formation');
  return index.getAll(formationId);
}

/**
 * Récupère tout l'historique
 */
export async function getAllHistory(): Promise<VideoHistory[]> {
  const db = await initDB();
  return db.getAll('history');
}

/**
 * Supprime l'historique d'une formation
 */
export async function deleteFormationHistory(formationId: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('history', 'readwrite');
  const index = tx.store.index('by-formation');
  const keys = await index.getAllKeys(formationId);
  
  for (const key of keys) {
    await tx.store.delete(key);
  }
  
  await tx.done;
}

// ==================== IMPORT/EXPORT ====================

export interface ExportData {
  formations: FormationProgress[];
  history: VideoHistory[];
  exportDate: string;
  version: string;
}

/**
 * Exporte toutes les données
 */
export async function exportAllData(): Promise<ExportData> {
  const [formations, history] = await Promise.all([
    getAllFormationProgress(),
    getAllHistory()
  ]);
  
  return {
    formations,
    history,
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Importe des données (remplace les données existantes)
 */
export async function importAllData(data: ExportData): Promise<void> {
  const db = await initDB();
  
  // Vider les stores existants
  const tx = db.transaction(['formations', 'history'], 'readwrite');
  await tx.objectStore('formations').clear();
  await tx.objectStore('history').clear();
  await tx.done;
  
  // Importer les nouvelles données
  const importTx = db.transaction(['formations', 'history'], 'readwrite');
  
  for (const formation of data.formations) {
    await importTx.objectStore('formations').put({
      ...formation,
      lastAccessed: new Date(formation.lastAccessed)
    });
  }
  
  for (const historyItem of data.history) {
    await importTx.objectStore('history').put({
      ...historyItem,
      watchedAt: new Date(historyItem.watchedAt)
    });
  }
  
  await importTx.done;
}

/**
 * Supprime toutes les données
 */
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['formations', 'history'], 'readwrite');
  await tx.objectStore('formations').clear();
  await tx.objectStore('history').clear();
  await tx.done;
}

// ==================== STATISTIQUES ====================

/**
 * Calcule les statistiques globales
 */
export async function getGlobalStats(): Promise<{
  totalFormations: number;
  totalVideosWatched: number;
  totalTimeSpent: number;
}> {
  const [formations, history] = await Promise.all([
    getAllFormationProgress(),
    getAllHistory()
  ]);
  
  const totalTimeSpent = formations.reduce((acc, f) => acc + (f.totalTimeSpent || 0), 0);
  const totalVideosWatched = formations.reduce((acc, f) => acc + f.completedVideoIds.length, 0);
  
  // Éviter l'erreur de variable non utilisée en utilisant history
  void history;
  
  return {
    totalFormations: formations.length,
    totalVideosWatched,
    totalTimeSpent
  };
}
