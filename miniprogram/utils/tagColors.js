// 标签颜色配置
const TAG_COLORS = {
  '哲学': { bg: 'rgba(89, 126, 247, 0.1)', text: '#597ef7' },
  '科技': { bg: 'rgba(54, 207, 201, 0.1)', text: '#36cfc9' },
  '文化': { bg: 'rgba(115, 209, 61, 0.1)', text: '#73d13d' },
  '科普': { bg: 'rgba(255, 169, 64, 0.1)', text: '#ffa940' },
  '历史': { bg: 'rgba(247, 89, 171, 0.1)', text: '#f759ab' },
  '学术': { bg: 'rgba(64, 169, 255, 0.1)', text: '#40a9ff' },
  '商业': { bg: '#f9f0ff', text: '#9254de' },
  '医疗': { bg: '#fff1f0', text: '#ff4d4f' },
  '教育': { bg: '#fcffe6', text: '#bae637' },
  '社科': { bg: '#fffbe6', text: '#ffc53d' },
  '人文': { bg: '#f4ffb8', text: '#52c41a' },
  '艺术': { bg: '#ffece6', text: '#ff7a45' },
  '工程': { bg: '#e6e6ff', text: '#597ef7' },
  '数学': { bg: '#ffe6fb', text: '#eb2f96' },
  '物理': { bg: '#e6fbff', text: '#1890ff' },
  '化学': { bg: '#ffe6e6', text: '#f5222d' },
  '生物': { bg: '#e6ffe6', text: '#52c41a' },
  '计算机': { bg: '#e6f2ff', text: '#2f54eb' }
};

// 获取标签颜色
function getTagColor(tag) {
  // 如果没有预设颜色，根据标签文本生成一个固定的颜色
  if (!TAG_COLORS[tag]) {
    const colors = [
      { bg: 'rgba(89, 126, 247, 0.1)', text: '#597ef7' },
      { bg: 'rgba(54, 207, 201, 0.1)', text: '#36cfc9' },
      { bg: 'rgba(115, 209, 61, 0.1)', text: '#73d13d' },
      { bg: 'rgba(255, 169, 64, 0.1)', text: '#ffa940' },
      { bg: 'rgba(247, 89, 171, 0.1)', text: '#f759ab' },
      { bg: '#f9f0ff', text: '#9254de' }  // 紫色系
    ];
    // 使用标签文本的字符编码和来选择颜色
    const index = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }
  return TAG_COLORS[tag];
}

module.exports = {
  TAG_COLORS,
  getTagColor
}; 