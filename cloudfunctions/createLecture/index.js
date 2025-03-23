const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const { 
    title, 
    speaker, 
    time, 
    location, 
    description, 
    posterUrl,
    categories, // 确保接收分类数据
    tags // 确保接收标签数据
  } = event

  try {
    return await db.collection('lectures').add({
      data: {
        title,
        speaker,
        time,
        location,
        description,
        posterUrl,
        categories, // 确保保存分类数据
        tags: tags || [], // 确保保存标签数组
        status: 'upcoming', // 新创建的讲座默认为未开始
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error('[创建讲座失败]', err)
    throw err
  }
} 