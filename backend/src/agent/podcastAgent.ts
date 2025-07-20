import { openAIService } from "../services/openaiService";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import wav from 'wav';
import fs from "fs";
import path from "path";

interface PodcastGenerationRequest {
    content: string;
    userId: number;
    memoId: number;
    memoTitle: string;
    memoTags: string[];
    config?: PodcastConfig;
    provider?: string;
}

interface PodcastConfig {
    podcastName?: string;
    podcastTagline?: string;
    language?: string;
    hostName?: string;
    hostRole?: string;
    guestName?: string;
    guestRole?: string;
    conversationStyle?: string;
    wordCount?: number;
    creativity?: number;
    maxTokens?: number;
    hostVoice?: string;
    guestVoice?: string;
    voiceMapping?: { [speaker: string]: string };
    additionalInstructions?: string;
}

interface PodcastGenerationResponse {
    success: boolean;
    script: string;
    audioFileName: string;
    audioFilePath: string;
    scriptFileName: string;
    scriptFilePath: string;
    timestamp: number;
}

interface AudioGenerationData {
    audioData: string;
    format: string;
}

// 播客配置常量
const PODCAST_CONFIG = {
    defaultVoices: {
        host: 'Umbriel',     
        guest: 'Sadaltager'    
    },
    voiceOptions: [
        'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda',
        'Orus', 'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus',
        'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
        'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima',
        'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
    ]
};

export class PodcastAgent {
    /**
     * 基于memo标签生成播客标语
     */
    private static generateTaglineFromTags(tags: string[]): string {
        if (tags.length === 0) {
            return "探索知识的无限可能";
        }
        
        // 根据标签数量和内容生成不同的标语
        if (tags.length === 1) {
            return `深入探索${tags[0]}的奥秘`;
        } else if (tags.length === 2) {
            return `从${tags[0]}到${tags[1]}的全面解析`;
        } else {
            return `探索${tags[0]}等前沿话题的深度对话`;
        }
    }

    /**
     * 生成播客系统提示词
     */
    private static generateSystemPrompt(config: PodcastConfig, memoTitle: string, memoTags: string[]): string {
        // 基于memo信息生成播客名称和标语
        const podcastName = config.podcastName || `深度解析：${memoTitle}`;
        const podcastTagline = config.podcastTagline || this.generateTaglineFromTags(memoTags);

         return `You are a professional podcast content generation assistant. Your task is to convert given input content into engaging podcast conversations.

### Character Settings & Personality Styles
- ${config.hostName || 'Host'}: ${config.hostRole || 'Professional Host'} - Responsible for guiding conversations, asking questions, and summarizing
 * Voice style: Professional and steady, showing curiosity and eagerness to learn when appropriate
 * Emotional expression: Shows surprise when hearing interesting viewpoints, appears confident and professional when summarizing
 
- ${config.guestName || 'Guest'}: ${config.guestRole || 'Domain Expert'} - Responsible for providing in-depth analysis and professional insights
 * Voice style: Knowledgeable and passionate, excited about their professional field
 * Emotional expression: Full of energy when discussing key concepts, enthusiastic when sharing insights

### Podcast Information
- Podcast Name: ${podcastName}
- Podcast Tagline: ${podcastTagline}
- Target Language: ${config.language || 'English'}
- Discussion Topic: ${memoTitle}
- Related Tags: ${memoTags.join(', ')}

### Conversation Structure Requirements
1. Opening greeting to audience, introduce podcast and today's topic (${config.hostName || 'Host'} enthusiastic opening)
2. Host briefly introduces background and importance (${config.hostName || 'Host'} professional guidance)
3. Deep dive into core content, including multiple key points (dynamic in-depth exchange between both parties)
4. Provide practical examples and application scenarios (${config.guestName || 'Guest'} excited sharing)
5. Summarize key points and look ahead to the future (${config.hostName || 'Host'} professional summary)
6. Closing remarks and farewell (friendly goodbye from both parties)

### Output Format Requirements
- Use speaker names to identify each dialogue segment
- Ensure natural and logical conversation flow
- Each speaking segment should have substantial content, avoid empty filler
- Keep around ${config.wordCount || 800} words
- Maintain professionalism while adding interest

### Interaction Techniques
- Use questions to advance topics
- Appropriately add analogies and examples
- Maintain conversation rhythm
- Reflect the professional characteristics of different roles

### Special Requirements
Please ensure the podcast content closely revolves around the theme "${memoTitle}" and naturally incorporates related tag content: ${memoTags.join(', ')}`;
    }

