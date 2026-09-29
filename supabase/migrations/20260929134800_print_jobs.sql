CREATE TABLE public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    printer_role TEXT NOT NULL DEFAULT 'receipt',
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, printed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant print_jobs" 
    ON public.print_jobs 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = print_jobs.tenant_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.tenant_id = print_jobs.tenant_id
        )
    );

-- Trigger for updated_at? Not really needed, but let's enable replication for realtime.
alter publication supabase_realtime add table public.print_jobs;
