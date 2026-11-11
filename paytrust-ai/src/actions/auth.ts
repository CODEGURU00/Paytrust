'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';
import {
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from '@/lib/validations';

export async function signUp(input: SignUpInput) {
  const supabase = await createClient();

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
      data: {
        display_name: parsed.data.display_name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    data: {
      message: 'Account created. Check your email to confirm your address.',
    },
  };
}

export async function signIn(input: SignInInput) {
  const supabase = await createClient();

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: { message: 'Signed in successfully' } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}
