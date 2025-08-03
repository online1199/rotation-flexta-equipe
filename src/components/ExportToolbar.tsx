import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileText, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { exportToCSV, exportToICS, exportToJSON, importFromJSON, downloadFile } from '@/lib/export';
import { clearAllData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function ExportToolbar() {
  const { toast } = useToast();
  const { 
    teamMembers, 
    assignments, 
    plannerParams, 
    setTeamMembers, 
    setPlannerParams,
    loadFromStorage,
    clearAll
  } = useScheduleStore();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = async () => {
    if (assignments.length === 0) {
      toast({
        title: "Aucun planning",
        description: "Générez d'abord un planning avant d'exporter.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      const csvContent = exportToCSV(assignments);
      const filename = `planning-rotation-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      downloadFile(csvContent, filename, 'text/csv');
      
      toast({
        title: "Export CSV réussi",
        description: `Le fichier ${filename} a été téléchargé.`
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier CSV.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportICS = async () => {
    if (assignments.length === 0) {
      toast({
        title: "Aucun planning",
        description: "Générez d'abord un planning avant d'exporter.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      const icsContent = await exportToICS(assignments);
      const filename = `planning-rotation-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      downloadFile(icsContent, filename, 'text/calendar');
      
      toast({
        title: "Export ICS réussi",
        description: `Le fichier ${filename} a été téléchargé.`
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier ICS.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonContent = exportToJSON(assignments, teamMembers, plannerParams);
      const filename = `planning-rotation-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      downloadFile(jsonContent, filename, 'application/json');
      
      toast({
        title: "Sauvegarde créée",
        description: `Le fichier ${filename} a été téléchargé.`
      });
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de créer le fichier de sauvegarde.",
        variant: "destructive"
      });
    }
  };

  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = importFromJSON(content);
        
        // Restaurer les données
        if (data.teamMembers) {
          setTeamMembers(data.teamMembers);
        }
        if (data.plannerParams) {
          setPlannerParams(data.plannerParams);
        }
        
        // Recharger depuis le stockage pour récupérer les assignments
        loadFromStorage();
        
        setIsImportDialogOpen(false);
        toast({
          title: "Import réussi",
          description: "Les données ont été restaurées avec succès."
        });
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: error instanceof Error ? error.message : "Fichier invalide.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleClearAll = () => {
    clearAll();
    clearAllData();
    setIsClearDialogOpen(false);
    
    toast({
      title: "Données effacées",
      description: "Toutes les données ont été supprimées."
    });
  };

  const hasData = teamMembers.length > 0 || assignments.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center p-4 border rounded-lg bg-muted/50">
      <h3 className="text-sm font-medium mr-4">Actions sur le planning :</h3>
      
      {/* Export CSV */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        disabled={isExporting || assignments.length === 0}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Export CSV
      </Button>

      {/* Export ICS */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportICS}
        disabled={isExporting || assignments.length === 0}
        className="gap-2"
      >
        <CalendarIcon className="h-4 w-4" />
        Export ICS
      </Button>

      {/* Sauvegarde JSON */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJSON}
        disabled={!hasData}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Sauvegarder
      </Button>

      {/* Import JSON */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Restaurer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer une sauvegarde</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier JSON de sauvegarde pour restaurer vos données.
              Cette action remplacera les données actuelles.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Fichier de sauvegarde</Label>
              <Input
                id="import-file"
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleImportJSON}>
                Sélectionner un fichier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tout effacer */}
      {hasData && (
        <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Tout effacer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Cette action supprimera définitivement toutes les données :
                équipe, planning, paramètres et jours verrouillés.
                Cette action ne peut pas être annulée.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleClearAll}>
                Tout supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}