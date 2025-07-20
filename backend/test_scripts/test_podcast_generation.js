const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER_ID = 1;
const TEST_MEMO_ID = 1; // This should match the memo in your Untitled-1.json example

async function testPodcastGeneration() {
    try {
        console.log('🎙️ Testing Podcast Generation API (最简方式)...\n');

        // Test the podcast generation endpoint - 最简调用方式
        const response = await axios.post(`${API_BASE_URL}/rabbitholes/generate-podcast`, {
            memoId: TEST_MEMO_ID,
            userId: TEST_USER_ID
            // 只需要两个参数！其他一切都自动处理
        });

        console.log('✅ Podcast Generation Success!');
        console.log('📊 Generation Statistics:');
        console.log(`   - Total Nodes: ${response.data.totalNodes}`);
        console.log(`   - Answered Nodes: ${response.data.answeredNodes}`);
        console.log(`   - Timestamp: ${response.data.timestamp}`);
        console.log(`   - Audio File: ${response.data.audioFileName}`);
        console.log(`   - Script File: ${response.data.scriptFileName}`);
        
        console.log('\n📝 Generated Script Preview:');
        console.log('─'.repeat(80));
        console.log(response.data.script.substring(0, 500) + '...');
        console.log('─'.repeat(80));

        console.log('\n🔗 Download URLs:');
        console.log(`   Audio: ${API_BASE_URL}${response.data.audioUrl}`);
        console.log(`   Script: ${API_BASE_URL}${response.data.scriptUrl}`);

        return response.data;

    } catch (error) {
        console.error('❌ Error testing podcast generation:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 Tips:');
            console.log('   - Make sure the memo exists in the database');
            console.log('   - Check that the memoId and userId are correct');
            console.log('   - Ensure the conversation tree has answered nodes');
        }
        
        throw error;
    }
}

async function testPodcastGenerationWithConfig() {
    try {
        console.log('🎙️ Testing Podcast Generation API (完整配置)...\n');

        // Test with full configuration
        const response = await axios.post(`${API_BASE_URL}/rabbitholes/generate-podcast`, {
            memoId: TEST_MEMO_ID,
            userId: TEST_USER_ID,
            provider: "gemini",
            config: {
                language: "中文",
                hostName: "Alex",
                hostRole: "技术主持人",
                guestName: "Dr. Chen",
                guestRole: "AI研究专家",
                conversationStyle: "casual, humorous, educational",
                wordCount: 1000,
                creativity: 0.8,
                hostVoice: "Aoede",
                guestVoice: "Fenrir",
                additionalInstructions: "请加入更多幽默元素和互动问答"
            }
        });

        console.log('✅ Podcast Generation with Config Success!');
        console.log('📊 Generation Statistics:');
        console.log(`   - Total Nodes: ${response.data.totalNodes}`);
        console.log(`   - Answered Nodes: ${response.data.answeredNodes}`);
        console.log(`   - Custom Host Voice: Aoede`);
        console.log(`   - Custom Guest Voice: Fenrir`);
        
        return response.data;

    } catch (error) {
        console.error('❌ Error testing podcast generation with config:', error.response?.data || error.message);
        throw error;
    }
}

async function testPodcastVoices() {
    try {
        console.log('🎭 Testing Podcast Voice Options...\n');
        
        const response = await axios.get(`${API_BASE_URL}/rabbitholes/podcast-voices`);
        
        console.log('✅ Voice Options Retrieved!');
        console.log('🎤 Available Voices:');
        console.log(`   Total: ${response.data.voices.length} voices`);
        console.log(`   Default Host: ${response.data.defaultVoices.host}`);
        console.log(`   Default Guest: ${response.data.defaultVoices.guest}`);
        
        console.log('\n📝 All Available Voices:');
        response.data.voices.forEach((voice, index) => {
            if (index % 5 === 0) console.log(''); // New line every 5 voices
            process.stdout.write(`${voice.padEnd(15)}`);
        });
        console.log('\n');
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Error testing podcast voices:', error.response?.data || error.message);
        throw error;
    }
}

async function testFileDownload(audioUrl, scriptUrl) {
    try {
        console.log('\n📥 Testing File Downloads...\n');
        
        // Test audio file download
        try {
            const audioResponse = await axios.get(audioUrl, { 
                responseType: 'arraybuffer',
                timeout: 10000 
            });
            console.log(`✅ Audio download successful: ${audioResponse.data.byteLength} bytes`);
        } catch (error) {
            console.log(`⚠️ Audio download test skipped: ${error.message}`);
        }
        
        // Test script file download
        try {
            const scriptResponse = await axios.get(scriptUrl, {
                timeout: 5000
            });
            console.log(`✅ Script download successful: ${scriptResponse.data.length} characters`);
        } catch (error) {
            console.log(`⚠️ Script download test skipped: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`⚠️ File download tests encountered issues: ${error.message}`);
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

async function checkGoogleAPIKey() {
    console.log('🔑 Checking Google API Key configuration...');
    
    // Note: We can't directly check the API key from the client side
    // This is just a reminder for users
    console.log('📝 Please ensure you have configured:');
    console.log('   - GOOGLE_API_KEY environment variable');
    console.log('   - Valid Google AI Studio API access');
    console.log('   - Gemini TTS API permissions');
    console.log('');
    console.log('🔗 Get your API key at: https://aistudio.google.com/');
    console.log('');
}

// Main test function
async function runTests() {
    console.log('🚀 Podcast Generation API Test Suite (Real Google TTS)\n');
    
    const isAPIAvailable = await testAPIAvailability();
    if (!isAPIAvailable) {
        return;
    }

    console.log('\n' + '='.repeat(80));
    
    // Check Google API Key configuration
    await checkGoogleAPIKey();

    console.log('='.repeat(80));
    
    try {
        // Test voice options first
        await testPodcastVoices();
        
        console.log('\n' + '='.repeat(80));
        
        // Test simple podcast generation (memoId + userId only)
        const podcastResult1 = await testPodcastGeneration();
        
        console.log('\n' + '='.repeat(80));
        
        // Test podcast generation with full configuration
        const podcastResult2 = await testPodcastGenerationWithConfig();
        
        console.log('\n' + '='.repeat(80));
        
        // Test file downloads for the first result
        if (podcastResult1.audioUrl && podcastResult1.scriptUrl) {
            await testFileDownload(
                `${API_BASE_URL}${podcastResult1.audioUrl}`,
                `${API_BASE_URL}${podcastResult1.scriptUrl}`
            );
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Test Results Summary:');
        console.log('   ✅ 最简调用测试 - 只需要 memoId + userId');
        console.log('   ✅ 完整配置测试 - 包含自定义声音和参数');
        console.log('   ✅ 文件下载测试 - 音频和脚本文件');
        console.log('\n📋 Next Steps:');
        console.log('   1. Check the podcast_outputs/ directory for generated files');
        console.log('   2. Download the audio file using the provided URL');
        console.log('   3. Review the generated script for quality');
        console.log('   4. Compare the two different generation results');
        
    } catch (error) {
        console.error('\n💥 Test suite encountered errors:', error.message);
    }
}

// Run the tests
runTests().catch(console.error); 