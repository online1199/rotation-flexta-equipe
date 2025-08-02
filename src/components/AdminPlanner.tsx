import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateScheduleWithLeaves } from '@/lib/rotation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScheduleStore } from '@/store/useScheduleStore';

interface GeneratedDay {
  date: string;
  eighteen: string[];
  sixteen: string[];
  absents: string[];
  missing: number;
}

export function AdminPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teamMembers } = useScheduleStore();
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAndSave = async () => {
    if (teamMembers.length !== 5) {
      toast({
        title: "Équipe incomplète",
        description: "L'équipe doit contenir exactement 5 membres pour générer un planning.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour générer un planning.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const people = teamMembers.map(member => ({
        id: member.id,
        name: member.name,
        leaves: member.leaves || []
      }));
      
      // Utiliser des valeurs par défaut pour simplifier l'UX
      const startDate = new Date();
      const numberOfDays = 30;
      const skipWeekends = true;
      
      const scheduleAssignments = generateScheduleWithLeaves(
        people,
        startDate,
        numberOfDays,
        skipWeekends
      );

      // Save to Supabase
      const rotationsData = scheduleAssignments.map(assignment => ({
        date: assignment.dateISO,
        eighteen: assignment.eighteen,
        sixteen: assignment.sixteen,
        absents: assignment.absents,
        missing: assignment.missing,
        generated_by: user.id
      }));

      const { error } = await supabase
        .from('rotations')
        .upsert(rotationsData, { onConflict: 'date' });

      if (error) throw error;

      toast({
        title: "Planning généré et sauvegardé",
        description: `${scheduleAssignments.length} jours ont été générés et enregistrés avec succès.`,
      });

    } catch (error: any) {
      console.error('Erreur lors de la génération:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la génération du planning.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Générateur de planning
        </CardTitle>
        <CardDescription>
          Génère un planning de 30 jours à partir d'aujourd'hui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          {teamMembers.length === 5 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">Équipe complète ({teamMembers.length}/5 membres)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Équipe incomplète ({teamMembers.length}/5 membres)</span>
            </>
          )}
        </div>

        {/* Action */}
        <Button 
          onClick={handleGenerateAndSave}
          disabled={teamMembers.length !== 5 || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? "Génération en cours..." : "Générer et sauvegarder le planning"}
        </Button>
      </CardContent>
    </Card>
  );
}