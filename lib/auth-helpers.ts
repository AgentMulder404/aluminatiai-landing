// Authentication Helper Functions
// Wraps Supabase Auth methods for easier use throughout the app

import { supabaseClient } from './supabase-client';

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  return { error };
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  return { session: data?.session, error };
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  return { user: data?.user, error };
}

/**
 * Request a password reset email
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    // Route through callback so it can exchange the code before redirecting
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });

  return { data, error };
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  return { data, error };
}

/**
 * Resend email confirmation link
 */
export async function resendConfirmation(email: string) {
  const { data, error } = await supabaseClient.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

/**
 * Update user metadata
 */
export async function updateUser(updates: { full_name?: string; company?: string }) {
  const { data, error } = await supabaseClient.auth.updateUser({
    data: updates,
  });

  return { data, error };
}
