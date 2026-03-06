/**
 * Composant DropZone pour le drag & drop de dossiers
 * Style YouTube
 */
import { useState, useCallback, useRef } from 'react';
import { FolderOpen, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isFileSystemAccessSupported, showDirectoryPicker, parseFormationFolder } from '@/utils/folderParser';
import { parseFilesFromInput } from '@/utils/folderParser';
import type { Formation } from '@/types';
import { toast } from 'sonner';

interface DropZoneProps {
  onFormationsDetected: (formations: Formation[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean, message?: string) => void;
}

export function DropZone({ onFormationsDetected, isLoading, setIsLoading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Gérer le drag enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  // Gérer le drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  // Gérer le drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // Gérer le drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    
    setIsLoading(true, 'Analyse du dossier...');
    
    try {
      const formations: Formation[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.kind === 'file') {
          // @ts-ignore - webkitGetAsEntry est une API non standard mais supportée
          const entry = item.webkitGetAsEntry();
          
          if (entry && entry.isDirectory) {
            const files: File[] = [];
            const traverseDirectory = async (dirEntry: any, path: string = '') => {
              const reader = dirEntry.createReader();
              const entries: any[] = await new Promise((resolve) => {
                reader.readEntries(resolve);
              });
              
              for (const entry of entries) {
                if (entry.isFile) {
                  const file = await new Promise<File>((resolve) => {
                    entry.file(resolve);
                  });
                  // @ts-ignore
                  file.webkitRelativePath = path + entry.name;
                  files.push(file);
                } else if (entry.isDirectory) {
                  await traverseDirectory(entry, path + entry.name + '/');
                }
              }
            };
            
            await traverseDirectory(entry);
            
            const fileList = {
              length: files.length,
              item: (i: number) => files[i],
              [Symbol.iterator]: function* () {
                for (let i = 0; i < files.length; i++) {
                  yield files[i];
                }
              }
            };
            
            // @ts-ignore
            const parsedFormations = parseFilesFromInput(fileList);
            formations.push(...parsedFormations);
          }
        }
      }
      
      if (formations.length > 0) {
        onFormationsDetected(formations);
        toast.success(`${formations.length} formation(s) détectée(s)`);
      } else {
        toast.error('Aucune formation trouvée dans le dossier');
      }
    } catch (error) {
      console.error('Erreur lors du parsing:', error);
      toast.error('Erreur lors de l\'analyse du dossier');
    } finally {
      setIsLoading(false);
    }
  }, [onFormationsDetected, setIsLoading]);
  
  // Sélectionner un dossier via l'API File System Access
  const handleSelectFolder = async () => {
    if (isFileSystemAccessSupported()) {
      try {
        setIsLoading(true, 'Ouverture du sélecteur...');
        const dirHandle = await showDirectoryPicker();
        
        if (dirHandle) {
          setIsLoading(true, 'Analyse de la formation...');
          const formation = await parseFormationFolder(dirHandle);
          onFormationsDetected([formation]);
          toast.success('Formation chargée avec succès');
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'ouverture du dossier');
      } finally {
        setIsLoading(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  };
  
  // Gérer la sélection de fichiers via l'input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsLoading(true, 'Analyse des fichiers...');
    
    try {
      const formations = parseFilesFromInput(files);
      
      if (formations.length > 0) {
        onFormationsDetected(formations);
        toast.success(`${formations.length} formation(s) détectée(s)`);
      } else {
        toast.error('Aucune formation trouvée');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'analyse des fichiers');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <div className="w-full">
      {/* Zone de drag & drop */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center
          transition-all duration-300
          ${isDragging 
            ? 'border-[#FF0000] bg-[#FF0000]/10 scale-[1.02]' 
            : 'border-[#3f3f3f] bg-[#1a1a1a] hover:border-[#717171] hover:bg-[#272727]'
          }
          ${isLoading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#FF0000] animate-spin" />
            <p className="text-[#AAAAAA]">Analyse en cours...</p>
          </div>
        ) : (
          <>
            <div className={`
              w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isDragging ? 'bg-[#FF0000] scale-110' : 'bg-[#272727]'}
            `}>
              <Upload className={`
                w-10 h-10 transition-colors duration-300
                ${isDragging ? 'text-white' : 'text-[#AAAAAA]'}
              `} />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              {isDragging ? 'Déposez votre dossier ici' : 'Glissez-déposez un dossier'}
            </h3>
            
            <p className="text-[#AAAAAA] mb-6">
              ou utilisez le bouton ci-dessous pour parcourir
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleSelectFolder}
                size="lg"
                className="bg-[#FF0000] hover:bg-[#cc0000] text-white font-medium"
              >
                <FolderOpen className="w-5 h-5 mr-2" />
                Sélectionner un dossier
              </Button>
            </div>
            
            <p className="text-[#717171] text-sm mt-6">
              Structure attendue : dossiers numérotés contenant des vidéos (.mp4, .webm, etc.)
              <br />
              et fichiers de sous-titres (.srt) du même nom
            </p>
          </>
        )}
      </div>
      
      {/* Input file caché pour le fallback */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore - webkitdirectory est une propriété non standard
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
