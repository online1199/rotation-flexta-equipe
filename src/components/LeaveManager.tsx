import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { LeaveRange } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface LeaveManagerProps {
  memberId: string;
  memberName: string;
  leaves: LeaveRange[];
  onAddLeave: (leave: LeaveRange) => void;
  onRemoveLeave: (index: number) => void;
}

export function LeaveManager({ memberId, memberName, leaves, onAddLeave, onRemoveLeave }: LeaveManagerProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleAddLeave = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Dates manquantes",
        description: "Veuillez saisir les dates de début et de fin.",
        variant: "destructive"
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Dates invalides",
        description: "La date de début doit précéder la date de fin.",
        variant: "destructive"
      });
      return;
    }

    const newLeave: LeaveRange = {
      start: startDate,
      end: endDate
    };

    onAddLeave(newLeave);
    setStartDate('');
    setEndDate('');
    
    toast({
      title: "Congé ajouté",
      description: `Période de congé ajoutée pour ${memberName}.`
    });
  };

  const handleRemoveLeave = (index: number) => {
    onRemoveLeave(index);
    toast({
      title: "Congé supprimé",
      description: "La période de congé a été supprimée."
    });
  };

  return (
    <Card className="mt-3">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Congés
          {leaves.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {leaves.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Formulaire d'ajout */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="Date de début"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
            <Input
              type="date"
              placeholder="Date de fin"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleAddLeave}
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!startDate || !endDate}
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter une période
          </Button>
        </div>

        {/* Liste des congés */}
        {leaves.length > 0 ? (
          <div className="space-y-2">
            {leaves.map((leave, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    {format(parseISO(leave.start), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                  <span className="mx-2 text-muted-foreground">–</span>
                  <span className="font-medium">
                    {format(parseISO(leave.end), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveLeave(index)}
                  className="h-6 w-6 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucune période de congé définie
          </p>
        )}
      </CardContent>
    </Card>
  );
}