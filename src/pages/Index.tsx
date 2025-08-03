import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AuthGuard } from "@/components/AuthGuard";
import { CalendarView } from "@/components/CalendarView";
import { ScheduleList } from "@/components/ScheduleList";
import { TeamForm } from "@/components/TeamForm";
import { AdminPlanner } from "@/components/AdminPlanner";
import { UserView } from "@/components/UserView";
import { RotationHistory } from "@/components/RotationHistory";
import { Toolbar } from "@/components/Toolbar";
import { StepIndicator } from "@/components/StepIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, Users, Calendar, Clock, List, CalendarDays, RotateCcw, Lock, History, ArrowLeft } from "lucide-react";
import { useScheduleStore } from '@/store/useScheduleStore';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, isAdmin } = useProfile();
  const navigate = useNavigate();
  const { currentStep, setCurrentStep, teamMembers, assignments, lockedDays, initializeFromSupabase, loadLatestScheduleForAdmin } = useScheduleStore();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!authLoading && !profileLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, profileLoading, user, navigate]);

  // Charger les données depuis Supabase quand l'utilisateur est connecté
  useEffect(() => {
    if (user && !authLoading && !profileLoading) {
      initializeFromSupabase();
      
      // Pour les admins, charger automatiquement le dernier planning
      if (isAdmin) {
        console.log('👑 Admin detected, loading latest schedule...');
        loadLatestScheduleForAdmin();
      }
    }
  }, [user, authLoading, profileLoading, initializeFromSupabase, loadLatestScheduleForAdmin, isAdmin]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    if (isAdmin) {
      // Interface admin : génération et gestion complète
      switch (currentStep) {
        case 1:
          return <TeamForm />;
        case 2:
          return <AdminPlanner />;
        case 3:
          return showHistory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour au planning
                </Button>
              </div>
              <RotationHistory onPlanningLoaded={() => setShowHistory(false)} />
            </div>
          ) : (
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
    } else {
      // Interface utilisateur : consultation et congés uniquement
      return <UserView />;
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
        return false;
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
    <AuthGuard>
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
                  Bienvenue, {profile?.first_name} {profile?.last_name} ({profile?.role})
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
                <ThemeToggle />
                {isAdmin && <Toolbar onShowHistory={() => setShowHistory(true)} />}
              </div>
            </div>
            
            <Separator className="mt-6" />
            
            {/* Indicateur d'étapes (Admin uniquement) */}
            {isAdmin && (
              <div className="mt-6">
                <StepIndicator />
              </div>
            )}
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Statistiques rapides (Admin uniquement) */}
            {isAdmin && (
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
                    <Lock className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <p className="text-2xl font-bold">{Object.keys(lockedDays).length}</p>
                      <p className="text-xs text-muted-foreground">Jours verrouillés</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contenu de l'étape actuelle */}
            <div className="space-y-6 animate-fade-in">
              {renderContent()}
            </div>

            {/* Navigation entre étapes (Admin uniquement) */}
            {isAdmin && (
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
            )}
          </div>
        </main>

        {/* Pied de page */}
        <footer className="border-t bg-muted/30 mt-16">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Application de planification de rotation • Données sécurisées avec Supabase
              </p>
              <p className="mt-2">
                {isAdmin 
                  ? "Interface administrateur - Gestion complète du planning"
                  : "Interface utilisateur - Consultation du planning et gestion des congés"
                }
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
};

export default Index;