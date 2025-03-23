const cloud = require('wx-server-sdk')
cloud.init()

// 注意：云函数中不应该直接引用小程序的文件
// 如果需要分类相关的功能，应该在云函数中重新定义
const CATEGORIES = {
  academic: {
    text: '学术',
    keywords: ['学术', '研究', '论文', '学科', '理论', '学界']
  },
  technology: {
    text: '科技',
    keywords: ['技术', '编程', '开发', '工程', '算法', '系统', '智能', '数据']
  },
  culture: {
    text: '文化',
    keywords: ['文化', '艺术', '历史', '哲学', '文学', '音乐', '传统']
  },
  science: {
    text: '科普',
    keywords: ['科普', '科学', '物理', '化学', '生物', '数学', '实验']
  }
}

const db = cloud.database()

exports.main = async (event, context) => {
  const { 
    _id, 
    title, 
    speaker, 
    time, 
    location, // location 可以为空
    description, 
    posterLink,
    categories, // 确保接收分类数据
    status,
    watchMethod,
    showInSwiper,
    tags
  } = event

  try {
    // 确保标签是数组
    if (tags && !Array.isArray(tags)) {
      event.tags = []
    }

    return await db.collection('lectures').doc(_id).update({
      data: {
        title,
        speaker,
        time,
        location: location || '', // 如果为空则存储空字符串
        description,
        posterLink,
        categories, // 确保更新分类数据
        status,
        watchMethod: watchMethod || '', // 添加观看方式字段
        showInSwiper: showInSwiper || false, // 是否在轮播中显示的标记
        tags,
        updateTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error('[更新讲座失败]', err)
    throw err
  }
} 