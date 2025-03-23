const db = wx.cloud.database()
const { CATEGORIES } = require('../../utils/categories.js')
const PAGE_SIZE = 10

Page({
  data: {
    lectures: [],
    loading: true,
    hasMore: true,
    page: 0,
    collectedLectureIds: [],
    categories: CATEGORIES
  },

  onLoad() {
    this.getCollectedLectureIds()
  },

  onShow() {
    this.resetAndRefresh()
  },

  resetAndRefresh() {
    this.setData({
      lectures: [],
      page: 0,
      hasMore: true
    }, () => {
      this.getCollectedLectureIds()
    })
  },

  getCollectedLectureIds() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '加载中...' })

    // 从 users 集合中获取收藏的讲座ID
    db.collection('users')
      .where({ _openid: openid })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          this.setData({ 
            lectures: [],
            loading: false 
          })
          return
        }

        const user = res.data[0]
        const collectedLectureIds = user.collectedLectures || []

        if (collectedLectureIds.length === 0) {
          this.setData({ 
            lectures: [],
            loading: false 
          })
          return
        }

        // 获取收藏的讲座详情
        return db.collection('lectures')
          .where({
            _id: db.command.in(collectedLectureIds)
          })
          .get()
          .then(lectureRes => {
            // 按照收藏列表的顺序排序讲座
            const sortedLectures = collectedLectureIds
              .map(id => lectureRes.data.find(lecture => lecture._id === id))
              .filter(Boolean)

            this.setData({
              lectures: sortedLectures,
              loading: false
            })
          })
      })
      .catch(err => {
        console.error('获取收藏讲座失败：', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  loadLectures() {
    if (!this.data.hasMore || this.data.loading) return

    this.setData({ loading: true })
    const skip = this.data.page * PAGE_SIZE
    const currentPageIds = this.data.collectedLectureIds.slice(skip, skip + PAGE_SIZE)

    if (currentPageIds.length === 0) {
      this.setData({
        loading: false,
        hasMore: false
      })
      wx.hideLoading()
      return
    }

    db.collection('lectures').where({
      _id: db.command.in(currentPageIds)
    }).get().then(res => {
      const sortedLectures = currentPageIds.map(id => 
        res.data.find(lecture => lecture._id === id)
      ).filter(Boolean)

      this.setData({
        lectures: [...this.data.lectures, ...sortedLectures],
        loading: false,
        page: this.data.page + 1,
        hasMore: (skip + PAGE_SIZE) < this.data.collectedLectureIds.length
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

  onPullDownRefresh() {
    this.resetAndRefresh()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadLectures()
    }
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  }
}) 