// Atalho para o cliente do backend no navegador (usado por impressão).
import { supabase as typedClient } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = typedClient as any;
