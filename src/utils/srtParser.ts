/**
 * Parser de fichiers SRT (SubRip Subtitle)
 * Convertit les fichiers .srt en format WebVTT ou en objets utilisables
 */
import type { ParsedSRT } from '@/types';

/**
 * Parse le contenu d'un fichier SRT
 */
export function parseSRT(content: string): ParsedSRT[] {
  const subtitles: ParsedSRT[] = [];
  
  // Normaliser les sauts de ligne
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Séparer par blocs (numéro + timing + texte)
  const blocks = normalized.split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    // La première ligne est le numéro
    const id = parseInt(lines[0].trim(), 10);
    if (isNaN(id)) continue;
    
    // La deuxième ligne contient les timings
    const timeLine = lines[1].trim();
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );
    
    if (!timeMatch) continue;
    
    const startTime = 
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;
    
    const endTime = 
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;
    
    // Le reste est le texte du sous-titre
    const text = lines.slice(2).join('\n').trim();
    
    if (text) {
      subtitles.push({ id, startTime, endTime, text });
    }
  }
  
  return subtitles;
}

/**
 * Convertit les sous-titres SRT en format WebVTT
 * Compatible avec l'élément <track> HTML5
 */
export function convertSRTtoWebVTT(content: string): string {
  const subtitles = parseSRT(content);
  
  let vtt = 'WEBVTT\n\n';
  
  for (const sub of subtitles) {
    const startTime = formatTimeVTT(sub.startTime);
    const endTime = formatTimeVTT(sub.endTime);
    
    vtt += `${sub.id}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${sub.text}\n\n`;
  }
  
  return vtt;
}

/**
 * Formatte un temps en secondes au format WebVTT (HH:MM:SS.mmm)
 */
function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

function pad(num: number, length: number = 2): string {
  return num.toString().padStart(length, '0');
}

/**
 * Trouve le sous-titre actif pour un temps donné
 */
export function findActiveSubtitle(
  subtitles: ParsedSRT[],
  currentTime: number
): ParsedSRT | null {
  for (const sub of subtitles) {
    if (currentTime >= sub.startTime && currentTime <= sub.endTime) {
      return sub;
    }
  }
  return null;
}

/**
 * Crée une URL blob à partir du contenu WebVTT
 */
export function createVTTBlobUrl(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}

/**
 * Charge et parse un fichier SRT depuis un File
 */
export async function loadSRTFile(file: File): Promise<ParsedSRT[]> {
  const content = await file.text();
  return parseSRT(content);
}

/**
 * Crée un élément track pour une vidéo à partir d'un fichier SRT
 */
export async function createSubtitleTrack(
  file: File,
  label: string = 'Français',
  srclang: string = 'fr'
): Promise<HTMLTrackElement> {
  const content = await file.text();
  const vttContent = convertSRTtoWebVTT(content);
  const blobUrl = createVTTBlobUrl(vttContent);
  
  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.label = label;
  track.srclang = srclang;
  track.src = blobUrl;
  track.default = true;
  
  return track;
}
