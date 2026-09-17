const { createClient } = require("@supabase/supabase-js");
const client = createClient("https://ldvefgnvnwcaggojazvh.supabase.co", "sb_publishable_k-1xYjlGmscet3GZ2Rsyfw_Ip48-8VH");

async function run() {
  const { data, error } = await client.from('nali_mobiles').select('*').eq('status', 'sold');
  console.log("Sold Mobiles:", data?.length, error);
  
  const { data: acc, error: a_e } = await client.from('nali_accessories').select('id, name, totalSold');
  console.log("Accessories totalSold:", acc, a_e);
}
run();
