import { supabase as typedSupabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = typedSupabase as any;

export interface PrintJob {
  id: string;
  tenant_id: string;
  order_id?: string;
  printer_role: string;
  content: string; // The text to be printed
  status: "pending" | "printed" | "failed";
  created_at: string;
  completed_at?: string;
}

export async function enqueuePrintJob(job: Omit<PrintJob, "id" | "created_at" | "status" | "tenant_id">) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Usuário não autenticado");

  // Get tenant ID (mock, usually from context, let's assume we can fetch it or pass it. 
  // For safety, let's assume the RPC or RLS automatically handles tenant_id if not provided, 
  // or we need to fetch it. In Menuzin, tenant_id is often implicit for admins).
  // I will just let the DB default or we should pass it. Let's fetch tenant_id.
  const { data: userRecord } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userData.user.id)
    .single();
    
  if (!userRecord?.tenant_id) throw new Error("Tenant não encontrado");

  const { data, error } = await supabase.from("print_jobs").insert({
    tenant_id: userRecord.tenant_id,
    order_id: job.order_id,
    printer_role: job.printer_role,
    content: job.content,
    status: "pending"
  }).select().single();

  if (error) throw error;
  return data;
}

export async function markJobAsPrinted(jobId: string) {
  const { error } = await supabase.from("print_jobs").update({
    status: "printed",
    completed_at: new Date().toISOString()
  }).eq("id", jobId);

  if (error) throw error;
}

export async function clearPrintedJobs() {
  const { error } = await supabase.from("print_jobs").delete().eq("status", "printed");
  if (error) throw error;
}

export async function fetchPendingJobs() {
  const { data, error } = await supabase.from("print_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as PrintJob[];
}
