-- Run this in your Supabase SQL Editor to add the layout_url column to Notes

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS layout_url text;
