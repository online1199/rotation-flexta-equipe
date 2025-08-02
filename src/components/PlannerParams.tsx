import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PlannerParams() {
  const { 
    teamMembers, 
    plannerParams, 
    setPlannerParams, 
    generateSchedule: generateScheduleAction,
    setCurrentStep 
  } = useScheduleStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setPlannerParams({
        ...plannerParams,
        startDate: date
      });
    }
  };

  const handleNumberOfDaysChange = (value: string) => {
    const days = parseInt(value, 10);
    if (!isNaN(days) && days > 0 && days <= 365) {
      setPlannerParams({
        ...plannerParams,
        numberOfDays: days
      });
    }
  };

  const handleSkipWeekendsChange = (checked: boolean) => {
    setPlannerParams({
      ...plannerParams,
      skipWeekends: checked
    });
  };

  const handleGenerateSchedule = async () => {
    if (teamMembers.length !== 5) {
      toast({
        title: "Équipe incomplète",
        description: "Il faut exactement 5 personnes pour générer le planning.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      generateScheduleAction();
      toast({
        title: "Planning généré !",
        description: `${plannerParams.numberOfDays} jour(s) planifié(s) avec succès.`
      });
      setCurrentStep(3); // Passer à l'étape du planning
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le planning.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetToDefaults = () => {
    setPlannerParams({
      startDate: new Date(),
      numberOfDays: 10,
      skipWeekends: true
    });
    toast({
      title: "Paramètres réinitialisés",
      description: "Les valeurs par défaut ont été restaurées."
    });
  };

  const isTeamReady = teamMembers.length === 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Paramètres du planning
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </CardTitle>
        <CardDescription>
          Configurez les paramètres pour générer le planning de rotation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vérification équipe */}
        {!isTeamReady && (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Attention :</strong> Vous devez d'abord compléter l'équipe avec 5 personnes 
              avant de pouvoir générer un planning.
            </p>
          </div>
        )}

        {/* Date de début */}
        <div className="space-y-2">
          <Label htmlFor="start-date">Date de début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !plannerParams.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {plannerParams.startDate ? (
                  format(plannerParams.startDate, 'dd/MM/yyyy', { locale: fr })
                ) : (
                  "Sélectionner une date"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={plannerParams.startDate}
                onSelect={handleStartDateChange}
                initialFocus
                locale={fr}
                disabled={(date) => date < new Date('1900-01-01')}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Nombre de jours */}
        <div className="space-y-2">
          <Label htmlFor="number-of-days">Nombre de jours à planifier</Label>
          <Input
            id="number-of-days"
            type="number"
            min="1"
            max="365"
            value={plannerParams.numberOfDays}
            onChange={(e) => handleNumberOfDaysChange(e.target.value)}
            placeholder="Ex: 10"
          />
          <p className="text-xs text-muted-foreground">
            Entre 1 et 365 jours
          </p>
        </div>

        {/* Option week-ends */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="skip-weekends" className="text-base font-medium">
              Ignorer les week-ends
            </Label>
            <p className="text-sm text-muted-foreground">
              Exclure samedi et dimanche du planning
            </p>
          </div>
          <Switch
            id="skip-weekends"
            checked={plannerParams.skipWeekends}
            onCheckedChange={handleSkipWeekendsChange}
          />
        </div>

        {/* Récapitulatif */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <h4 className="font-medium">Récapitulatif</h4>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Début :</span> {' '}
              {format(plannerParams.startDate, 'dd/MM/yyyy', { locale: fr })}
            </p>
            <p>
              <span className="font-medium">Durée :</span> {plannerParams.numberOfDays} jour(s)
            </p>
            <p>
              <span className="font-medium">Week-ends :</span> {' '}
              {plannerParams.skipWeekends ? 'Ignorés' : 'Inclus'}
            </p>
            {isTeamReady && (
              <p>
                <span className="font-medium">Équipe :</span> {teamMembers.length} personne(s) prête(s)
              </p>
            )}
          </div>
        </div>

        {/* Bouton de génération */}
        <Button
          onClick={handleGenerateSchedule}
          disabled={!isTeamReady || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? "Génération en cours..." : "Générer le planning"}
        </Button>
      </CardContent>
    </Card>
  );
}