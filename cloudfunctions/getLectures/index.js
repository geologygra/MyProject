// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

// 获取下一天的日期字符串
function getNextDay(dateStr) {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { page = 0, pageSize = 10, keyword = '', timeFilter = '', startDate, endDate } = event
  const skip = page * pageSize

  try {
    // 构建查询条件
    const query = {}
    if (keyword) {
      query.$or = [
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { speaker: db.RegExp({ regexp: keyword, options: 'i' }) },
        { location: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }

    // 标签筛选
    if (event.tag) {
      query.tags = db.command.in([event.tag])  // 使用 in 操作符查找包含该标签的讲座
    }

    // 时间筛选
    if (timeFilter) {
      const now = new Date()
      // 获取今天凌晨的时间
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      // 获取明天凌晨的时间
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      // 获取后天凌晨的时间
      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

      // 将日期转换为字符串格式 YYYY-MM-DD
      const todayStr = today.toISOString().split('T')[0]
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]

      switch (timeFilter) {
        case 'past':
          // 过去的讲座：日期 < 今天
          query.time = _.lt(todayStr)
          break
        case 'today':
          // 今天的讲座：使用大于等于今天凌晨且小于明天凌晨
          query.time = _.and([
            _.gte(todayStr),
            _.lt(tomorrowStr)
          ])
          break
        case 'tomorrow':
          // 明天的讲座：使用大于等于明天凌晨且小于后天凌晨
          query.time = _.and([
            _.gte(tomorrowStr),
            _.lt(dayAfterTomorrowStr)
          ])
          break
        case 'future':
          // 将来的讲座：日期 >= 后天
          query.time = _.gte(dayAfterTomorrowStr)
          break
      }
    }

    // 日期范围查询
    if (startDate && endDate) {
      query.time = _.and([
        _.gte(startDate),
        _.lt(getNextDay(endDate)) // 使用辅助函数获取下一天
      ])
    }

    // 获取总数
    const countResult = await db.collection('lectures')
      .where(query)
      .count()

    // 获取分页数据
    const { data } = await db.collection('lectures')
      .where(query)
      .orderBy('time', 'asc')  // 按时间升序排列
      .skip(skip)
      .limit(pageSize)
      .get()

    // 添加调试日志
    console.log('Query:', query)
    console.log('Found lectures:', data)

    // 更新讲座状态
    const updatedData = data.map(lecture => {
        // 如果没有时间信息，返回默认状态
        if (!lecture.time) {
            console.warn('讲座缺少时间信息:', lecture._id)
            return {
                ...lecture,
                tags: lecture.tags || [], // 确保返回标签数组
                status: 'unknown'
            }
        }

        try {
            // 解析讲座时间字符串
            const [datePart, timePart] = lecture.time.split(' ')
            const [year, month, day] = datePart.split('-')
            const [hour, minute] = timePart.split(':')
            const lectureTime = new Date(year, month - 1, day, hour, minute)
            const now = new Date()
            const twoHours = 2 * 60 * 60 * 1000

            const timeDiff = lectureTime.getTime() - now.getTime()
            console.log('讲座时间:', lecture.time)
            console.log('当前时间:', now.toLocaleString())
            console.log('时间差(小时):', timeDiff / (60 * 60 * 1000))
            
            let status
            if (timeDiff > 0) {
                status = 'upcoming'  // 未开始
            } else if (timeDiff >= -twoHours) {
                status = 'ongoing'   // 讲座开始后2小时内
            } else {
                status = 'ended'     // 已结束
            }
            console.log('计算得到的状态:', status)

            return {
                ...lecture,
                tags: lecture.tags || [], // 确保返回标签数组
                status
            }
        } catch (error) {
            console.error('处理讲座时间出错:', error, lecture)
            return {
                ...lecture,
                tags: lecture.tags || [], // 确保返回标签数组
                status: 'error'
            }
        }
    })

    // 处理每个讲座的数据
    const processedLectures = updatedData.map(lecture => {
      // 如果讲座没有分类或分类为空数组，则不添加 categories 字段
      if (!lecture.categories || lecture.categories.length === 0) {
        const { categories, ...lectureWithoutCategories } = lecture
        return lectureWithoutCategories
      }
      return lecture
    })

    return {
      data: processedLectures,
      total: countResult.total,
      page,
      pageSize
    }

  } catch (err) {
    console.error('获取讲座列表失败：', err)
    throw err
  }
} 