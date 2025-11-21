// Quick migration runner script
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  console.log('🔄 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read the migration file
  const migrationPath = path.join(__dirname, 'scripts', '022_fix_sale_number_format.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('📝 Running migration 022_fix_sale_number_format.sql...')

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async (err) => {
      // If exec_sql doesn't exist, try direct query
      const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql: migrationSQL })
      })
      return result.json()
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('✅ Sale numbers have been normalized to SALE-### format')
    console.log('✅ generate_sale_number() function has been updated')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error running migration:', error.message)
    console.log('\n📋 Please run this migration manually in Supabase SQL Editor:')
    console.log('   1. Go to your Supabase dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the contents of scripts/022_fix_sale_number_format.sql')
    console.log('   4. Run the query')
    process.exit(1)
  }
}

runMigration()
