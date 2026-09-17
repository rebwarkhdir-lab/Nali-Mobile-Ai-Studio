const { createClient } = require("@supabase/supabase-js");
const client = createClient("https://ldvefgnvnwcaggojazvh.supabase.co", "sb_publishable_k-1xYjlGmscet3GZ2Rsyfw_Ip48-8VH");

async function run() {
  const { data, error } = await client.from('nali_mobiles').select('id, status');
  console.log("Mobiles:", data?.length);
  if (data) console.log(data.filter(m => m.status === 'sold').length, "are sold");
}
run();
