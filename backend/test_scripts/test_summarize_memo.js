const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 1;
const TEST_MEMO_ID = 1; // This should match the memo in your Untitled-1.json example

async function testSummarizeMemo() {
    try {
        console.log('🧪 Testing Memo Summarization API...\n');

        // Test the summarize memo endpoint
        const response = await axios.post(`${API_BASE_URL}/rabbitholes/summarize-memo`, {
            memoId: TEST_MEMO_ID,
            userId: TEST_USER_ID,
            provider: "gemini"
        });

        console.log('✅ Memo Summarization Success!');
        console.log('📊 Summary Statistics:');
        console.log(`   - Total Nodes: ${response.data.totalNodes}`);
        console.log(`   - Answered Nodes: ${response.data.answeredNodes}`);
        console.log('\n📝 Generated Summary:');
        console.log('─'.repeat(80));
        console.log(response.data.summary);
        console.log('─'.repeat(80));

    } catch (error) {
        console.error('❌ Error testing memo summarization:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 Tips:');
            console.log('   - Make sure the memo exists in the database');
            console.log('   - Check that the memoId and userId are correct');
            console.log('   - Ensure the conversation tree has answered nodes');
        }
    }
}

async function testAPIAvailability() {
    try {
        console.log('🔍 Checking API availability...');
        const response = await axios.get(`${API_BASE_URL}/rabbitholes/providers`);
        console.log('✅ Backend API is running');
        console.log('📡 Available providers:', response.data.availableProviders);
        return true;
    } catch (error) {
        console.error('❌ Backend API is not accessible:', error.message);
        console.log('\n💡 Make sure to start the backend server first:');
        console.log('   cd backend && npm start');
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Memo Summarization API Test\n');
    
    const isAPIAvailable = await testAPIAvailability();
    if (!isAPIAvailable) {
        return;
    }

    console.log('\n' + '='.repeat(80));
    await testSummarizeMemo();
}

// Run the tests
runTests().catch(console.error); 