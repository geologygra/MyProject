// 预设的标签列表
const TAGS = [
   'AI', '哲学', '考古', '文化',  '历史', 
  '商业', '医学', '教育',  '文学', '艺术',
  '工程', '数学', '物理', '化学', '生物', 
  '金融', '法律', '政治', '军事', '体育', '音乐'
];

module.exports = {
  TAGS,
  // 获取所有预设标签
  getAllTags() {
    return TAGS;
  },
  // 验证标签是否合法（可选）
  isValidTag(tag) {
    return typeof tag === 'string' && tag.length > 0 && tag.length <= 10;
  }
}; 