import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Plus, Trash2, Eye, History } from 'lucide-react';
import { RotationHistory } from '@/components/RotationHistory';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Rotation {
  id: string;
  date: string;
  eighteen: string[];
  sixteen: string[];
  absents: string[];
  missing: number;
}

interface Leave {
  id: string;
  start_date: string;
  end_date: string;
}

export function UserView() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Leave form
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [addingLeave, setAddingLeave] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load rotations (public read)
      const { data: rotationsData, error: rotationsError } = await supabase
        .from('rotations')
        .select('*')
        .order('date', { ascending: true });

      if (rotationsError) throw rotationsError;
      setRotations(rotationsData || []);

      // Load user's leaves
      const { data: leavesData, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date');

      if (leavesError) throw leavesError;
      setLeaves(leavesData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addLeave = async () => {
    if (!startDate || !endDate || !user) {
      toast({
        title: "Données manquantes",
        description: "Veuillez sélectionner une date de début et de fin.",
        variant: "destructive"
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Dates invalides",
        description: "La date de début doit être antérieure à la date de fin.",
        variant: "destructive"
      });
      return;
    }

    setAddingLeave(true);
    try {
      const { error } = await supabase
        .from('leaves')
        .insert({
          user_id: user.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        });

      if (error) throw error;

      toast({
        title: "Congé ajouté",
        description: "Votre période de congé a été enregistrée.",
      });

      setStartDate(undefined);
      setEndDate(undefined);
      loadData();
    } catch (error: any) {
      console.error('Error adding leave:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le congé.",
        variant: "destructive"
      });
    } finally {
      setAddingLeave(false);
    }
  };

  const removeLeave = async (leaveId: string) => {
    try {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: "Congé supprimé",
        description: "La période de congé a été supprimée.",
      });

      loadData();
    } catch (error: any) {
      console.error('Error removing leave:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le congé.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Chargement...</div>;
  }

  return (
    <Tabs defaultValue="planning" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="planning" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Planning
        </TabsTrigger>
        <TabsTrigger value="leaves" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Mes congés
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique
        </TabsTrigger>
      </TabsList>

      <TabsContent value="planning">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Planning de rotation
            </CardTitle>
            <CardDescription>
              Consultez le planning généré par l'administrateur ({rotations.length} jours planifiés)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rotations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun planning disponible. L'administrateur doit d'abord générer un planning.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {rotations.map((rotation) => (
                  <div key={rotation.id} className="p-3 border rounded-lg">
                    <div className="font-medium">
                      {format(new Date(rotation.date), "EEEE d MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">18h:</span> {rotation.eighteen.join(", ") || "Aucun"}
                      {" | "}
                      <span className="font-medium">16h:</span> {rotation.sixteen.join(", ") || "Aucun"}
                      {rotation.absents.length > 0 && (
                        <>
                          {" | "}
                          <span className="text-orange-600 font-medium">Absents:</span> {rotation.absents.join(", ")}
                        </>
                      )}
                      {rotation.missing > 0 && (
                        <>
                          {" | "}
                          <span className="text-red-600 font-medium">Postes manquants:</span> {rotation.missing}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="leaves">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Mes congés
          </CardTitle>
          <CardDescription>
            Gérez vos périodes de congé (seuls vous et l'administrateur pouvez les modifier)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire d'ajout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP", { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP", { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={addLeave}
                disabled={addingLeave || !startDate || !endDate}
                className="w-full"
              >
                {addingLeave ? "Ajout..." : "Ajouter congé"}
              </Button>
            </div>
          </div>

          {/* Liste des congés */}
          <div className="space-y-2">
            <h4 className="font-medium">Mes congés déclarés ({leaves.length})</h4>
            {leaves.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun congé déclaré.</p>
            ) : (
              <div className="space-y-2">
                {leaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">
                        Du {format(new Date(leave.start_date), "PPP", { locale: fr })}
                      </span>
                      <span className="text-muted-foreground"> au </span>
                      <span className="font-medium">
                        {format(new Date(leave.end_date), "PPP", { locale: fr })}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLeave(leave.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="history">
        <RotationHistory />
      </TabsContent>
    </Tabs>
  );
}