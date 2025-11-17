-- Function to delete user account and all related data
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete related data (cascading deletes should handle most of this, but we'll be explicit)
  -- Delete user's favorites
  DELETE FROM user_favorites WHERE user_id = current_user_id;
  
  -- Delete user's restaurants (if they own any)
  DELETE FROM restaurants WHERE user_id = current_user_id;
  
  -- Delete user's profile
  DELETE FROM profiles WHERE id = current_user_id;
  
  -- Delete the auth user (this will cascade to other tables)
  DELETE FROM auth.users WHERE id = current_user_id;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
