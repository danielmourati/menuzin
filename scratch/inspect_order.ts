import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
console.log("Using URL:", url ? "found" : "missing", "Key:", key ? "found" : "missing");
const supabase = createClient(url, key);

async function main() {
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("id, number, tenant_id, total, subtotal, delivery_fee, discount_amount, coupon_code, created_at")
    .eq("number", 1074);
  console.log("Order #1074:", JSON.stringify(orders, null, 2), oErr);

  const { data: coupons, error: cErr } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", "%PASTEL%");
  console.log("Coupons matching PASTEL:", JSON.stringify(coupons, null, 2), cErr);
}

main().catch(console.error);
