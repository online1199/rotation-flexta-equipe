-- Ajouter la colonne locked à la table rotations
ALTER TABLE public.rotations ADD COLUMN locked boolean DEFAULT false;

-- Mettre à jour la politique RLS pour les écritures
DROP POLICY IF EXISTS "admin can manage rotations" ON public.rotations;

-- Nouvelle politique : admin peut écrire seulement si pas verrouillé
CREATE POLICY "admin can write unlocked rotations" 
ON public.rotations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "admin can update unlocked rotations" 
ON public.rotations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) AND locked = false
);

CREATE POLICY "admin can delete unlocked rotations" 
ON public.rotations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) AND locked = false
);