/**
 * Hook pour gérer les raccourcis clavier du lecteur vidéo
 */
import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onTogglePlay?: () => void;
  onSeekForward?: (seconds?: number) => void;
  onSeekBackward?: (seconds?: number) => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onNextVideo?: () => void;
  onPreviousVideo?: () => void;
  onSpeedUp?: () => void;
  onSpeedDown?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  onToggleFullscreen,
  onNextVideo,
  onPreviousVideo,
  onSpeedUp,
  onSpeedDown,
  enabled = true
}: KeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignorer si l'utilisateur est en train de taper dans un input
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    const key = event.key.toLowerCase();
    const shift = event.shiftKey;
    
    switch (key) {
      case ' ':
      case 'k':
        event.preventDefault();
        onTogglePlay?.();
        break;
        
      case 'arrowright':
        event.preventDefault();
        if (shift) {
          onSeekForward?.(30);
        } else {
          onSeekForward?.(10);
        }
        break;
        
      case 'arrowleft':
        event.preventDefault();
        if (shift) {
          onSeekBackward?.(30);
        } else {
          onSeekBackward?.(10);
        }
        break;
        
      case 'arrowup':
        event.preventDefault();
        onVolumeUp?.();
        break;
        
      case 'arrowdown':
        event.preventDefault();
        onVolumeDown?.();
        break;
        
      case 'm':
        event.preventDefault();
        onToggleMute?.();
        break;
        
      case 'f':
        event.preventDefault();
        onToggleFullscreen?.();
        break;
        
      case 'n':
      case 'pagedown':
        event.preventDefault();
        onNextVideo?.();
        break;
        
      case 'p':
      case 'pageup':
        event.preventDefault();
        onPreviousVideo?.();
        break;
        
      case '>':
      case '.':
        if (shift) {
          event.preventDefault();
          onSpeedUp?.();
        }
        break;
        
      case '<':
      case ',':
        if (shift) {
          event.preventDefault();
          onSpeedDown?.();
        }
        break;
        
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // Seek to percentage (0-9 = 0%-90%)
        // Cette fonctionnalité nécessite une fonction de seek absolu
        break;
        
      case 'home':
        event.preventDefault();
        onSeekBackward?.(Infinity);
        break;
        
      case 'end':
        event.preventDefault();
        onSeekForward?.(Infinity);
        break;
    }
  }, [
    enabled,
    onTogglePlay,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    onToggleFullscreen,
    onNextVideo,
    onPreviousVideo,
    onSpeedUp,
    onSpeedDown
  ]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook pour les raccourcis globaux de l'application
 */
interface GlobalShortcutsOptions {
  onEscape?: () => void;
  enabled?: boolean;
}

export function useGlobalShortcuts({
  onEscape,
  enabled = true
}: GlobalShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);
}
