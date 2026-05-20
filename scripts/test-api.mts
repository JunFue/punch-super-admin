import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vwhdvrhqohtayarwbtbg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3aGR2cmhxb2h0YXlhcndidGJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY0NzU5NywiZXhwIjoyMDc4MjIzNTk3fQ.xK2OdGC2W2s1eOaneLYCXKcj4ZSvGsB2bdK63zCRlLc'

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function test() {
  const { data: stores, error } = await supabase
    .from("stores")
    .select(`
      store_id, 
      store_name, 
      deleted_at,
      users (
        email,
        first_name,
        last_name
      ),
      store_subscriptions(
        id, 
        status, 
        plan_type, 
        amount_paid, 
        start_date, 
        end_date,
        created_at
      )
    `)
    .order("store_name", { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error fetching stores:', JSON.stringify(error, null, 2))
  } else {
    console.log('Stores found!', stores)
  }
}

test()