    /**
     * 生成播客用户提示词
     */
    private static generateUserPrompt(content: string, config: PodcastConfig): string {
        return `Please generate a podcast conversation script based on the following content:

### Input Content
${content}

### Multi-Speaker Style Requirements
When generating the script, add dynamic emotional and style characteristics for each speaker:
- ${config.hostName || 'Host'}: Dynamically adjust tone based on conversation content (show curiosity when curious, appear professional and confident when summarizing)
- ${config.guestName || 'Guest'}: Adjust passion level based on topic intensity (excited and enthusiastic when sharing important discoveries, focused and engaged when explaining concepts)

### Language Style Implementation
Generate the script with emotional and vocal direction indicators. For example:

Make ${config.hostName || 'Host'} sound curious and professional, and ${config.guestName || 'Guest'} sound excited and passionate:

${config.hostName || 'Host'}: This is really a fascinating perspective! Could you explain it in more detail?
${config.guestName || 'Guest'}: You absolutely won't believe what we discovered!

### Special Requirements
${config.additionalInstructions || 'Ensure content is accurate, interesting, and easy to understand'}

Please generate a high-quality podcast conversation that ensures valuable, engaging, and accurate content. The conversation should flow naturally and reflect the professional characteristics and distinct personality styles of both the host and guest. Each dialogue segment should contain appropriate emotional coloring and vocal characteristic prompts.

### Language Requirement
Generate the entire conversation in ${config.language || 'English'}.`;
    }

    /**
     * 生成播客脚本
     */
    private static async generateScript(content: string, config: PodcastConfig, memoTitle: string, memoTags: string[], provider: string = "gemini"): Promise<string> {
        const systemPrompt = this.generateSystemPrompt(config, memoTitle, memoTags);
        const userPrompt = this.generateUserPrompt(content, config);

        const messages = [
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: userPrompt,
            },
        ];

        const completion = await openAIService.createChatCompletion(messages, provider, {
            temperature: config.creativity || 0.7,
            max_tokens: config.maxTokens || 2048,
        }) as OpenAI.Chat.ChatCompletion;

        const script = completion.choices?.[0]?.message?.content ?? "";
        if (!script) {
            throw new Error("Failed to generate podcast script");
        }

