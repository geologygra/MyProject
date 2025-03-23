// pages/edit/edit.js
const db = wx.cloud.database()
const { TAGS } = require('../../utils/categories.js')

Page({

    /**
     * 页面的初始数据
     */
    data: {
        lecture: null,
        lectureId: '',
        selectedDate: '',
        selectedTime: '',
        submitting: false,
        selectedTags: [],
        newTag: '',
        allTags: TAGS,
        tempPosterLink: '' // 临时存储输入的海报链接
    },

    toggleTag(e) {
        console.log('触发切换标签', e.currentTarget.dataset.tag) // 调试日志
        
        const tag = e.currentTarget.dataset.tag
        const selectedTags = [...this.data.selectedTags]
        const index = selectedTags.indexOf(tag)
        
        if (index > -1) {
            selectedTags.splice(index, 1)
        } else {
            if (selectedTags.length >= 5) {
                wx.showToast({ title: '最多选择5个标签', icon: 'none' })
                return
            }
            selectedTags.push(tag)
        }
        
        console.log('当前标签：', selectedTags) // 调试日志
        
        this.setData({
            selectedTags: selectedTags
        }, () => {
            console.log('当前选中的标签：', this.data.selectedTags) // 调试日志
        })
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        if (!options.id) {
            wx.navigateBack()
            return
        }

        this.setData({ lectureId: options.id })
        this.fetchLectureData()
    },

    fetchLectureData() {
        wx.showLoading({ title: '加载中...' })
        db.collection('lectures').doc(this.data.lectureId).get()
            .then(res => {
                const lecture = res.data
                const [date, time] = lecture.time.split(' ')
                this.setData({
                    lecture,
                    selectedDate: date,
                    selectedTime: time,
                    selectedTags: lecture.tags || [],
                    tempPosterLink: lecture.posterLink || ''
                })
                wx.hideLoading()
            })
            .catch(err => {
                console.error(err)
                wx.hideLoading()
                wx.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            })
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

    validateForm(data) {
        const { title, speaker } = data
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

        return true
    },

    onTitleInput(e) {
        const title = e.detail.value
        if (!title || this.data.selectedTags.length > 0) return
        
        // 自动推断标签
        const tags = Object.keys(TAGS).filter(key => {
            const keywords = TAGS[key].keywords
            return keywords.some(keyword => title.toLowerCase().includes(keyword))
        })
        
        if (tags.length > 0) {
            this.setData({ selectedTags: tags })
        }
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
        
        // 创建新的标签数组
        const updatedTags = [...selectedTags, newTag.trim()]
        
        this.setData({
            selectedTags: updatedTags,
            newTag: ''
        })
        
        console.log('当前标签：', updatedTags) // 调试日志
    },

    removeTag(e) {
        const tag = e.currentTarget.dataset.tag
        const updatedTags = this.data.selectedTags.filter(t => t !== tag)
        
        this.setData({
            selectedTags: updatedTags
        })
        
        console.log('当前标签：', updatedTags) // 调试日志
    },

    onSubmit(e) {
        if (this.data.submitting) return

        const formData = e.detail.value
        const { title, speaker, location, description, organizer, watchMethod } = formData
        const { selectedDate, selectedTime, selectedTags } = this.data

        if (!this.validateForm(formData)) return

        this.setData({ submitting: true })
        wx.showLoading({ title: '提交中...' })

        // 组合日期和时间
        const datetime = `${selectedDate} ${selectedTime}`

        // 准备更新数据
        const updateData = {
            _id: this.data.lecture._id,
            title: title.trim(),
            speaker: speaker.trim(),
            time: datetime,
            location: location.trim(),
            description: description ? description.trim() : '',
            organizer: organizer ? organizer.trim() : '',
            watchMethod: watchMethod ? watchMethod.trim() : '',
            tags: selectedTags,
            posterLink: this.data.tempPosterLink || '',
            showInSwiper: this.data.lecture.showInSwiper || false
        }

        console.log('更新数据:', updateData) // 添加调试日志

        // 调用云函数更新讲座
        wx.cloud.callFunction({
            name: 'updateLecture',
            data: updateData
        }).then(() => {
            console.log('讲座更新成功')
            wx.hideLoading()
            // 更新本地数据
            this.setData({
                'lecture.posterLink': updateData.posterLink
            })
            wx.showToast({
                title: '更新成功',
                icon: 'success',
                duration: 2000,
                success: () => {
                    setTimeout(() => {
                        wx.navigateBack()
                    }, 2000)
                }
            })
        }).catch(err => {
            console.error('更新失败:', err)
            wx.hideLoading()
            wx.showToast({
                title: '更新失败，请重试',
                icon: 'none'
            })
        }).finally(() => {
            this.setData({ submitting: false })
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
        wx.showLoading({ title: '上传中...' })
        
        // 如果有旧的海报，先删除旧海报
        if (this.data.lecture && this.data.lecture.posterLink) {
            wx.cloud.deleteFile({
                fileList: [this.data.lecture.posterLink]
            }).catch(console.error)
        }

        const cloudPath = `posters/${Date.now()}-${Math.random().toString(36).slice(-6)}.${tempFilePath.match(/\.([^.]+)$/)[1]}`
        
        wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
            success: res => {
                console.log('上传成功，fileID:', res.fileID) // 调试日志
                this.setData({
                    'lecture.posterLink': res.fileID  // 同时更新 lecture 对象中的 posterLink
                })
                wx.hideLoading()
                wx.showToast({
                    title: '上传成功',
                    icon: 'success'
                })
            },
            fail: err => {
                console.error(err)
                wx.hideLoading()
                wx.showToast({
                    title: '上传失败，请重试',
                    icon: 'none'
                })
            }
        })
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
        // 如果页面关闭时没有提交成功，且上传了新海报，则删除新上传的海报
        if (this.data.posterFileID && 
            this.data.posterFileID !== this.data.oldPosterFileID && 
            this.data.submitting === false) {
            wx.cloud.deleteFile({
                fileList: [this.data.posterFileID]
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

    calculateStatus(datetime) {
        const lectureTime = new Date(datetime.replace(/-/g, '/'))
        const now = new Date()
        const twoHours = 2 * 60 * 60 * 1000

        if (lectureTime > now) {
            return 'upcoming'
        } else if (lectureTime.getTime() + twoHours > now.getTime()) {
            return 'ongoing'
        } else {
            return 'ended'
        }
    },

    onCancel() {
        wx.showModal({
            title: '确认取消',
            content: '确定要放弃当前的修改吗？',
            success: (res) => {
                if (res.confirm) {
                    // 如果上传了新海报但没有保存，删除新上传的海报
                    if (this.data.posterFileID && 
                        this.data.posterFileID !== this.data.oldPosterFileID) {
                        wx.cloud.deleteFile({
                            fileList: [this.data.posterFileID]
                        }).catch(console.error)
                    }
                    wx.navigateBack()
                }
            }
        })
    },

    // 预览海报图片
    previewImage() {
        if (this.data.lecture.posterLink) {
            wx.previewImage({
                urls: [this.data.lecture.posterLink]
            })
        }
    },

    // 处理海报链接输入
    onPosterLinkInput(e) {
        const posterLink = e.detail.value.trim()
        console.log('输入的海报链接:', posterLink) // 添加调试日志
        this.setData({
            tempPosterLink: posterLink,
            'lecture.posterLink': posterLink
        })
    },

    // 切换是否在轮播中显示
    toggleShowInSwiper() {
        this.setData({
            'lecture.showInSwiper': !this.data.lecture.showInSwiper
        })
    }
})