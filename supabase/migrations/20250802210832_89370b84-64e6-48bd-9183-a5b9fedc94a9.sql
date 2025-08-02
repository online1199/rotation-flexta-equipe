-- Create rotations table for storing daily schedules
CREATE TABLE public.rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  eighteen text[] DEFAULT '{}',
  sixteen text[] DEFAULT '{}',
  absents text[] DEFAULT '{}',
  missing integer DEFAULT 0,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamp DEFAULT now()
);

-- Enable RLS on rotations table
ALTER TABLE public.rotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for rotations table
-- Everyone can read rotations
CREATE POLICY "Users can read rotations" ON public.rotations
FOR SELECT
USING (true);

-- Only admins can insert/update/delete rotations
CREATE POLICY "Admin can manage rotations" ON public.rotations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);