        return script;
    }

    /**
     * 解析脚本中的发言者 - 精确匹配TTS API要求
     */
    private static parseScriptSpeakers(script: string): string[] {
        const speakers = new Set<string>();
        const lines = script.split('\n');
        
        for (const line of lines) {
            // 匹配格式：发言者名称: 内容 或 发言者名称：内容
            const match = line.match(/^([^:：]+)[：:]/);
            if (match) {
                const speakerName = match[1].trim();
                // 过滤掉空行和无效名称
                if (speakerName && speakerName.length > 0) {
                    speakers.add(speakerName);
                }
            }
        }
        
        console.log('Parsed speakers from script:', Array.from(speakers));
        return Array.from(speakers);
    }

    /**
     * 构建语音配置 - Google TTS API要求恰好2个声音配置
     */
    private static buildSpeechConfig(speakers: string[], config: PodcastConfig) {
        console.log('Building speech config for speakers:', speakers);
        
        // Google TTS API要求恰好2个声音配置（官方文档：up to 2）
        // 使用prompt中定义的默认发言者名称（与系统prompt保持一致）
        const defaultSpeakers = [
            config.hostName || 'Host',
            config.guestName || 'Guest'
        ];
        
        const finalSpeakers: string[] = [];
        
        // 使用脚本中实际的发言者，但确保恰好有2个
        if (speakers.length >= 2) {
            // 使用前两个发言者
            finalSpeakers.push(speakers[0], speakers[1]);
        } else if (speakers.length === 1) {
            // 只有一个发言者时，使用该发言者 + 默认第二个发言者
            finalSpeakers.push(speakers[0], defaultSpeakers[1]);
        } else {
            // 没有解析到发言者时，使用默认发言者
            finalSpeakers.push(...defaultSpeakers);
        }

        console.log('Final speakers selected:', finalSpeakers);

        // 构建恰好2个声音配置（按照官方文档格式）
        const speakerVoiceConfigs = finalSpeakers.map((speaker, index) => {
            let voiceName: string;
            
            // 根据配置或默认规则分配声音
            if (config.voiceMapping && config.voiceMapping[speaker]) {
                voiceName = config.voiceMapping[speaker];
            } else if (index === 0) {
                voiceName = config.hostVoice || PODCAST_CONFIG.defaultVoices.host;
            } else {
                voiceName = config.guestVoice || PODCAST_CONFIG.defaultVoices.guest;
            }

            return {
                speaker: speaker,
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            };
        });

        console.log('Generated voice configs:', JSON.stringify(speakerVoiceConfigs, null, 2));

        return {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerVoiceConfigs
            }
        };
    }

    /**
     * 生成播客音频
     */
    private static async generateAudio(script: string, config: PodcastConfig, provider: string = "gemini"): Promise<Buffer> {
        try {
            // 解析脚本中的发言者
            const speakers = this.parseScriptSpeakers(script);
            
            // 构建语音配置
            const speechConfig = this.buildSpeechConfig(speakers, config);

            // 使用特殊的语音生成模型
            const messages = [
                {
                    role: "user",
                    content: script
                }
            ];

            // 注意：这里需要使用特殊的 TTS 模型和配置
            // 由于 openAIService 可能不直接支持 Google 的 TTS 配置，
            // 我们需要直接调用 Google AI 的 TTS 服务
            const response = await this.callGoogleTTS(script, speechConfig);
            
            if (!response.audioData) {
                throw new Error('No audio data received from TTS service');
            }

            return Buffer.from(response.audioData, 'base64');
        } catch (error) {
            console.error('Audio generation error:', error);
            throw new Error('Failed to generate audio');
        }
    }

    /**
     * 调用 Google Gemini TTS 服务
     */
    // 使用wav库保存音频文件
    private static async saveWaveFile(
        filename: string,
        pcmData: Buffer,
        channels: number = 1,
        rate: number = 24000,
        sampleWidth: number = 2,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const writer = new wav.FileWriter(filename, {
                channels,
                sampleRate: rate,
                bitDepth: sampleWidth * 8,
            });

            writer.on('finish', resolve);
            writer.on('error', reject);

            writer.write(pcmData);
            writer.end();
        });
    }

    private static async callGoogleTTS(script: string, speechConfig: any): Promise<AudioGenerationData> {
        try {
            console.log('Calling Google Gemini TTS API...');
            console.log('Script length:', script.length);
            console.log('Speech config:', JSON.stringify(speechConfig, null, 2));

            // 检查API key并初始化客户端
            const apiKey = process.env.GOOGLE_AI_API_KEY;
            if (!apiKey) {
                throw new Error('Google API key not configured. Please set GOOGLE_AI_API_KEY environment variable.');
            }
            const ai = new GoogleGenAI({ apiKey });

            // 按照示例的方式调用API
            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro-preview-tts",
                contents: [{ parts: [{ text: script }] }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: speechConfig
                }
            });

            // 提取音频数据
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (!audioData) {
                console.error('No audio data in response:', JSON.stringify(response, null, 2));
                throw new Error('No audio data received from Google TTS API');
            }

            console.log('Google TTS API call successful, audio data length:', audioData.length);

            return {
                audioData: audioData,
                format: 'wav'
            };

        } catch (error) {
            console.error('Google TTS API error:', error);
            
            // 如果Google TTS失败，提供更具体的错误信息
            if (error instanceof Error) {
                if (error.message.includes('API key') || error.message.includes('credentials')) {
                    throw new Error('Google API key not configured or invalid. Please check GOOGLE_AI_API_KEY environment variable.');
                } else if (error.message.includes('quota')) {
                    throw new Error('Google TTS API quota exceeded. Please check your API usage.');
                } else if (error.message.includes('model')) {
                    throw new Error('Google TTS model not available. Please check if gemini-2.5-flash-preview-tts is accessible.');
                }
            }
            
            throw new Error(`Google TTS API failed: ${(error as Error).message}`);
        }
    }

    /**
     * 确保输出目录存在
     */
    private static async ensureOutputDirectory(): Promise<string> {
        const outputDir = path.join(process.cwd(), 'podcast_outputs');
        
        try {
            await fs.promises.mkdir(outputDir, { recursive: true });
        } catch (error) {
            console.error('Error creating output directory:', error);
            throw new Error('Failed to create output directory');
        }
        
        return outputDir;
    }

    /**
     * 保存音频文件（使用wav库）
     */
    private static async saveAudioFile(audioBuffer: Buffer, filename: string, outputDir: string): Promise<string> {
        const filePath = path.join(outputDir, filename);
        
        try {
            // 使用wav库保存WAV格式的音频文件
            await this.saveWaveFile(filePath, audioBuffer);
            return filePath;
        } catch (error) {
            console.error('Error saving audio file:', error);
            throw new Error('Failed to save audio file');
        }
    }

    /**
     * 保存脚本文件
     */
    private static async saveScriptFile(script: string, filename: string, outputDir: string): Promise<string> {
        const filePath = path.join(outputDir, filename);
        
        try {
            await fs.promises.writeFile(filePath, script, 'utf8');
            return filePath;
        } catch (error) {
            console.error('Error saving script file:', error);
            throw new Error('Failed to save script file');
        }
    }

    /**
     * 主要的播客生成方法
     */
    static async generatePodcast(request: PodcastGenerationRequest): Promise<PodcastGenerationResponse> {
        const {
            content,
            userId,
            memoId,
            memoTitle,
            memoTags,
            config = {},
            provider = "gemini"
        } = request;

        try {
            console.log(`Generating podcast for memo ${memoId}, user ${userId}...`);

            // 确保输出目录存在
            const outputDir = await this.ensureOutputDirectory();

            // 第一步：生成脚本
            console.log('Generating podcast script...');
            const script = await this.generateScript(content, config, memoTitle, memoTags, provider);

            // 第二步：生成音频
            console.log('Generating podcast audio...');
            const audioBuffer = await this.generateAudio(script, config, provider);

            // 生成文件名
            const timestamp = Date.now();
            const scriptFileName = `podcast-script-${memoId}-${userId}-${timestamp}.txt`;
            const audioFileName = `podcast-audio-${memoId}-${userId}-${timestamp}.wav`;

            // 保存文件
            const scriptFilePath = await this.saveScriptFile(script, scriptFileName, outputDir);
            const audioFilePath = await this.saveAudioFile(audioBuffer, audioFileName, outputDir);

            console.log(`Podcast generated successfully:
                Script: ${scriptFilePath}
                Audio: ${audioFilePath}`);

            return {
                success: true,
                script,
                audioFileName,
                audioFilePath,
                scriptFileName,
                scriptFilePath,
                timestamp
            };
        } catch (error) {
            console.error('Error generating podcast:', error);
            throw new Error(`Failed to generate podcast: ${(error as Error).message}`);
        }
    }

    /**
     * 获取可用的声音选项
     */
    static getVoiceOptions() {
        return {
            voices: PODCAST_CONFIG.voiceOptions,
            defaultVoices: PODCAST_CONFIG.defaultVoices
        };
    }
} 