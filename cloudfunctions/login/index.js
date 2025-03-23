const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 返回用户的 openid 等信息
    return {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      env: wxContext.ENV,
    }
  } catch (err) {
    console.error(err)
    throw err
  }
} 