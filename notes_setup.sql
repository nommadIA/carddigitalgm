-- Run this in your Supabase SQL Editor to create the Notes table

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    title text,
    content text,
    color text default '#64748b',
    is_pinned boolean default false,
    reminder_time text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (public.is_tenant_member(tenant_id));
CREATE POLICY "notes_insert" ON public.notes FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "notes_update" ON public.notes FOR UPDATE USING (public.is_tenant_member(tenant_id));
CREATE POLICY "notes_delete" ON public.notes FOR DELETE USING (public.is_tenant_member(tenant_id));
