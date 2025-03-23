const db = wx.cloud.database()

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
    selectedDate: '',
    dayLectures: [],
    lectureMap: {} // 存储每天是否有讲座的映射
  },

  onLoad() {
    this.initCalendar()
  },

  // 初始化日历
  async initCalendar() {
    await this.fetchMonthLectures()
    this.generateDays()
  },

  // 获取当月讲座数据
  async fetchMonthLectures() {
    // 获取当月第一天和最后一天
    const firstDay = new Date(this.data.year, this.data.month - 1, 1)
    const lastDay = new Date(this.data.year, this.data.month, 0)
    
    // 格式化日期为 YYYY-MM-DD 格式
    const startDate = firstDay.toISOString().split('T')[0]
    const endDate = lastDay.toISOString().split('T')[0]

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getLectures',
        data: {
          startDate,
          endDate,
          pageSize: 1000 // 确保获取所有讲座
        }
      })

      // 创建日期到讲座的映射
      const lectureMap = {}
      result.data.forEach(lecture => {
        const date = lecture.time.split(' ')[0] // 只取日期部分
        if (!lectureMap[date]) {
          lectureMap[date] = []
        }
        lectureMap[date].push(lecture)
      })

      this.setData({ lectureMap })
    } catch (err) {
      console.error('获取讲座失败：', err)
      wx.showToast({
        title: '获取讲座失败',
        icon: 'none'
      })
    }
  },

  // 生成日历数据
  generateDays() {
    const days = []
    const firstDay = new Date(this.data.year, this.data.month - 1, 1)
    const lastDay = new Date(this.data.year, this.data.month, 0)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // 添加上月剩余日期
    const prevMonthDays = firstDay.getDay()
    const prevMonth = new Date(this.data.year, this.data.month - 2, 0)
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i)
      const dateStr = this.formatDate(date)
      days.push({
        day: date.getDate(),
        date: dateStr,
        isCurrentMonth: false,
        hasLecture: !!this.data.lectureMap[dateStr],
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.data.selectedDate
      })
    }

    // 添加当月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.data.year, this.data.month - 1, i)
      const dateStr = this.formatDate(date)
      days.push({
        day: i,
        date: dateStr,
        isCurrentMonth: true,
        hasLecture: !!this.data.lectureMap[dateStr],
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.data.selectedDate
      })
    }

    // 添加下月开始日期
    const remainingDays = 42 - days.length // 保持6行
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.data.year, this.data.month, i)
      const dateStr = this.formatDate(date)
      days.push({
        day: i,
        date: dateStr,
        isCurrentMonth: false,
        hasLecture: !!this.data.lectureMap[dateStr],
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.data.selectedDate
      })
    }

    this.setData({ days })
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 点击日期
  onDayClick(e) {
    const date = e.currentTarget.dataset.date
    const lectures = this.data.lectureMap[date] || []
    
    // 更新选中状态
    const days = this.data.days.map(day => ({
      ...day,
      isSelected: day.date === date
    }))

    // 格式化显示日期
    const displayDate = date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日')

    this.setData({
      selectedDate: date,
      dayLectures: lectures,
      days,
      displayDate
    })
  },

  // 切换月份
  async prevMonth() {
    let { year, month } = this.data
    if (month === 1) {
      year--
      month = 12
    } else {
      month--
    }
    this.setData({ 
      year, 
      month,
      selectedDate: '',
      dayLectures: []
    }, () => {
      this.initCalendar()
    })
  },

  async nextMonth() {
    let { year, month } = this.data
    if (month === 12) {
      year++
      month = 1
    } else {
      month++
    }
    this.setData({ 
      year, 
      month,
      selectedDate: '',
      dayLectures: []
    }, () => {
      this.initCalendar()
    })
  },

  // 跳转到讲座详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
}) 