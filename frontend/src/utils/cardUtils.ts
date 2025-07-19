import { PresetCard, createCardFromChatHistory, generateTagsFromQuery } from '../types/card';

// 模拟数据库数据结构
export interface DatabaseCardData {
  id: string;
  title: string;
  query: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
  images?: string[];
  metadata?: {
    conversation_id?: string;
    user_id?: string;
    search_count?: number;
    related_topics?: string[];
  };
}

// 从数据库数据创建卡片
export const createCardFromDatabase = (dbData: DatabaseCardData): PresetCard => {
  const timestamp = dbData.updated_at ? new Date(dbData.updated_at) : new Date(dbData.created_at);
  
  return createCardFromChatHistory(
    dbData.title,
    dbData.query,
    {
      tags: dbData.tags || generateTagsFromQuery(dbData.query),
      images: dbData.images || getDefaultImagesForQuery(dbData.query),
      color: getColorForTags(dbData.tags || generateTagsFromQuery(dbData.query)),
      timestamp,
      source: 'chat',
      metadata: {
        conversationId: dbData.metadata?.conversation_id,
        messageCount: dbData.metadata?.search_count,
        relatedTopics: dbData.metadata?.related_topics
      }
    }
  );
};

// 批量处理数据库卡片数据
export const createCardsFromDatabaseList = (dbDataList: DatabaseCardData[]): PresetCard[] => {
  return dbDataList.map(createCardFromDatabase);
};

// 根据查询内容获取默认图片
const getDefaultImagesForQuery = (query: string): string[] => {
  const keywords = query.toLowerCase();
  
  // AI/Tech themed images
  if (keywords.includes('ai') || keywords.includes('artificial intelligence') || keywords.includes('technology')) {
    return [
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=300&h=200&fit=crop'
    ];
  }
  
  // Science themed images
  if (keywords.includes('quantum') || keywords.includes('physics') || keywords.includes('science')) {
    return [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&h=200&fit=crop'
    ];
  }
  
  // History/Culture themed images
  if (keywords.includes('history') || keywords.includes('ancient') || keywords.includes('culture')) {
    return [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&h=200&fit=crop'
    ];
  }
  
  // Politics themed images
  if (keywords.includes('trump') || keywords.includes('politics') || keywords.includes('president')) {
    return [
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1586027689037-7e4ad40c7273?w=300&h=200&fit=crop'
    ];
  }
  
  // Default images
  return [
    'https://images.unsplash.com/photo-1516110833967-0b5656ca2673?w=300&h=200&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop'
  ];
};

// 根据标签获取颜色主题
const getColorForTags = (tags: string[]): string => {
  const tagString = tags.join(' ').toLowerCase();
  
  if (tagString.includes('ai') || tagString.includes('technology')) {
    return 'from-blue-500/20 to-cyan-500/20';
  }
  if (tagString.includes('science') || tagString.includes('physics')) {
    return 'from-purple-500/20 to-pink-500/20';
  }
  if (tagString.includes('history') || tagString.includes('ancient')) {
    return 'from-amber-500/20 to-orange-500/20';
  }
  if (tagString.includes('politics') || tagString.includes('government')) {
    return 'from-red-500/20 to-blue-500/20';
  }
  if (tagString.includes('philosophy') || tagString.includes('consciousness')) {
    return 'from-indigo-500/20 to-purple-500/20';
  }
  
  // Default gradient
  return 'from-gray-500/20 to-slate-500/20';
};

// 示例：从聊天历史创建卡片
export const createCardFromChatMessage = (
  title: string,
  query: string,
  conversationId: string,
  messageCount: number = 1
): PresetCard => {
  const tags = generateTagsFromQuery(query);
  
  return createCardFromChatHistory(title, query, {
    tags,
    images: getDefaultImagesForQuery(query),
    color: getColorForTags(tags),
    timestamp: new Date(),
    source: 'chat',
    metadata: {
      conversationId,
      messageCount,
      relatedTopics: extractRelatedTopics(query)
    }
  });
};

// 提取相关话题
const extractRelatedTopics = (query: string): string[] => {
  const topics: string[] = [];
  const keywords = query.toLowerCase();
  
  if (keywords.includes('consciousness')) topics.push('Mind', 'Awareness', 'Philosophy');
  if (keywords.includes('quantum')) topics.push('Physics', 'Reality', 'Science');
  if (keywords.includes('ai')) topics.push('Technology', 'Future', 'Intelligence');
  if (keywords.includes('ancient')) topics.push('History', 'Wisdom', 'Tradition');
  if (keywords.includes('trump')) topics.push('Politics', 'America', 'Leadership');
  
  return topics.slice(0, 3);
}; 