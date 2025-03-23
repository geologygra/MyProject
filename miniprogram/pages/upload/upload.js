const db = wx.cloud.database()
const { CATEGORIES, getCategoriesByTitle } = require('../../utils/categories.js')

Page({
  data: {
    selectedDate: '',
    selectedTime: '',
    submitting: false,
    posterUrl: '',
    posterFileID: '',
    selectedCategories: [],
    maxCategories: 3,
    categories: Object.entries(CATEGORIES).map(([key, value]) => ({
      key,
      text: value.text,
      color: value.color
    })),
    selectedCategory: '',
    categoryValues: ['academic', 'technology', 'culture', 'science']
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
    })
  },

  onTimeChange(e) {
    this.setData({
      selectedTime: e.detail.value
    })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    this.setData({
      selectedCategory: this.data.categories[index].text
    })
  },

  // 选择海报
  choosePoster() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadPoster(tempFilePath)
      }
    })
  },

  // 上传海报到云存储
  uploadPoster(tempFilePath) {
    wx.showLoading({
      title: '上传中...'
    })

    const cloudPath = `posters/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: res => {
        this.setData({
          posterUrl: tempFilePath,
          posterFileID: res.fileID
        })
      },
      fail: err => {
        console.error(err)
        wx.showToast({
          title: '上传海报失败',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  validateForm(data) {
    const { title, speaker, location } = data
    const { selectedDate, selectedTime } = this.data

    if (!title.trim()) {
      wx.showToast({
        title: '请输入讲座名称',
        icon: 'none'
      })
      return false
    }

    if (!speaker.trim()) {
      wx.showToast({
        title: '请输入主讲人',
        icon: 'none'
      })
      return false
    }

    if (!selectedDate || !selectedTime) {
      wx.showToast({
        title: '请选择讲座时间',
        icon: 'none'
      })
      return false
    }

    if (!location.trim()) {
      wx.showToast({
        title: '请输入讲座地点',
        icon: 'none'
      })
      return false
    }

    return true
  },

  determineCategoryByTitle(title) {
    // 定义各分类的关键词
    const categoryKeywords = {
      academic: ['学术', '研究', '论文', '学科', '理论', '学界'],
      technology: ['技术', '编程', '开发', '工程', '算法', '系统', '智能', '数据'],
      culture: ['文化', '艺术', '历史', '哲学', '文学', '音乐', '传统'],
      science: ['科普', '科学', '物理', '化学', '生物', '数学', '实验']
    }

    // 转换为小写以进行不区分大小写的匹配
    const lowerTitle = title.toLowerCase()
    
    // 遍历关键词进行匹配
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        const index = this.data.categoryValues.indexOf(category)
        if (index !== -1) {
          this.setData({
            selectedCategory: this.data.categories[index].text
          })
        }
        return category
      }
    }

    return ''  // 如果没有匹配到任何分类
  },

  // 切换分类选择
  toggleCategory(e) {
    const key = e.currentTarget.dataset.key
    const selectedCategories = [...this.data.selectedCategories]
    const index = selectedCategories.indexOf(key)
    
    if (index > -1) {
      selectedCategories.splice(index, 1)
    } else {
      if (selectedCategories.length >= this.data.maxCategories) {
        wx.showToast({
          title: `最多选择${this.data.maxCategories}个分类`,
          icon: 'none'
        })
        return
      }
      selectedCategories.push(key)
    }
    
    this.setData({ selectedCategories })
  },

  onSubmit(e) {
    if (this.data.submitting) return

    const formData = e.detail.value
    if (!this.validateForm(formData)) return

    this.setData({ submitting: true })
    wx.showLoading({
      title: '提交中...'
    })

    const { title, speaker, location, description } = formData
    const datetime = `${this.data.selectedDate} ${this.data.selectedTime}`

    // 如果没有手动选择分类，则自动判断
    let category
    if (!this.data.selectedCategory) {
      category = this.determineCategoryByTitle(title)
    } else {
      const categoryIndex = this.data.categoryValues.indexOf(category)
      category = categoryIndex >= 0 ? this.data.categoryValues[categoryIndex] : ''
    }

    wx.cloud.callFunction({
      name: 'addLecture',
      data: {
        title: title.trim(),
        speaker: speaker.trim(),
        time: datetime,
        location: location.trim(),
        description: description ? description.trim() : '',
        posterUrl: this.data.posterFileID || '',
        categories: this.data.selectedCategories,
        status: this.calculateStatus(datetime)
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        }
      })
    }).catch(err => {
      console.error(err)
      wx.hideLoading()
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ submitting: false })
    })
  },

  calculateStatus(datetime) {
    // 修改日期格式以兼容 iOS
    const formattedTime = datetime.replace(/-/g, '/') + ':00'
    const lectureTime = new Date(formattedTime).getTime()
    const now = Date.now()
    const twoHours = 2 * 60 * 60 * 1000  // 2小时的毫秒数

    if (lectureTime > now) {
      return 'upcoming'  // 未开始
    } else if (lectureTime + twoHours > now) {
      return 'ongoing'   // 进行中（讲座开始后2小时内）
    } else {
      return 'ended'     // 已结束
    }
  },

  onUnload() {
    // 如果页面关闭时没有提交成功，则删除已上传的海报
    if (this.data.posterFileID && this.data.submitting === false) {
      wx.cloud.deleteFile({
        fileList: [this.data.posterFileID]
      }).catch(console.error)
    }
  }
}) 