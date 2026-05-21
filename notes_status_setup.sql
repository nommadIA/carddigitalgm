-- Run this in your Supabase SQL Editor to add production notes and statuses to Notes

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS type text default 'note',
ADD COLUMN IF NOT EXISTS status text default 'aguardando',
ADD COLUMN IF NOT EXISTS delivery_date text,
ADD COLUMN IF NOT EXISTS delivery_time text,
ADD COLUMN IF NOT EXISTS responsible_name text;
