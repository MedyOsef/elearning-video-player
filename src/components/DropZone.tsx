/**
 * Composant DropZone pour le drag & drop de dossiers
 * Style YouTube
 */
import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FolderOpen, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isFileSystemAccessSupported, showDirectoryPicker, parseFormationFolder } from '@/utils/folderParser';
import { parseFilesFromInput } from '@/utils/folderParser';
import type { Formation } from '@/types';
import { toast } from 'sonner';

// Type pour les fichiers avec leur chemin relatif
interface FileWithPath {
  file: File;
  webkitRelativePath: string;
}

interface DropZoneProps {
  onFormationsDetected: (formations: Formation[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean, message?: string) => void;
}

export function DropZone({ onFormationsDetected, isLoading, setIsLoading }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  
  // Traverser un dossier via getAsFileSystemHandle (pour Chrome/Edge)
  const traverseDirectoryEntry = useCallback(async (entry: any, path: string = ''): Promise<FileWithPath[]> => {
    const files: FileWithPath[] = [];
    
    if ((entry as FileSystemFileEntry).isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push({
        file,
        webkitRelativePath: path + entry.name
      });
    } else if ((entry as FileSystemDirectoryEntry).isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let entries: any[] = [];
      let moreEntries = true;
      
      // readEntries() a un bug: il faut l'appeler en boucle
      while (moreEntries) {
        const batch: any[] = await new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });
        
        if (batch.length === 0) {
          moreEntries = false;
        } else {
          entries = entries.concat(batch);
        }
      }
      
      for (const subEntry of entries) {
        const subFiles = await traverseDirectoryEntry(subEntry, path + entry.name + '/');
        files.push(...subFiles);
      }
    }
    
    return files;
  }, []);
  
  // Traiter les fichiers dropés ou sélectionnés
  const processFilesWithPath = useCallback(async (filesToProcess: FileWithPath[]) => {
    setIsLoading(true, 'Analyse des fichiers...');
    
    try {
      const formations = parseFilesFromInput(filesToProcess);
      
      if (formations.length > 0) {
        onFormationsDetected(formations);
        toast.success(`${formations.length} formation(s) détectée(s)`);
      } else {
        toast.error('Aucune formation trouvée dans les fichiers');
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse des fichiers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors de l'analyse du dossier: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [onFormationsDetected, setIsLoading]);
  
  // Traiter les fichiers dropés
  const processFiles = useCallback(async (acceptedFiles: File[], dataTransferItems?: DataTransferItem[]) => {
    let filesToProcess: FileWithPath[] = [];
    
    // Sur Chrome/Edge, react-dropzone ne préserve pas webkitRelativePath
    // Essayer de récupérer la structure depuis DataTransferItems
    if (dataTransferItems && dataTransferItems.length > 0) {
      for (const item of dataTransferItems) {
        if (item.kind === 'file') {
          // @ts-ignore - webkitGetAsEntry est supporté sur tous les navigateurs
          const entry = item.webkitGetAsEntry();
          
          if (entry && entry.isDirectory) {
            const files = await traverseDirectoryEntry(entry);
            filesToProcess.push(...files);
          } else if (entry && (entry as FileSystemFileEntry).isFile) {
            const file = await new Promise<File>((resolve, reject) => {
              (entry as FileSystemFileEntry).file(resolve, reject);
            });
            filesToProcess.push({
              file,
              webkitRelativePath: entry.name
            });
          }
        }
      }
    }
    
    // Si pas de DataTransferItems, utiliser les fichiers acceptés (fallback pour Firefox et le button)
    if (filesToProcess.length === 0) {
      filesToProcess = acceptedFiles.map(file => ({
        file,
        webkitRelativePath: file.webkitRelativePath || file.name
      }));
    }
    
    await processFilesWithPath(filesToProcess);
  }, [traverseDirectoryEntry, processFilesWithPath]);
  
  // Wrapper pour accepter la signature de react-dropzone
  const handleDropzoneFiles = useCallback(async (acceptedFiles: File[], _fileRejections?: any, event?: any) => {
    await processFiles(acceptedFiles, event?.dataTransfer?.items);
  }, [processFiles]);
  
  // Configuration de react-dropzone
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDropzoneFiles,
    noClick: true,
  });
  
  // Handlers personnalisés pour capturer les DataTransferItems sur Chrome/Edge
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      // Passer les DataTransferItems en plus des fichiers
      const dragFiles = Array.from(items).map(item => {
        if (item.kind === 'file') {
          return item.getAsFile() as File;
        }
        return null;
      }).filter((f): f is File => f !== null);
      
      await processFiles(dragFiles, Array.from(items));
    }
  }, [processFiles]);
  
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
        console.error('Erreur lors de l\'ouverture du dossier:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        toast.error(`Erreur lors de l'ouverture du dossier: ${errorMessage}`);
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
    
    const filesWithPath: FileWithPath[] = Array.from(files).map(file => ({
      file,
      webkitRelativePath: file.webkitRelativePath || file.name
    }));
    
    processFilesWithPath(filesWithPath);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="w-full">
      {/* Zone de drag & drop */}
      <div
        {...getRootProps()}
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
      
      {/* Input de react-dropzone (invisible) */}
      <input {...getInputProps()} />
    </div>
  );
}
