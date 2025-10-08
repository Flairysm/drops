// This script will help you assign packs through the browser
// Open your browser's developer console and run this code

async function assignTestPacks(count = 10) {
  console.log(`🎁 Assigning ${count} test packs per type...`);
  
  try {
    const response = await fetch('/api/admin/assign-test-packs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!', data);
      console.log(`Total packs added: ${data.totalAdded}`);
      console.log('Check your "My Packs" page to see the new packs!');
      return data;
    } else {
      throw new Error(data.message || 'Failed to assign packs');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('Make sure you are logged in and on the correct domain');
    return null;
  }
}

// Usage instructions
console.log('📋 Instructions:');
console.log('1. Make sure you are logged in to the app');
console.log('2. Run: assignTestPacks(10) to add 10 packs of each type');
console.log('3. Or run: assignTestPacks(100) to add 100 packs of each type');
console.log('4. Check your "My Packs" page to see the new packs');

// Export the function to global scope
window.assignTestPacks = assignTestPacks;
