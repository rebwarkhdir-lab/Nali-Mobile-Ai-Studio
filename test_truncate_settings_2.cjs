const { createClient } = require("@supabase/supabase-js");
const client = createClient("https://ldvefgnvnwcaggojazvh.supabase.co", "sb_publishable_k-1xYjlGmscet3GZ2Rsyfw_Ip48-8VH");

async function run() {
  await client.from('settings').upsert({ key: 'test_delete_me', value: '123' });
  const { data, error } = await client.from('settings').delete().not('id', 'is', null);
  console.log("Settings truncate:", data, error);
  const { data: d2 } = await client.from('settings').select('*').eq('key', 'test_delete_me');
  console.log("Row exists:", d2);
}
run();
