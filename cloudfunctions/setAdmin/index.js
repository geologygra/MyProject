const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 设置管理员权限的云函数
exports.main = async (event, context) => {
  const { userId, isAdmin } = event
  
  try {
    return await db.collection('users').doc(userId).update({
      data: {
        isAdmin,
        updateTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error(err)
    throw err
  }
} 