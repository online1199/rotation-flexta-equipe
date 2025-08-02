import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [numberOfDays, setNumberOfDays] = useState(30);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedDay[]>([]);

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
      
      const scheduleAssignments = generateScheduleWithLeaves(
        people,
        startDate,
        numberOfDays,
        skipWeekends
      );

      // Convert Assignment[] to GeneratedDay[]
      const schedule: GeneratedDay[] = scheduleAssignments.map(assignment => ({
        date: assignment.dateISO,
        eighteen: assignment.eighteen,
        sixteen: assignment.sixteen,
        absents: assignment.absents,
        missing: assignment.missing
      }));

      setGeneratedSchedule(schedule);

      // Save to Supabase
      const rotationsData = schedule.map(day => ({
        date: day.date,
        eighteen: day.eighteen,
        sixteen: day.sixteen,
        absents: day.absents,
        missing: day.missing,
        generated_by: user.id
      }));

      const { error } = await supabase
        .from('rotations')
        .upsert(rotationsData, { onConflict: 'date' });

      if (error) throw error;

      toast({
        title: "Planning généré et sauvegardé",
        description: `${schedule.length} jours ont été générés et enregistrés avec succès.`,
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

  const resetForm = () => {
    setStartDate(new Date());
    setNumberOfDays(30);
    setSkipWeekends(true);
    setGeneratedSchedule([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Générateur de planning (Admin)
          </CardTitle>
          <CardDescription>
            Configurez et générez un planning automatique qui sera sauvegardé en base de données.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date de début */}
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
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Nombre de jours */}
            <div className="space-y-2">
              <Label htmlFor="numberOfDays">Nombre de jours</Label>
              <Input
                id="numberOfDays"
                type="number"
                min="1"
                max="365"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Skip weekends */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ignorer les week-ends</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="skip-weekends"
                  checked={skipWeekends}
                  onCheckedChange={setSkipWeekends}
                />
                <Label htmlFor="skip-weekends" className="text-sm">
                  {skipWeekends ? "Oui" : "Non"}
                </Label>
              </div>
            </div>
          </div>

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

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={handleGenerateAndSave}
              disabled={teamMembers.length !== 5 || isGenerating}
              className="flex-1"
            >
              {isGenerating ? "Génération en cours..." : "Générer et sauvegarder le planning"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated schedule preview */}
      {generatedSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planning généré et sauvegardé</CardTitle>
            <CardDescription>
              Aperçu des {generatedSchedule.length} jours générés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {generatedSchedule.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(new Date(day.date), "EEEE d MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      18h: {day.eighteen.join(", ") || "Aucun"} | 
                      16h: {day.sixteen.join(", ") || "Aucun"}
                      {day.absents.length > 0 && (
                        <span className="text-orange-600"> | Absents: {day.absents.join(", ")}</span>
                      )}
                      {day.missing > 0 && (
                        <span className="text-red-600"> | Manque: {day.missing}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}