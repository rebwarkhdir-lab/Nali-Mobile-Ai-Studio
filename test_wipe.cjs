const { createClient } = require("@supabase/supabase-js");
const client = createClient("https://ldvefgnvnwcaggojazvh.supabase.co", "sb_publishable_k-1xYjlGmscet3GZ2Rsyfw_Ip48-8VH");

async function run() {
  const { data, error } = await client.from('settings').delete().like('key', 'nali_pos_admin%');
  console.log("Admin Delete Result:", data, error);
  
  const { data: d2, error: e2 } = await client.from('settings').delete().eq('key', 'nali_supplier_returns_data');
  console.log("Returns Delete Result:", d2, e2);
  
  // also check if there are any pos_sales left in nali_pos_sales_v1 or similar in settings?
  const { data: keys, error: ke } = await client.from('settings').select('key');
  console.log("Remaining Setting Keys:", keys?.map(k => k.key));
}
run();
