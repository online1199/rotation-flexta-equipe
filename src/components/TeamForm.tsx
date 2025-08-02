import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { toast } from '@/hooks/use-toast';

export function TeamForm() {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMember } = useScheduleStore();
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom ne peut pas être vide.",
        variant: "destructive"
      });
      return;
    }

    if (teamMembers.length >= 5) {
      toast({
        title: "Limite atteinte",
        description: "L'équipe ne peut pas dépasser 5 personnes.",
        variant: "destructive"
      });
      return;
    }

    if (teamMembers.some(member => member.name.toLowerCase() === newMemberName.trim().toLowerCase())) {
      toast({
        title: "Nom déjà utilisé",
        description: "Ce nom existe déjà dans l'équipe.",
        variant: "destructive"
      });
      return;
    }

    addTeamMember(newMemberName);
    setNewMemberName('');
    toast({
      title: "Membre ajouté",
      description: `${newMemberName} a été ajouté à l'équipe.`
    });
  };

  const handleRemoveMember = (id: string, name: string) => {
    removeTeamMember(id);
    toast({
      title: "Membre retiré",
      description: `${name} a été retiré de l'équipe.`
    });
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = () => {
    if (!editingName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom ne peut pas être vide.",
        variant: "destructive"
      });
      return;
    }

    if (editingId) {
      updateTeamMember(editingId, editingName);
      setEditingId(null);
      setEditingName('');
      toast({
        title: "Membre modifié",
        description: "Le nom a été mis à jour."
      });
    }
  };

  const isTeamComplete = teamMembers.length === 5;
  const canAddMore = teamMembers.length < 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Membres de l'équipe
          <Badge 
            variant={isTeamComplete ? "default" : "secondary"}
            className={isTeamComplete ? "bg-success text-success-foreground" : ""}
          >
            {teamMembers.length}/5
          </Badge>
        </CardTitle>
        <CardDescription>
          {isTeamComplete 
            ? "Votre équipe est complète ! Vous pouvez passer à l'étape suivante."
            : "Ajoutez exactement 5 personnes pour former votre équipe."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulaire d'ajout */}
        {canAddMore && (
          <div className="flex gap-2">
            <Input
              placeholder="Nom du membre"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              className="flex-1"
            />
            <Button 
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Liste des membres */}
        <div className="space-y-3">
          {teamMembers.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                {editingId === member.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={saveEditing}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">Position {index + 1}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(member.id, member.name)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message d'aide */}
        {teamMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun membre ajouté pour le moment.</p>
            <p className="text-sm">Commencez par ajouter le premier membre de votre équipe.</p>
          </div>
        )}

        {teamMembers.length > 0 && teamMembers.length < 5 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Il manque {5 - teamMembers.length} personne(s)</strong> pour compléter l'équipe.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}