import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Unlock, Trash2, Calendar, Users, Clock, UserX, AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { format, parseISO, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RotationDay {
  id: string;
  date: string;
  eighteen: string[];
  sixteen: string[];
  absents: string[];
  missing: number;
  locked: boolean;
  generated_by: string;
  generated_at: string;
}

interface PlanningGroup {
  id: string;
  startDate: Date;
  endDate: Date;
  rotations: RotationDay[];
  generated_at: string;
}

export function RotationHistory() {
  const { isAdmin } = useProfile();
  const { toast } = useToast();
  const { setCurrentStep } = useScheduleStore();
  const [planningGroups, setPlanningGroups] = useState<PlanningGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('rotations')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique des rotations",
          variant: "destructive"
        });
      } else {
        // Grouper les rotations par période de génération
        const groups = groupRotationsByGeneration(data || []);
        setPlanningGroups(groups);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des rotations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const groupRotationsByGeneration = (rotations: RotationDay[]): PlanningGroup[] => {
    const groups: { [key: string]: RotationDay[] } = {};
    
    // Grouper par date de génération (en ignorant l'heure)
    rotations.forEach(rotation => {
      const generatedDate = rotation.generated_at ? 
        format(parseISO(rotation.generated_at), 'yyyy-MM-dd') : 
        'unknown';
      
      if (!groups[generatedDate]) {
        groups[generatedDate] = [];
      }
      groups[generatedDate].push(rotation);
    });

    // Transformer en PlanningGroup et trier
    return Object.entries(groups)
      .map(([genDate, rots]) => {
        const sortedRotations = rots.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        return {
          id: genDate,
          startDate: new Date(sortedRotations[0].date),
          endDate: new Date(sortedRotations[sortedRotations.length - 1].date),
          rotations: sortedRotations,
          generated_at: sortedRotations[0].generated_at
        };
      })
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  };

  const loadPlanningGroup = async (group: PlanningGroup) => {
    // Charger ce planning dans le store
    const assignments = group.rotations.map(rotation => ({
      dateISO: rotation.date,
      eighteen: rotation.eighteen,
      sixteen: rotation.sixteen,
      absents: rotation.absents,
      missing: rotation.missing
    }));

    useScheduleStore.setState({ assignments });
    
    // Passer à la vue liste
    setCurrentStep(2);
    
    toast({
      title: "Planning chargé",
      description: `Planning du ${format(group.startDate, 'dd/MM/yyyy', { locale: fr })} au ${format(group.endDate, 'dd/MM/yyyy', { locale: fr })} chargé avec succès.`
    });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  if (planningGroups.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Aucun planning enregistré pour le moment.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Historique des plannings</h2>
        <Badge variant="outline" className="text-sm">
          {planningGroups.length} planning{planningGroups.length > 1 ? 's' : ''} généré{planningGroups.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6">
        {planningGroups.map((group) => {
          const totalDays = group.rotations.length;
          const lockedDays = group.rotations.filter(r => r.locked).length;
          
          return (
            <Card key={group.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Planning du {format(group.startDate, 'dd/MM/yyyy', { locale: fr })} au {format(group.endDate, 'dd/MM/yyyy', { locale: fr })}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Généré le {format(parseISO(group.generated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Badge variant="outline">{totalDays} jours</Badge>
                      {lockedDays > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {lockedDays} verrouillé{lockedDays > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      onClick={() => loadPlanningGroup(group)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Voir le planning
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Services 18h planifiés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-secondary" />
                    <span>Sorties 16h planifiées</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{totalDays} jours de planning</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}