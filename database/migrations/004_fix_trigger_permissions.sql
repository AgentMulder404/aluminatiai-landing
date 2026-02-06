-- Fix: Grant permissions for trigger to create user profiles
-- The trigger runs with SECURITY DEFINER, so it needs proper grants

-- Drop and recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, api_key)
  VALUES (
    NEW.id,
    NEW.email,
    generate_api_key()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO postgres, service_role;

-- Make sure the function can be executed
GRANT EXECUTE ON FUNCTION generate_api_key() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION create_user_profile() TO postgres, service_role;
