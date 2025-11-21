-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Owners can view all profiles" ON public.user_profiles;

-- Create a simpler policy structure
-- Users can only see their own profile (no cross-table lookups to avoid recursion)
-- If you need owners to see all profiles, this should be handled at the application level
-- or through a different approach that doesn't cause recursion