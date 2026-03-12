/**
 * Parser de dossiers pour scanner la structure des formations
 * Supporte l'API File System Access et le fallback input file
 */
import type { Formation, Section, Video } from '@/types';

// Extension de l'interface FileSystemDirectoryHandle pour TypeScript
declare global {
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }
}

/**
 * Formate le nom d'un dossier ou fichier pour l'affichage
 * Ex: "01-Introduction" → "Introduction"
 * Ex: "01-bienvenue.mp4" → "Bienvenue"
 */
export function formatDisplayName(name: string): string {
  // Enlever l'extension
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  
  // Enlever le préfixe numérique (ex: "01-", "1. ", "01 ")
  const withoutPrefix = withoutExt.replace(/^\d+[-.\s]*/, '');
  
  // Remplacer les tirets et underscores par des espaces
  const withSpaces = withoutPrefix.replace(/[-_]/g, ' ');
  
  // Capitaliser la première lettre
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Extrait le numéro d'ordre depuis un nom de fichier/dossier
 */
export function extractOrder(name: string): number {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

/**
 * Vérifie si un fichier est une vidéo
 */
export function isVideoFile(name: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'];
  const lowerName = name.toLowerCase();
  return videoExtensions.some(ext => lowerName.endsWith(ext));
}

/**
 * Vérifie si un fichier est un sous-titre SRT
 */
export function isSubtitleFile(name: string): boolean {
  return name.toLowerCase().endsWith('.srt');
}

/**
 * Parse un dossier de formation depuis l'API File System Access
 */
export async function parseFormationFolder(
  dirHandle: FileSystemDirectoryHandle
): Promise<Formation> {
  const sections: Section[] = [];
  const videoFiles: Map<string, File> = new Map();
  const subtitleFiles: Map<string, File> = new Map();
  
  // Parcourir tous les éléments du dossier
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'directory') {
      // C'est une section (sous-dossier)
      const section = await parseSection(entry as FileSystemDirectoryHandle);
      if (section.videos.length > 0) {
        sections.push(section);
      }
    } else if (entry.kind === 'file') {
      // C'est un fichier
      const file = await (entry as FileSystemFileHandle).getFile();
      const name = entry.name;
      
      if (isVideoFile(name)) {
        const baseName = name.replace(/\.[^/.]+$/, '');
        videoFiles.set(baseName, file);
      } else if (isSubtitleFile(name)) {
        const baseName = name.replace(/\.[^/.]+$/, '');
        subtitleFiles.set(baseName, file);
      }
    }
  }
  
  // Si des vidéos sont à la racine, créer une section "Général"
  if (videoFiles.size > 0) {
    const rootVideos: Video[] = [];
    
    for (const [baseName, videoFile] of videoFiles) {
      const subtitleFile = subtitleFiles.get(baseName);
      
      rootVideos.push({
        id: `${dirHandle.name}-${baseName}`,
        name: videoFile.name,
        displayName: formatDisplayName(videoFile.name),
        file: videoFile,
        subtitleFile: subtitleFile,
        order: extractOrder(videoFile.name),
        sectionId: 'root'
      });
    }
    
    // Trier par ordre
    rootVideos.sort((a, b) => a.order - b.order);
    
    sections.push({
      id: `${dirHandle.name}-root`,
      name: 'root',
      displayName: 'Contenu principal',
      order: 0,
      videos: rootVideos
    });
  }
  
  // Trier les sections par ordre
  sections.sort((a, b) => a.order - b.order);
  
  // Calculer le nombre total de vidéos
  const totalVideos = sections.reduce((acc, s) => acc + s.videos.length, 0);
  
  return {
    id: dirHandle.name,
    name: dirHandle.name,
    displayName: formatDisplayName(dirHandle.name),
    path: dirHandle.name,
    sections,
    totalVideos,
    completedVideos: 0
  };
}

/**
 * Parse une section (sous-dossier)
 */
