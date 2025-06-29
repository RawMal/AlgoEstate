// Test Supabase access token validity
const SERVICE_ROLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwZnl5dGZpdmtqc2VmdXpncmVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTAwNDQ2MSwiZXhwIjoyMDY2NTgwNDYxfQ.xHaVc2jXWbJQzJvxmeFCioJnlZpEmu4tKsBX5iYc9vI'
const PROJECT_REF = 'spfyytfivkjsefuzgrei'
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`

console.log('🔑 Testing Supabase access token...')
console.log('Project URL:', SUPABASE_URL)

async function testToken() {
  try {
    // Test 1: Check if we can access the REST API with service role
    console.log('\n📡 Testing REST API access...')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_TOKEN}`,
        'apikey': SERVICE_ROLE_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ REST API access successful')
      console.log(`Found ${data.length} properties`)
    } else {
      console.log('❌ REST API failed:', response.status, response.statusText)
      const error = await response.text()
      console.log('Error details:', error)
    }

    // Test 2: Check Management API access
    console.log('\n🛠️ Testing Management API access...')
    const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (mgmtResponse.ok) {
      const projectInfo = await mgmtResponse.json()
      console.log('✅ Management API access successful')
      console.log('Project name:', projectInfo.name)
    } else {
      console.log('❌ Management API failed:', mgmtResponse.status, mgmtResponse.statusText)
      const mgmtError = await mgmtResponse.text()
      console.log('Error details:', mgmtError)
    }

    // Test 3: Decode the JWT to check claims
    console.log('\n🔍 Analyzing JWT token...')
    const tokenParts = SERVICE_ROLE_TOKEN.split('.')
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]))
      console.log('Token payload:', JSON.stringify(payload, null, 2))
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        console.log('❌ Token is EXPIRED')
      } else {
        console.log('✅ Token is valid and not expired')
      }
    }

  } catch (error) {
    console.error('❌ Token test failed:', error.message)
  }
}

testToken()