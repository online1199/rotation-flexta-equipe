import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { generateInitials } from '@/lib/rotation';

// Couleurs simplifiées par créneau
const SHIFT_COLORS = {
  '18h': 'hsl(32, 95%, 44%)',   // Orange pour 18h
  '16h': 'hsl(142, 71%, 45%)',  // Vert pour 16h
};

export function CalendarView() {
  const { assignments } = useScheduleStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Obtenir les jours à afficher (incluant début/fin de semaine pour compléter la grille)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lundi = début semaine
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Créer une carte des affectations par date
  const assignmentsByDate = assignments.reduce((acc, assignment) => {
    acc[assignment.dateISO] = assignment;
    return acc;
  }, {} as Record<string, typeof assignments[0]>);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const getDayAssignment = (date: Date) => {
    const dateISO = format(date, 'yyyy-MM-dd');
    return assignmentsByDate[dateISO];
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const MemberBadge = ({ name, shift }: { name: string; shift: '18h' | '16h' }) => {
    const color = SHIFT_COLORS[shift];
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white"
        style={{
          backgroundColor: color,
        }}
      >
        <span className="font-semibold">{capitalizedName}</span>
        <span className="text-[10px] opacity-90">{shift}</span>
      </div>
    );
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Vue calendrier
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Générez d'abord un planning pour voir la vue calendrier.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Légende des créneaux */}
      <Card>
        <CardHeader>
          <CardTitle>Légende des créneaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: SHIFT_COLORS['18h'] }}
              />
              <span className="text-sm font-medium">Service jusqu'à 18h</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: SHIFT_COLORS['16h'] }}
              />
              <span className="text-sm font-medium">Sortie à 16h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation du calendrier */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* En-têtes des jours de la semaine */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const assignment = getDayAssignment(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isCurrentDay = isToday(date);
              const dayOfWeek = getDay(date); // 0 = dimanche, 6 = samedi
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <div
                  key={date.toISOString()}
                  className={`
                    min-h-[120px] p-2 border rounded-lg transition-colors
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                    ${isCurrentDay ? 'ring-2 ring-primary' : ''}
                    ${isWeekend && isCurrentMonth ? 'bg-muted/50' : ''}
                    ${assignment ? 'border-primary/30' : 'border-border'}
                  `}
                >
                  {/* Numéro du jour */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`
                        text-sm font-medium
                        ${isCurrentDay ? 'text-primary font-bold' : ''}
                        ${!isCurrentMonth ? 'text-muted-foreground' : ''}
                        ${isWeekend && isCurrentMonth ? 'text-muted-foreground font-semibold' : ''}
                      `}
                    >
                      {format(date, 'd')}
                    </span>
                    {assignment?.locked && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        Verrouillé
                      </Badge>
                    )}
                  </div>

                  {/* Affectations */}
                  {assignment && (
                    <div className="space-y-1">
                      {/* Équipe 18h */}
                      {assignment.eighteen.map((name) => (
                        <MemberBadge key={`${assignment.dateISO}-${name}-18h`} name={name} shift="18h" />
                      ))}
                      
                      {/* Équipe 16h */}
                      {assignment.sixteen.map((name) => (
                        <MemberBadge key={`${assignment.dateISO}-${name}-16h`} name={name} shift="16h" />
                      ))}
                    </div>
                  )}

                  {/* Indicateur jour sans affectation */}
                  {!assignment && isCurrentMonth && (
                    <div className="text-center text-xs text-muted-foreground mt-4">
                      Non planifié
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}