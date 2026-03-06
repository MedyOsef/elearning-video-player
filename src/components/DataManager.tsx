/**
 * Composant pour gérer l'import/export des données de progression
 * Style YouTube
 */
import { useRef, useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { exportAllData, importAllData, clearAllData } from '@/services/indexedDB';

export function DataManager() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [importData, setImportData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const store = useAppStore();
  
  // Exporter les données
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `elearning-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      toast.success('Progression exportée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };
  
  // Ouvrir le sélecteur de fichier pour l'import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  // Lire le fichier sélectionné
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.formations || !Array.isArray(parsed.formations)) {
          toast.error('Format de fichier invalide');
          return;
        }
        setImportData(content);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast.error('Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Confirmer l'import
  const confirmImport = async () => {
    if (!importData) return;
    
    try {
      const parsed = JSON.parse(importData);
      await importAllData(parsed);
      
      const result = store.importData(importData);
      if (result.success) {
        toast.success('Progression importée avec succès');
        setIsImportDialogOpen(false);
        setImportData(null);
        window.location.reload();
      } else {
        toast.error(result.error || 'Erreur lors de l\'import');
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast.error('Erreur lors de l\'import des données');
    }
  };
  
  // Effacer toutes les données
  const handleClear = async () => {
    try {
      await clearAllData();
      store.clearAllData();
      toast.success('Toutes les données ont été effacées');
      setIsClearDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression des données');
    }
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {/* Bouton Exporter */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="border-[#3f3f3f] text-[#AAAAAA] hover:bg-[#272727] hover:text-white bg-transparent"
      >
        <Download className="w-4 h-4 mr-2" />
        Exporter
      </Button>
      
      {/* Bouton Importer */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleImportClick}
        className="border-[#3f3f3f] text-[#AAAAAA] hover:bg-[#272727] hover:text-white bg-transparent"
      >
        <Upload className="w-4 h-4 mr-2" />
        Importer
      </Button>
      
      {/* Bouton Effacer */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsClearDialogOpen(true)}
        className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 bg-transparent"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Effacer
      </Button>
      
      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Dialog de confirmation d'import */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#272727] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#FF0000]" />
              Confirmer l'import
            </DialogTitle>
            <DialogDescription className="text-[#AAAAAA]">
              Cette action remplacera toutes vos données de progression actuelles.
              Assurez-vous d\'avoir exporté vos données si vous souhaitez les conserver.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportData(null);
              }}
              className="border-[#3f3f3f] text-[#AAAAAA] hover:bg-[#272727]"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmImport}
              className="bg-[#FF0000] hover:bg-[#cc0000] text-white"
            >
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de confirmation d'effacement */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#272727] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Effacer toutes les données
            </DialogTitle>
            <DialogDescription className="text-[#AAAAAA]">
              Cette action est irréversible. Toutes vos progressions, historiques
              et données seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsClearDialogOpen(false)}
              className="border-[#3f3f3f] text-[#AAAAAA] hover:bg-[#272727]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Effacer tout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
