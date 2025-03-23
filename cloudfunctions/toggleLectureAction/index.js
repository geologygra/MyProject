// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, lectureId, isAdd } = event
  
  if (!openid || !lectureId || !action) {
    return {
      code: -1,
      error: '参数不完整'
    }
  }
  
  try {
    let collectionName
    
    // 根据操作类型确定集合名称
    if (action === 'join') {
      collectionName = 'user_joined_lectures'
    } else if (action === 'collect') {
      collectionName = 'user_collected_lectures'
    } else {
      return {
        code: -1,
        error: '无效的操作类型'
      }
    }
    
    // 检查集合是否存在，不存在则创建
    try {
      await db.createCollection(collectionName)
      console.log(`集合 ${collectionName} 创建成功`)
    } catch (err) {
      // 如果集合已存在，会抛出错误，但可以忽略
      console.log(`集合 ${collectionName} 已存在或创建失败: ${err}`)
    }
    
    if (isAdd) {
      // 添加记录
      // 先检查是否已存在记录
      const checkResult = await db.collection(collectionName)
        .where({
          _openid: openid,
          lectureId
        })
        .get()
      
      if (checkResult.data.length === 0) {
        // 不存在则添加
        await db.collection(collectionName).add({
          data: {
            _openid: openid,
            lectureId,
            createTime: db.serverDate()
          }
        })
      }
      
      return { code: 0, message: '添加成功' }
    } else {
      // 删除记录
      await db.collection(collectionName)
        .where({
          _openid: openid,
          lectureId
        })
        .remove()
      
      return { code: 0, message: '删除成功' }
    }
  } catch (err) {
    console.error(`操作失败: ${err}`)
    return {
      code: -1,
      error: err
    }
  }
} 