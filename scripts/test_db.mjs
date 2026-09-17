import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fetiqngwjgxajtqjaolb.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey || "fake-key");

async function main() {
  console.log("Testing drivers table...");
  const { data, error } = await supabase.from('drivers').select('*').limit(1);
  console.log("Result:", { data, error });
}

main();
