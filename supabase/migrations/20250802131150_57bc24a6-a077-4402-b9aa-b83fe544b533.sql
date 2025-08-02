-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';

-- Remove user_id from members table (admin manages all members)
ALTER TABLE public.members DROP COLUMN user_id;

-- Update leaves table to use user_id instead of member_id
ALTER TABLE public.leaves DROP COLUMN member_id;
ALTER TABLE public.leaves ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can manage their profile" ON public.profiles;
CREATE POLICY "Admin can manage profiles" ON public.profiles 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Add policy for users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Update RLS policies for members (admin only)
DROP POLICY IF EXISTS "Users can access their members" ON public.members;
CREATE POLICY "Admin can manage members" ON public.members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Update RLS policies for leaves (admin or own leaves)
DROP POLICY IF EXISTS "Users can access leaves for their members" ON public.leaves;
CREATE POLICY "Users can manage own leaves" ON public.leaves
FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Update the trigger function to include role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    'user'
  );
  return new;
end;
$$;