// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 在云函数中直接定义分类配置，而不是引用小程序文件
const CATEGORIES = {
  academic: {
    text: '学术',
    keywords: ['学术', '研究', '论文', '学科', '理论', '学界']
  },
  technology: {
    text: '科技',
    keywords: ['技术', '编程', '开发', '工程', '算法', '系统']
  },
  culture: {
    text: '文化',
    keywords: ['文化', '艺术', '历史', '哲学', '文学', '音乐']
  },
  science: {
    text: '科普',
    keywords: ['科普', '科学', '物理', '化学', '生物', '数学']
  }
}

// 添加自动判断分类的函数
function determineCategoriesByTitle(title) {
  const lowerTitle = title.toLowerCase()
  const matchedCategories = []

  Object.entries(CATEGORIES).forEach(([category, { keywords }]) => {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      matchedCategories.push(category)
    }
  })

  return matchedCategories
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { 
    title, 
    speaker, 
    time, 
    location, 
    description, 
    organizer,
    posterUrl,
    categories,
    status 
  } = event

  try {
    // 如果没有传入分类，则自动判断
    const finalCategories = categories && categories.length > 0 
      ? categories 
      : determineCategoriesByTitle(title)
    
    return await db.collection('lectures').add({
      data: {
        title,
        speaker,
        time,
        location,
        description,
        organizer,
        posterUrl,
        categories: finalCategories,
        status,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error('[创建讲座失败]', err)
    throw err
  }
} 