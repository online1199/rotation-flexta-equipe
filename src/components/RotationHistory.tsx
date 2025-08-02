import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Unlock, Trash2, Calendar, Users, Clock, UserX, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
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

export function RotationHistory() {
  const { isAdmin } = useProfile();
  const { toast } = useToast();
  const [history, setHistory] = useState<RotationDay[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('rotations')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique des rotations",
          variant: "destructive"
        });
      } else {
        setHistory(data || []);
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

  const toggleLock = async (id: string, currentLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('rotations')
        .update({ locked: !currentLocked })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors du verrouillage:', error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier le verrouillage",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Succès",
          description: currentLocked ? "Journée déverrouillée" : "Journée verrouillée"
        });
        loadHistory();
      }
    } catch (error) {
      console.error('Erreur lors du verrouillage:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le verrouillage",
        variant: "destructive"
      });
    }
  };

  const deleteRotation = async (id: string, locked: boolean) => {
    if (locked) {
      toast({
        title: "Impossible",
        description: "Impossible de supprimer une journée verrouillée",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rotations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la rotation",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Succès",
          description: "Rotation supprimée"
        });
        loadHistory();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la rotation",
        variant: "destructive"
      });
    }
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

  if (history.length === 0) {
    return (
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Aucune rotation enregistrée pour le moment.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Historique des rotations</h2>
        <Badge variant="outline" className="text-sm">
          {history.length} journée{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-4">
        {history.map((rotation) => {
          const date = new Date(rotation.date);
          const dayName = format(date, 'EEEE', { locale: fr });
          const formattedDate = format(date, 'dd MMMM yyyy', { locale: fr });

          return (
            <Card key={rotation.id} className={rotation.locked ? 'border-amber-200 bg-amber-50/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span className="capitalize">{dayName} {formattedDate}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {rotation.locked && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Verrouillé
                      </Badge>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLock(rotation.id, rotation.locked)}
                          className="h-8 px-2"
                        >
                          {rotation.locked ? (
                            <Unlock className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRotation(rotation.id, rotation.locked)}
                          disabled={rotation.locked}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service 18h */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">Service 18h</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rotation.eighteen.length > 0 ? (
                      rotation.eighteen.map((person, index) => (
                        <Badge key={index} variant="default" className="text-sm">
                          {person}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Aucune personne assignée</span>
                    )}
                  </div>
                </div>

                {/* Sortie 16h */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Users className="h-4 w-4 text-secondary" />
                    <span className="font-medium">Sortie 16h</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rotation.sixteen.length > 0 ? (
                      rotation.sixteen.map((person, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {person}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Aucune personne assignée</span>
                    )}
                  </div>
                </div>

                {/* Absents */}
                {rotation.absents.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <UserX className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Absents</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rotation.absents.map((person, index) => (
                        <Badge key={index} variant="outline" className="text-sm text-muted-foreground">
                          {person}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Postes manquants */}
                {rotation.missing > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">Manquants</span>
                    </div>
                    <Badge variant="destructive" className="text-sm">
                      {rotation.missing} poste{rotation.missing > 1 ? 's' : ''} manquant{rotation.missing > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}