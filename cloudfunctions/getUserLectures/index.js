// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type = 'joined' } = event;
  
  try {
    let userRecords;
    
    // 根据类型查询不同的集合
    if (type === 'joined') {
      userRecords = await db.collection('user_joined_lectures')
        .where({ _openid: openid })
        .get();
    } else if (type === 'collected') {
      userRecords = await db.collection('user_collected_lectures')
        .where({ _openid: openid })
        .get();
    } else {
      return {
        code: -1,
        error: '无效的查询类型'
      };
    }
    
    // 如果没有记录，直接返回空数组
    if (userRecords.data.length === 0) {
      return {
        code: 0,
        data: []
      };
    }
    
    // 获取讲座ID列表
    const lectureIds = userRecords.data.map(record => record.lectureId);
    
    // 查询讲座详情
    const lectures = await db.collection('lectures')
      .where({
        _id: _.in(lectureIds)
      })
      .get();
    
    // 添加用户交互状态
    const lecturesWithStatus = lectures.data.map(lecture => ({
      ...lecture,
      isJoined: type === 'joined' ? true : false,
      isCollected: type === 'collected' ? true : false
    }));
    
    return {
      code: 0,
      data: lecturesWithStatus
    };
  } catch (err) {
    console.error('获取用户讲座失败:', err);
    return {
      code: -1,
      error: err
    };
  }
} 