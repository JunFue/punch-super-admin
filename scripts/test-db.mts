import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: 'c:/Desktop/junlink-projects/punch-super-admin/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Testing connection to:', supabaseUrl)
  
  const { data: stores, error } = await supabase
    .from('stores')
    .select('store_id, store_name')
    .limit(5)

  if (error) {
    console.error('Error fetching stores:', error)
  } else {
    console.log('Stores found:', stores?.length || 0)
    console.log(JSON.stringify(stores, null, 2))
  }

  const { data: requests, error: err2 } = await supabase
    .from('subscription_requests')
    .select('id')
    .limit(5)
    
  if (err2) {
    console.error('Error fetching requests:', err2)
  } else {
    console.log('Requests found:', requests?.length || 0)
  }
}

test()
