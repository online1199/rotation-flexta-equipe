import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, RotateCcw, Calendar } from 'lucide-react';
import { DayCard } from './DayCard';
import { useScheduleStore } from '@/store/useScheduleStore';
import { getDistributionStats } from '@/lib/rotation';

const ITEMS_PER_PAGE = 7;

export function ScheduleList() {
  const { teamMembers, assignments, generateSchedule: regenerateSchedule } = useScheduleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Filtrer les affectations selon le terme de recherche
  const filteredAssignments = assignments.filter(assignment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const date = new Date(assignment.dateISO);
    const dateStr = format(date, 'dd/MM/yyyy EEEE', { locale: fr });
    
    // Recherche dans la date ou les noms
    return dateStr.toLowerCase().includes(searchLower) ||
           assignment.eighteen.some(name => name.toLowerCase().includes(searchLower)) ||
           assignment.sixteen.some(name => name.toLowerCase().includes(searchLower));
  });

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Statistiques de distribution
  const distributionStats = teamMembers.length > 0 ? getDistributionStats(assignments, teamMembers.map(m => m.name)) : [];

  const handleRegenerateSchedule = () => {
    regenerateSchedule();
    setCurrentPage(0); // Retourner à la première page
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning de rotation
          </CardTitle>
          <CardDescription>
            Aucun planning n'a été généré pour le moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Complétez votre équipe et configurez les paramètres pour générer le planning.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning de rotation
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateSchedule}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Regénérer
            </Button>
          </CardTitle>
          <CardDescription>
            {assignments.length} jour(s) planifié(s) • {assignments.filter(a => a.locked).length} jour(s) verrouillé(s)
          </CardDescription>
        </CardHeader>
        
        {/* Statistiques de distribution */}
        {distributionStats.length > 0 && (
          <CardContent>
            <h4 className="font-medium mb-3">Distribution des créneaux</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {distributionStats.map((stat) => (
                <div key={stat.name} className="p-3 border rounded-lg text-center">
                  <p className="font-medium text-sm">{stat.name}</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      18h: {stat.eighteen}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      16h: {stat.sixteen}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Barre de recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher par date ou nom..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0); // Retourner à la première page lors de la recherche
            }}
            className="pl-10"
          />
        </div>
        
        {searchTerm && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(0);
            }}
          >
            Effacer
          </Button>
        )}
      </div>

      {/* Résultats de recherche */}
      {filteredAssignments.length === 0 && searchTerm && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Aucun résultat trouvé pour "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liste des jours */}
      {currentAssignments.length > 0 && (
        <>
          <div className="space-y-4">
            {currentAssignments.map((assignment) => (
              <DayCard key={assignment.dateISO} assignment={assignment} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageIndex;
                  if (totalPages <= 5) {
                    pageIndex = i;
                  } else if (currentPage < 3) {
                    pageIndex = i;
                  } else if (currentPage > totalPages - 4) {
                    pageIndex = totalPages - 5 + i;
                  } else {
                    pageIndex = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageIndex}
                      variant={currentPage === pageIndex ? "default" : "outline"}
                      size="icon"
                      onClick={() => goToPage(pageIndex)}
                      className="w-10"
                    >
                      {pageIndex + 1}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Info pagination */}
          <div className="text-center text-sm text-muted-foreground">
            Affichage de {startIndex + 1} à {Math.min(endIndex, filteredAssignments.length)} sur {filteredAssignments.length} jour(s)
            {searchTerm && ` (filtré sur "${searchTerm}")`}
          </div>
        </>
      )}
    </div>
  );
}