-- Database Diagnostics for Signup Issues
-- Run this in Supabase SQL Editor to check what's wrong

-- 1. Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_user_profile';

-- 3. Check how many auth users exist
SELECT COUNT(*) as auth_user_count FROM auth.users;

-- 4. Check how many profile users exist
SELECT COUNT(*) as profile_user_count FROM users;

-- 5. Check for any orphaned auth users (no profile)
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE WHEN u.id IS NULL THEN 'NO PROFILE' ELSE 'HAS PROFILE' END as status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 6. Check RLS policies on users table
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';

-- 7. Test API key generation function
SELECT generate_api_key() as test_api_key;