async function parseSection(
  dirHandle: FileSystemDirectoryHandle
): Promise<Section> {
  const videos: Video[] = [];
  const videoFiles: Map<string, File> = new Map();
  const subtitleFiles: Map<string, File> = new Map();
  
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const file = await (entry as FileSystemFileHandle).getFile();
      const name = entry.name;
      
      if (isVideoFile(name)) {
        const baseName = name.replace(/\.[^/.]+$/, '');
        videoFiles.set(baseName, file);
      } else if (isSubtitleFile(name)) {
        const baseName = name.replace(/\.[^/.]+$/, '');
        subtitleFiles.set(baseName, file);
      }
    }
  }
  
  // Créer les objets Video
  for (const [baseName, videoFile] of videoFiles) {
    const subtitleFile = subtitleFiles.get(baseName);
    
    videos.push({
      id: `${dirHandle.name}-${baseName}`,
      name: videoFile.name,
      displayName: formatDisplayName(videoFile.name),
      file: videoFile,
      subtitleFile: subtitleFile,
      order: extractOrder(videoFile.name),
      sectionId: dirHandle.name
    });
  }
  
  // Trier par ordre
  videos.sort((a, b) => a.order - b.order);
  
  return {
    id: dirHandle.name,
    name: dirHandle.name,
    displayName: formatDisplayName(dirHandle.name),
    order: extractOrder(dirHandle.name),
    videos
  };
}

/**
 * Parse des fichiers depuis un input file (fallback)
 */
export function parseFilesFromInput(files: File[] | FileList): Formation[] {
  const formationMap: Map<string, { sections: Map<string, Video[]>, rootVideos: Video[] }> = new Map();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathParts = file.webkitRelativePath.split('/');
    
    if (pathParts.length < 2) continue;
    
    const formationName = pathParts[0];
    const isRoot = pathParts.length === 2;
    
    if (!formationMap.has(formationName)) {
      formationMap.set(formationName, { sections: new Map(), rootVideos: [] });
    }
    
    const formation = formationMap.get(formationName)!;
    
    if (isVideoFile(file.name)) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const video: Video = {
        id: `${formationName}-${baseName}`,
        name: file.name,
        displayName: formatDisplayName(file.name),
        file: file,
        order: extractOrder(file.name),
        sectionId: isRoot ? 'root' : pathParts[1]
      };
      
      if (isRoot) {
        formation.rootVideos.push(video);
      } else {
        const sectionName = pathParts[1];
        if (!formation.sections.has(sectionName)) {
          formation.sections.set(sectionName, []);
        }
        formation.sections.get(sectionName)!.push(video);
      }
    } else if (isSubtitleFile(file.name)) {
      // Associer le sous-titre à la vidéo correspondante
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const sectionName = isRoot ? null : pathParts[1];
      
      if (isRoot) {
        const video = formation.rootVideos.find(v => v.id === `${formationName}-${baseName}`);
        if (video) video.subtitleFile = file;
      } else {
        const videos = formation.sections.get(sectionName!);
        if (videos) {
          const video = videos.find(v => v.id === `${formationName}-${baseName}`);
          if (video) video.subtitleFile = file;
        }
      }
    }
  }
  
  // Convertir en formations
  const formations: Formation[] = [];
  
  for (const [formationName, data] of formationMap) {
    const sections: Section[] = [];
    
    // Ajouter les vidéos à la racine comme section "Contenu principal"
    if (data.rootVideos.length > 0) {
      data.rootVideos.sort((a, b) => a.order - b.order);
      sections.push({
        id: `${formationName}-root`,
        name: 'root',
        displayName: 'Contenu principal',
        order: 0,
        videos: data.rootVideos
      });
    }
    
    // Ajouter les sections
    for (const [sectionName, videos] of data.sections) {
      videos.sort((a, b) => a.order - b.order);
      sections.push({
        id: sectionName,
        name: sectionName,
        displayName: formatDisplayName(sectionName),
        order: extractOrder(sectionName),
        videos
      });
    }
    
    sections.sort((a, b) => a.order - b.order);
    
    const totalVideos = sections.reduce((acc, s) => acc + s.videos.length, 0);
    
    formations.push({
      id: formationName,
      name: formationName,
      displayName: formatDisplayName(formationName),
      path: formationName,
      sections,
      totalVideos,
      completedVideos: 0
    });
  }
  
  return formations;
}

/**
 * Vérifie si l'API File System Access est supportée
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Ouvre le sélecteur de dossier natif
 */
export async function showDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }
  
  try {
    // @ts-ignore - TypeScript ne reconnaît pas encore cette API
    const dirHandle = await window.showDirectoryPicker();
    return dirHandle;
  } catch (error) {
    // L'utilisateur a annulé
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  }
}
