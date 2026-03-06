/**
 * Types pour l'application E-Learning Video Player
 */

// ==================== TYPES DE BASE ====================

export interface Video {
  id: string;
  name: string;
  displayName: string;
  file: File;
  subtitleFile?: File;
  order: number;
  duration?: number;
  sectionId: string;
}

export interface Section {
  id: string;
  name: string;
  displayName: string;
  order: number;
  videos: Video[];
}

export interface Formation {
  id: string;
  name: string;
  displayName: string;
  path: string;
  sections: Section[];
  totalVideos: number;
  completedVideos: number;
  thumbnail?: string;
}

// ==================== PROGRESSION ====================

export interface FormationProgress {
  id: string;
  currentVideoId: string;
  currentTime: number;
  completedVideoIds: string[];
  lastAccessed: Date;
  totalTimeSpent: number;
}

export interface VideoHistory {
  id: string;
  formationId: string;
  videoId: string;
  watchedAt: Date;
  duration: number;
}

export interface ExportData {
  formations: FormationProgress[];
  history: VideoHistory[];
  exportDate: Date;
  version: string;
}

// ==================== ÉTAT DE LECTURE ====================

export type VideoStatus = 'not-started' | 'in-progress' | 'completed';

export interface VideoState {
  videoId: string;
  status: VideoStatus;
  currentTime: number;
  duration: number;
}

// ==================== UI / UX ====================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface ParsedSRT {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

// ==================== FILE SYSTEM ====================

export interface FileSystemEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

// Type pour l'API File System Access
export interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FileSystemHandle>;
  getFileHandle(name: string): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
}

export interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export type FileSystemHandle = FileSystemDirectoryHandle | FileSystemFileHandle;

// ==================== PROPS COMPONENTS ====================

export interface VideoPlayerProps {
  video: Video;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  startTime?: number;
}

export interface SidebarProps {
  formation: Formation;
  currentVideoId: string;
  progress: FormationProgress | null;
  onVideoSelect: (video: Video) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface FormationCardProps {
  formation: Formation;
  progress: FormationProgress | null;
  onClick: () => void;
}
