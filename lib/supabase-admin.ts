import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase de SERVIDOR con la secret key (service role).
 * Salta RLS — por eso vive SOLO en el servidor (route handlers) y NUNCA se
 * importa desde componentes de cliente. La base queda cerrada al público
 * (RLS deny-by-default) y todo acceso pasa por aquí.
 *
 * Acepta el nuevo formato `sb_secret_...` o un service_role JWT clásico.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

export const adminDb: SupabaseClient | null =
  url && secret
    ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

/** True cuando hay credenciales de servidor y debemos usar la nube. */
export const cloudReady: boolean = Boolean(adminDb);
