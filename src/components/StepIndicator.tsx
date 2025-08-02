import { Check, Users, Settings, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/store/useScheduleStore';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  {
    id: 1,
    title: "Équipe",
    description: "Ajouter 5 membres",
    icon: Users
  },
  {
    id: 2,
    title: "Paramètres",
    description: "Configurer le planning",
    icon: Settings
  },
  {
    id: 3,
    title: "Planning",
    description: "Visualiser et gérer",
    icon: Calendar
  }
];

export function StepIndicator() {
  const { currentStep, setCurrentStep, teamMembers, assignments } = useScheduleStore();

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const isStepAccessible = (stepId: number) => {
    switch (stepId) {
      case 1:
        return true;
      case 2:
        return teamMembers.length === 5;
      case 3:
        return teamMembers.length === 5 && assignments.length > 0;
      default:
        return false;
    }
  };

  const handleStepClick = (stepId: number) => {
    if (isStepAccessible(stepId)) {
      setCurrentStep(stepId);
    }
  };

  return (
    <nav aria-label="Progression">
      <ol className="flex items-center justify-center space-x-4 sm:space-x-8">
        {steps.map((step, stepIdx) => {
          const status = getStepStatus(step.id);
          const accessible = isStepAccessible(step.id);
          const Icon = step.icon;
          
          return (
            <li key={step.id} className="flex items-center">
              {/* Étape */}
              <div className="relative flex items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!accessible}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                    {
                      'bg-primary border-primary text-primary-foreground cursor-pointer hover:bg-primary-hover': status === 'current' && accessible,
                      'bg-success border-success text-success-foreground': status === 'completed',
                      'border-muted-foreground text-muted-foreground': status === 'upcoming' && !accessible,
                      'border-muted text-muted-foreground cursor-not-allowed': !accessible,
                      'hover:border-primary hover:text-primary cursor-pointer': accessible && status !== 'current' && status !== 'completed'
                    }
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </button>
                
                {/* Titre et description */}
                <div className="ml-3 hidden sm:block">
                  <p className={cn(
                    "text-sm font-medium",
                    {
                      'text-primary': status === 'current',
                      'text-success': status === 'completed',
                      'text-muted-foreground': status === 'upcoming'
                    }
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Connecteur */}
              {stepIdx < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 ml-4 sm:ml-8 transition-colors",
                  {
                    'bg-success': status === 'completed',
                    'bg-muted': status !== 'completed'
                  }
                )} />
              )}
            </li>
          );
        })}
      </ol>
      
      {/* Titre mobile */}
      <div className="sm:hidden text-center mt-4">
        <p className="text-sm font-medium">
          {steps.find(s => s.id === currentStep)?.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {steps.find(s => s.id === currentStep)?.description}
        </p>
      </div>
    </nav>
  );
}