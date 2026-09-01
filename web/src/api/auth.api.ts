import { supabase } from './supabase'
import type { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session ?? null
}

/* Current password is re-checked first so an unattended screen can't be
   hijacked. Ported from index.html sbChangePassword (line 798). */
export async function changePassword(email: string, oldPass: string, newPass: string): Promise<{ error: { message: string } | null }> {
  const chk = await supabase.auth.signInWithPassword({ email, password: oldPass })
  if (chk.error) return { error: { message: 'Cari şifrə yanlışdır' } }
  const { error } = await supabase.auth.updateUser({ password: newPass })
  return { error }
}

export async function fetchProfile(userId: string): Promise<{ data: UserProfile | null; error: { message: string } | null }> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  return { data: data ?? null, error }
}
