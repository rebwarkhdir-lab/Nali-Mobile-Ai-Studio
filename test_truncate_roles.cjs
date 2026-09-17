const { createClient } = require("@supabase/supabase-js");
const client = createClient("https://ldvefgnvnwcaggojazvh.supabase.co", "sb_publishable_k-1xYjlGmscet3GZ2Rsyfw_Ip48-8VH");

async function run() {
  const { data, error } = await client.from('roles').delete().not('id', 'is', null);
  console.log("Roles truncate:", data, error);
}
run();
