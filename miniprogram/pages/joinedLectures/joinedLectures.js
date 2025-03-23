const db = wx.cloud.database()
const PAGE_SIZE = 10 // 每页显示的数据条数

Page({
  data: {
    lectures: [],
    loading: false,
    hasMore: true,  // 是否还有更多数据
    page: 0,        // 当前页码
    joinedLectureIds: [] // 存储所有参加的讲座ID
  },

  onLoad() {
    this.getJoinedLectures()
  },

  onShow() {
    // 每次显示页面时重新获取数据
    this.resetAndRefresh()
  },

  // 重置并刷新数据
  resetAndRefresh() {
    this.setData({
      lectures: [],
      page: 0,
      hasMore: true
    }, () => {
      this.getJoinedLectures()
    })
  },

  // 获取用户参加的所有讲座ID
  getJoinedLectures() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'getUserLectures',
      data: {
        type: 'joined'
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        this.setData({
          lectures: res.result.data
        })
      }
    }).catch(err => {
      console.error('获取参加的讲座失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ loading: false })
      wx.hideLoading()
      wx.stopPullDownRefresh()
    })
  },

  // 加载讲座数据
  loadLectures() {
    if (!this.data.hasMore || this.data.loading) return

    this.setData({ loading: true })
    const skip = this.data.page * PAGE_SIZE

    // 获取当前页的讲座ID
    const currentPageIds = this.data.joinedLectureIds.slice(skip, skip + PAGE_SIZE)

    if (currentPageIds.length === 0) {
      this.setData({
        loading: false,
        hasMore: false
      })
      wx.hideLoading()
      return
    }

    // 获取讲座详细信息
    db.collection('lectures').where({
      _id: db.command.in(currentPageIds)
    }).get().then(res => {
      // 按照 joinedLectureIds 的顺序排序结果
      const sortedLectures = currentPageIds.map(id => 
        res.data.find(lecture => lecture._id === id)
      ).filter(Boolean)

      this.setData({
        lectures: [...this.data.lectures, ...sortedLectures],
        loading: false,
        page: this.data.page + 1,
        hasMore: (skip + PAGE_SIZE) < this.data.joinedLectureIds.length
      })
      wx.hideLoading()
    }).catch(err => {
      console.error('获取讲座详情失败：', err)
      this.setData({ loading: false })
      wx.hideLoading()
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.getJoinedLectures()
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadLectures()
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
}) 