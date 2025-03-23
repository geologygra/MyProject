// pages/add/add.js
const db = wx.cloud.database()
const { TAGS } = require('../../utils/categories.js')

Page({

    /**
     * 页面的初始数据
     */
    data: {
        selectedDate: '',
        selectedTime: '',
        submitting: false,
        posterLink: '',
        selectedTags: [],
        newTag: '',
        allTags: TAGS,
        quickTimeOptions: [
            { text: '今天', value: 0 },
            { text: '明天', value: 1 },
            { text: '后天', value: 2 }
        ],
        commonTimes: [
            '09:00', '10:00', '14:00', '15:00', '19:00', '20:00'
        ],
        organizer: '',
        customDate: '', // 自定义日期
        showCustomDatePicker: false, // 是否显示自定义日期选择器
        dateRange: {
            start: new Date().toISOString().split('T')[0], // 今天
            end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 一年后
        },
        customDateInput: '', // 添加自定义日期输入
        showCalendar: false, // 控制日历显示
        showDateInput: false, // 控制日期输入框显示
        dateInputValue: '', // 日期输入框的值
        showTimeInput: false, // 控制时间输入框显示
        timeInputValue: '', // 时间输入框的值
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {
        if (this.data.posterLink && this.data.submitting === false) {
            wx.cloud.deleteFile({
                fileList: [this.data.posterLink]
            }).catch(console.error)
        }
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

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

    toggleTag(e) {
        const tag = e.currentTarget.dataset.tag
        const selectedTags = [...this.data.selectedTags]
        const index = selectedTags.indexOf(tag)
        
        if (index > -1) {
            selectedTags.splice(index, 1)
        } else {
            if (selectedTags.length >= 5) { // 设置最大标签数量为5个
                wx.showToast({
                    title: '最多选择5个标签',
                    icon: 'none'
                })
                return
            }
            selectedTags.push(tag)
        }
        
        this.setData({
            selectedTags: selectedTags
        })
    },

    onTagInput(e) {
        this.setData({ newTag: e.detail.value })
    },

    addTag() {
        const { newTag, selectedTags } = this.data
        if (!newTag.trim()) return
        
        if (selectedTags.includes(newTag.trim())) {
            wx.showToast({ title: '标签已存在', icon: 'none' })
            return
        }
        
        if (selectedTags.length >= 5) {
            wx.showToast({ title: '最多选择5个标签', icon: 'none' })
            return
        }
        
        this.setData({
            selectedTags: [...selectedTags, newTag.trim()],
            newTag: ''
        })
    },

    removeTag(e) {
        const tag = e.currentTarget.dataset.tag
        this.setData({
            selectedTags: this.data.selectedTags.filter(t => t !== tag)
        })
    },

    validateForm(data) {
        const { title, speaker, location } = data
        const { selectedDate, selectedTime } = this.data

        if (!title || !title.trim()) {
            wx.showToast({
                title: '请输入讲座名称',
                icon: 'none'
            })
            return false
        }

        if (!speaker || !speaker.trim()) {
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

        if (!location || !location.trim()) {
            wx.showToast({
                title: '请输入讲座地点',
                icon: 'none'
            })
            return false
        }

        return true
    },

    calculateStatus(datetime) {
        // 将讲座时间字符串转换为 Date 对象
        const formattedTime = datetime.replace(/-/g, '/') // 兼容 iOS
        const lectureTime = new Date(formattedTime).getTime()
        const now = Date.now()
        const twoHours = 2 * 60 * 60 * 1000  // 2小时的毫秒数

        const timeDiff = lectureTime - now
        
        if (timeDiff > 0) {
            return 'upcoming'  // 未开始
        } else if (timeDiff >= -twoHours) {
            return 'ongoing'   // 进行中（讲座开始后2小时内）
        } else {
            return 'ended'     // 已结束
        }
    },

    onSubmit(e) {
        if (this.data.submitting) return

        const formData = e.detail.value
        const { title, speaker, location, description, organizer, posterLink } = formData
        
        if (!this.validateForm(formData)) {
            wx.showToast({
                title: '请填写必填项',
                icon: 'none'
            })
            return
        }

        this.setData({ submitting: true })
        wx.showLoading({ title: '提交中...' })

        const datetime = `${this.data.selectedDate} ${this.data.selectedTime}`

        wx.cloud.callFunction({
            name: 'createLecture',
            data: {
                title: title.trim(),
                speaker: speaker.trim(),
                time: datetime,
                location: location ? location.trim() : '',
                description: description ? description.trim() : '',
                organizer: organizer ? organizer.trim() : '',
                posterLink: posterLink ? posterLink.trim() : '',
                tags: this.data.selectedTags,
                status: this.calculateStatus(datetime)
            }
        })
        .then(() => {
            wx.hideLoading()
            wx.showToast({
                title: '添加成功',
                icon: 'success',
                duration: 2000,
                success: () => {
                    setTimeout(() => {
                        wx.switchTab({
                            url: '/pages/index/index'
                        })
                    }, 2000)
                }
            })
        })
        .catch(err => {
            console.error('添加失败：', err)
            wx.hideLoading()
            wx.showToast({
                title: '添加失败，请重试',
                icon: 'none'
            })
        })
        .finally(() => {
            this.setData({ submitting: false })
        })
    },

    // 快速选择日期
    onQuickDateSelect(e) {
        const days = e.currentTarget.dataset.days
        const date = new Date()
        date.setDate(date.getDate() + days)
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const selectedDate = `${year}-${month}-${day}`
        
        this.setData({ 
            selectedDate,
            isCustomDate: false
        })
    },

    // 显示日期选择器
    showDatePicker() {
        this.setData({
            showDateInput: true,
            dateInputValue: ''
        })
    },

    // 修改显示时间选择器方法
    showTimePicker() {
        this.setData({
            showTimeInput: true,
            timeInputValue: ''
        })
    },

    // 处理时间输入
    onTimeInput(e) {
        let value = e.detail.value
        // 自动添加时间分隔符
        value = value.replace(/\D/g, '') // 只保留数字
        if (value.length > 2) {
            value = value.slice(0, 2) + ':' + value.slice(2)
        }
        if (value.length > 5) {
            value = value.slice(0, 5)
        }
        
        this.setData({ timeInputValue: value })
        
        // 如果输入完整时间，则验证并更新
        if (value.length === 5) {
            this.validateAndUpdateTime(value)
        }
    },

    // 验证并更新时间
    validateAndUpdateTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number)
        
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            this.setData({
                selectedTime: timeStr,
                showTimeInput: false
            })
        } else {
            wx.showToast({
                title: '请输入有效时间',
                icon: 'none'
            })
            this.setData({ timeInputValue: '' })
        }
    },

    // 选择时间
    onTimeSelect(e) {
        const time = e.currentTarget.dataset.time
        this.setData({ selectedTime: time })
    },

    // 处理日期输入
    onDateInput(e) {
        let value = e.detail.value
        // 自动添加日期分隔符
        value = value.replace(/\D/g, '') // 只保留数字
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4)
        }
        if (value.length > 7) {
            value = value.slice(0, 7) + '-' + value.slice(7)
        }
        if (value.length > 10) {
            value = value.slice(0, 10)
        }
        
        this.setData({ dateInputValue: value })
        
        // 如果输入完整日期，则验证并更新
        if (value.length === 10) {
            this.validateAndUpdateDate(value)
        }
    },

    // 验证并更新日期
    validateAndUpdateDate(dateStr) {
        const date = new Date(dateStr)
        const start = new Date(this.data.dateRange.start)
        const end = new Date(this.data.dateRange.end)
        
        if (date >= start && date <= end && !isNaN(date.getTime())) {
            this.setData({
                selectedDate: dateStr,
                isCustomDate: true,
                showDateInput: false
            })
        } else {
            wx.showToast({
                title: '请输入有效日期',
                icon: 'none'
            })
            this.setData({ dateInputValue: '' })
        }
    }
})