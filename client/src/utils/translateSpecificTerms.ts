// Utility function to translate specific Chinese terms to English
export function translateSpecificTerms(text: string, language: string): string {
  // Only translate when language is English
  if (language !== 'en' || !text) {
    return text;
  }

  // Define specific translation mappings
  const translations: { [key: string]: string } = {
    // Core terms
    模型全名: 'Model Full Name',
    即时: 'Instant',
    备注: 'Notes',
    API名: 'API Name',
    API名称: 'API Name',

    // Model info related terms
    输入: 'Input',
    输出: 'Output',
    输入价格: 'Input Price',
    输出价格: 'Output Price',
    上下文长度: 'Context Length',
    截止日期: 'Cutoff Date',
    知识截止: 'Knowledge Cutoff',

    // Status and evaluation terms
    评测: 'Evaluation',
    得分: 'Score',
    排名: 'Ranking',
    性能: 'Performance',
    准确率: 'Accuracy',
    通过率: 'Pass Rate',

    // Time and date related
    最新: 'Latest',
    更新: 'Updated',
    发布: 'Released',
    版本: 'Version',

    // Model types
    基础模型: 'Base Model',
    指令模型: 'Instruction Model',
    对话模型: 'Chat Model',
    预训练模型: 'Pretrained Model',

    // Technical terms
    参数量: 'Parameters',
    推理速度: 'Inference Speed',
    延迟: 'Latency',
    吞吐量: 'Throughput',

    // Boolean values
    是: 'Yes',
    否: 'No',
    有: 'Yes',
    无: 'No',
    支持: 'Supported',
    不支持: 'Not Supported',

    // Units and measurements
    百万: 'Million',
    千万: '10M',
    亿: '100M',
    万亿: 'Trillion',
    美元: 'USD',
    人民币: 'CNY',

    // Dataset and benchmark names (commonly used)
    中文: 'Chinese',
    英文: 'English',

    // Special terms
    '计价单位：$ / M tokens': 'Pricing: $ / M tokens',
  };

  let translatedText = text;

  // Apply translations - exact match first
  if (translations[text]) {
    return translations[text];
  }

  // Apply partial translations for compound terms
  Object.entries(translations).forEach(([chinese, english]) => {
    // Use word boundary regex to avoid partial matches within words
    const regex = new RegExp(
      chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g'
    );
    translatedText = translatedText.replace(regex, english);
  });

  return translatedText;
}
