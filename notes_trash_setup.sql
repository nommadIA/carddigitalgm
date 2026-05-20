-- Run this in your Supabase SQL Editor to add trash functionality to Notes

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
