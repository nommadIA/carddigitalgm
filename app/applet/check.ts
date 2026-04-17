import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");
  const { data, error } = await supabase.from('budgets').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data && data.length > 0 ? Object.keys(data[0]) : "no rows");
  }
}
run();
