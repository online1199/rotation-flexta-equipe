import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Users, Calendar, Clock, List, CalendarDays } from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { TeamForm } from '@/components/TeamForm';
import { PlannerParams } from '@/components/PlannerParams';
import { ScheduleList } from '@/components/ScheduleList';
import { CalendarView } from '@/components/CalendarView';
import { Toolbar } from '@/components/Toolbar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useScheduleStore } from '@/store/useScheduleStore';

const Index = () => {
  const { currentStep, setCurrentStep, loadFromStorage, teamMembers, assignments } = useScheduleStore();

  // Charger les données au démarrage
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <TeamForm />;
      case 2:
        return <PlannerParams />;
      case 3:
        return (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Vue liste
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Vue calendrier
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <ScheduleList />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarView />
            </TabsContent>
          </Tabs>
        );
      default:
        return <TeamForm />;
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return teamMembers.length === 5;
      case 2:
        return teamMembers.length === 5;
      case 3:
        return false; // Pas de prochaine étape
      default:
        return false;
    }
  };

  const getNextStepText = () => {
    switch (currentStep) {
      case 1:
        return "Configurer les paramètres";
      case 2:
        return assignments.length > 0 ? "Voir le planning" : "Générer le planning";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Planning de rotation – 18h / 16h
              </h1>
              <p className="text-muted-foreground mt-2">
                Gérez équitablement les horaires de sortie de votre équipe de 5 personnes
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Toolbar />
            </div>
          </div>
          
          <Separator className="mt-6" />
          
          {/* Indicateur d'étapes */}
          <div className="mt-6">
            <StepIndicator />
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{teamMembers.length}/5</p>
                  <p className="text-xs text-muted-foreground">Membres d'équipe</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <Calendar className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{assignments.length}</p>
                  <p className="text-xs text-muted-foreground">Jours planifiés</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <Clock className="h-8 w-8 text-primary mr-3" />
                <div>
                  <p className="text-2xl font-bold">{assignments.filter(a => a.locked).length}</p>
                  <p className="text-xs text-muted-foreground">Jours verrouillés</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenu de l'étape actuelle */}
          <div className="space-y-6 animate-fade-in">
            {renderStepContent()}
          </div>

          {/* Navigation entre étapes */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
            >
              Étape précédente
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Étape {currentStep} sur 3
            </div>
            
            {canGoNext() && (
              <Button onClick={handleNextStep}>
                {getNextStepText()}
              </Button>
            )}
            
            {!canGoNext() && currentStep < 3 && (
              <Button disabled>
                {currentStep === 1 ? "Complétez l'équipe" : "Générez le planning"}
              </Button>
            )}
            
            {currentStep === 3 && (
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Recommencer
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Pied de page */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Application de planification de rotation • Algorithme équitable garantissant 3 créneaux 18h et 2 créneaux 16h par cycle de 5 jours
            </p>
            <p className="mt-2">
              Données sauvegardées localement dans votre navigateur
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;