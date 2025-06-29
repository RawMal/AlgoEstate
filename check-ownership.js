const SERVICE_ROLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZnl5dGZpdmtqc2VmdXpncmVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTAwNDQ2MSwiZXhwIjoyMDY2NTgwNDYxfQ.xHaVc2jXWbJQzJvxmeFCioJnlZpEmu4tKsBX5iYc9vI'
const SUPABASE_URL = 'https://spfyytfivkjsefuzgrei.supabase.co'

async function checkTokenOwnership() {
  try {
    console.log('🔍 Checking token ownership records...')
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/token_ownership?select=*,properties(name)&order=purchase_date.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_TOKEN}`,
        'apikey': SERVICE_ROLE_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Found ${data.length} token ownership records:`)
      
      if (data.length === 0) {
        console.log('❌ No token ownership records found! This explains why the dashboard is empty.')
      } else {
        console.log('\nRecent purchases:')
        data.forEach((record, index) => {
          console.log(`${index + 1}. Property: ${record.properties?.name || 'Unknown'}`)
          console.log(`   Wallet: ${record.wallet_address}`)
          console.log(`   Tokens: ${record.token_amount}`)
          console.log(`   Date: ${record.purchase_date}`)
          console.log('')
        })
      }
    } else {
      console.log('❌ Error:', response.status, response.statusText)
      const error = await response.text()
      console.log('Details:', error)
    }
  } catch (error) {
    console.error('❌ Failed:', error.message)
  }
}

checkTokenOwnership()