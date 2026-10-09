import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface SupabaseEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}

/**
 * Reads Supabase environment configuration safely across Node and browser contexts.
 */
export function getSupabaseEnv(): SupabaseEnvConfig {
  const nodeProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;

  const url =
    nodeProcess?.env?.SUPABASE_URL ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    'http://127.0.0.1:54321';

  const anonKey =
    nodeProcess?.env?.SUPABASE_ANON_KEY ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    '';

  const serviceRoleKey = nodeProcess?.env?.SUPABASE_SERVICE_ROLE_KEY;

  return {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    supabaseServiceRoleKey: serviceRoleKey,
  };
}

/**
 * Creates an anonymous client (safe for browser and public RPC execution).
 */
export function createAnonClient(customConfig?: Partial<SupabaseEnvConfig>): SupabaseClient<Database> {
  const env = getSupabaseEnv();
  const url = customConfig?.supabaseUrl || env.supabaseUrl;
  const anonKey = customConfig?.supabaseAnonKey || env.supabaseAnonKey;

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a privileged service role client (strictly for server-side scripts, ingestion, and tests).
 * NEVER expose the service role key to the browser.
 */
export function createServiceClient(customConfig?: Partial<SupabaseEnvConfig>): SupabaseClient<Database> {
  const env = getSupabaseEnv();
  const url = customConfig?.supabaseUrl || env.supabaseUrl;
  const serviceKey = customConfig?.supabaseServiceRoleKey || env.supabaseServiceRoleKey;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to instantiate service client.');
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
