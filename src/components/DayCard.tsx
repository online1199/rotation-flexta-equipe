import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Unlock, Edit2, Calendar, Copy, Check } from 'lucide-react';
import type { Assignment } from '@/lib/types';
import { useScheduleStore } from '@/store/useScheduleStore';
import { generateInitials } from '@/lib/rotation';
import { toast } from '@/hooks/use-toast';

interface DayCardProps {
  assignment: Assignment;
}

export function DayCard({ assignment }: DayCardProps) {
  const { teamMembers, lockDay, unlockDay, updateAssignment } = useScheduleStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedEighteen, setEditedEighteen] = useState(assignment.eighteen);
  const [editedSixteen, setEditedSixteen] = useState(assignment.sixteen);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const date = new Date(assignment.dateISO);
  const isLocked = assignment.locked || false;

  const handleLockToggle = () => {
    if (isLocked) {
      unlockDay(assignment.dateISO);
      toast({
        title: "Journée déverrouillée",
        description: "Cette journée sera recalculée lors de la prochaine génération."
      });
    } else {
      lockDay(assignment.dateISO, assignment);
      toast({
        title: "Journée verrouillée",
        description: "Cette journée ne sera plus recalculée automatiquement."
      });
    }
  };

  const handleSaveEdit = () => {
    // Vérifier que nous avons bien 3 personnes pour 18h et 2 pour 16h
    if (editedEighteen.length !== 3 || editedSixteen.length !== 2) {
      toast({
        title: "Configuration invalide",
        description: "Il faut exactement 3 personnes pour 18h et 2 pour 16h.",
        variant: "destructive"
      });
      return;
    }

    // Vérifier qu'il n'y a pas de doublons
    const allAssigned = [...editedEighteen, ...editedSixteen];
    const uniqueAssigned = new Set(allAssigned);
    if (uniqueAssigned.size !== 5) {
      toast({
        title: "Affectation invalide",
        description: "Chaque personne ne peut être affectée qu'à un seul créneau.",
        variant: "destructive"
      });
      return;
    }

    const updatedAssignment = {
      eighteen: editedEighteen,
      sixteen: editedSixteen,
      locked: true
    };

    updateAssignment(assignment.dateISO, updatedAssignment);
    lockDay(assignment.dateISO, { ...assignment, ...updatedAssignment });
    setIsEditDialogOpen(false);
    
    toast({
      title: "Journée modifiée",
      description: "La répartition a été mise à jour et verrouillée."
    });
  };

  const copyToClipboard = async () => {
    const text = `${format(date, 'dd/MM/yyyy', { locale: fr })}
18h: ${assignment.eighteen.join(', ')}
16h: ${assignment.sixteen.join(', ')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      toast({
        title: "Copié !",
        description: "Les informations du jour ont été copiées."
      });
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papier.",
        variant: "destructive"
      });
    }
  };

  const getAvailableMembers = (currentList: string[], otherList: string[]) => {
    return teamMembers.filter(member => 
      !currentList.includes(member.name) && !otherList.includes(member.name)
    );
  };

  const removeFromList = (list: string[], name: string) => {
    return list.filter(n => n !== name);
  };

  const addToList = (list: string[], name: string) => {
    return [...list, name];
  };

  return (
    <Card className={`relative hover-lift ${isLocked ? 'ring-2 ring-warning/50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>{format(date, 'EEEE dd/MM/yyyy', { locale: fr })}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              title="Copier"
            >
              {copiedToClipboard ? 
                <Check className="h-4 w-4 text-success" /> : 
                <Copy className="h-4 w-4" />
              }
            </Button>
            
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Éditer">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Éditer la journée du {format(date, 'dd/MM/yyyy', { locale: fr })}
                  </DialogTitle>
                  <DialogDescription>
                    Modifiez la répartition pour cette journée. Elle sera automatiquement verrouillée.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Équipe 18h */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Badge className="bg-rotation-18h text-rotation-18h-foreground">18h</Badge>
                      Service jusqu'à 18h (3 personnes)
                    </h4>
                    <div className="space-y-2">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Select
                          key={`eighteen-${index}`}
                          value={editedEighteen[index] || ''}
                          onValueChange={(value) => {
                            const newList = [...editedEighteen];
                            if (value) {
                              newList[index] = value;
                            } else {
                              newList.splice(index, 1);
                            }
                            setEditedEighteen(newList);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Personne ${index + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Membres disponibles + celui déjà sélectionné */}
                            {teamMembers
                              .filter(member => 
                                !editedEighteen.includes(member.name) || 
                                editedEighteen[index] === member.name
                              )
                              .filter(member => !editedSixteen.includes(member.name))
                              .map(member => (
                                <SelectItem key={member.id} value={member.name}>
                                  {member.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>

                  {/* Équipe 16h */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Badge className="bg-rotation-16h text-rotation-16h-foreground">16h</Badge>
                      Sortie à 16h (2 personnes)
                    </h4>
                    <div className="space-y-2">
                      {Array.from({ length: 2 }, (_, index) => (
                        <Select
                          key={`sixteen-${index}`}
                          value={editedSixteen[index] || ''}
                          onValueChange={(value) => {
                            const newList = [...editedSixteen];
                            if (value) {
                              newList[index] = value;
                            } else {
                              newList.splice(index, 1);
                            }
                            setEditedSixteen(newList);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Personne ${index + 1}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers
                              .filter(member => 
                                !editedSixteen.includes(member.name) || 
                                editedSixteen[index] === member.name
                              )
                              .filter(member => !editedEighteen.includes(member.name))
                              .map(member => (
                                <SelectItem key={member.id} value={member.name}>
                                  {member.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLockToggle}
              title={isLocked ? "Déverrouiller" : "Verrouiller"}
            >
              {isLocked ? 
                <Lock className="h-4 w-4 text-warning" /> : 
                <Unlock className="h-4 w-4" />
              }
            </Button>
          </div>
        </CardTitle>
        
        {isLocked && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <Lock className="h-4 w-4" />
            Cette journée est verrouillée et ne sera pas recalculée.
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Équipe 18h */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-rotation-18h text-rotation-18h-foreground">18h</Badge>
            <span className="text-sm font-medium">Service jusqu'à 18h</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {assignment.eighteen.map((name, index) => (
              <div key={`eighteen-${index}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-rotation-18h text-rotation-18h-foreground text-xs">
                    {generateInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Équipe 16h */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-rotation-16h text-rotation-16h-foreground">16h</Badge>
            <span className="text-sm font-medium">Sortie à 16h</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assignment.sixteen.map((name, index) => (
              <div key={`sixteen-${index}`} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-rotation-16h text-rotation-16h-foreground text-xs">
                    {generateInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}