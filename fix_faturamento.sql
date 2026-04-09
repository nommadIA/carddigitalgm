ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.budgets SET completed_at = created_at WHERE status = 'CONCLUIDO' AND completed_at IS NULL;

-- Create a trigger to automatically update completed_at when status becomes CONCLUIDO
CREATE OR REPLACE FUNCTION update_completed_at_column()
RETURNS TRIGGER AS $$
BEGIN
   IF NEW.status = 'CONCLUIDO' AND (OLD.status IS NULL OR OLD.status != 'CONCLUIDO') THEN
       NEW.completed_at = now(); 
   END IF;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_budgets_completed_at ON public.budgets;
CREATE TRIGGER update_budgets_completed_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION update_completed_at_column();
