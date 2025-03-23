// pages/index/index.js
const db = wx.cloud.database()
const { TAGS } = require('../../utils/categories.js')
const { getTagColor } = require('../../utils/tagColors.js')

Page({

    /**
     * 页面的初始数据
     */
    data: {
        lectures: [],
        loading: false,
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        filterOptions: ['全部', '时间', '地点', '主讲人'],
        currentFilter: 0,
        searchKeyword: '',
        timeFilter: 'today', // 默认设置为今天
        isAdmin: false,
        currentTag: '', // 当前选中的标签
        allTags: TAGS, // 所有可用标签
        swiperList: [] // 轮播图列表
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.fetchSwiperList()
        this.getLectures(true)
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
        // 每次页面显示时检查管理员状态
        const isAdmin = wx.getStorageSync('isAdmin') || false
        this.setData({ isAdmin })
        // 每次显示页面时重新获取轮播图列表
        this.fetchSwiperList()
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

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {
        this.resetAndRefresh()
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {
        if (this.data.hasMore) {
            this.getLectures()
        }
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    },

    // 修改日期格式化工具函数
    formatDateString(dateStr) {
        if (!dateStr) return ''
        // 将 "yyyy-MM-dd HH:mm" 转换为 "yyyy/MM/dd HH:mm:ss"
        const [date, time] = dateStr.split(' ')
        return `${date.replace(/-/g, '/')} ${time}:00`
    },

    updateLectureStatus(lectures) {
        return lectures.map(lecture => {
            // 解析讲座时间字符串
            const [datePart, timePart] = lecture.time.split(' ')
            const [year, month, day] = datePart.split('-')
            const [hour, minute] = timePart.split(':')
            const lectureTime = new Date(year, month - 1, day, hour, minute).getTime()
            const now = Date.now()
            const twoHours = 2 * 60 * 60 * 1000

            const timeDiff = lectureTime - now
            
            let status
            if (timeDiff > 0) {
                status = 'upcoming'
            } else if (timeDiff >= -twoHours) {
                status = 'ongoing'
            } else {
                status = 'ended'
            }

            // 如果状态发生变化，更新数据库
            if (status !== lecture.status) {
                wx.cloud.callFunction({
                    name: 'updateLecture',
                    data: {
                        _id: lecture._id,
                        status
                    }
                }).catch(console.error)
            }

            return { ...lecture, status }
        })
    },

    // 重置并刷新数据
    resetAndRefresh() {
        this.setData({
            page: 0,
            lectures: [],
            hasMore: true
        }, () => {
            this.getLectures(true)
        })
    },

    /**
     * 获取讲座列表
     */
    getLectures(refresh = false) {
        if (this.data.loading) return
        
        this.setData({ loading: true })
        
        const { currentPage, pageSize, searchKeyword, timeFilter, currentTag } = this.data
        
        wx.cloud.callFunction({
            name: 'getLectures',
            data: {
                page: currentPage - 1,
                pageSize,
                keyword: searchKeyword,
                timeFilter,
                tag: currentTag
            }
        }).then(res => {
            const { data, total } = res.result
            const totalPages = Math.ceil(total / this.data.pageSize)
            
            this.setData({
                lectures: data,
                currentPage: currentPage,
                totalPages,
                loading: false
            })
        }).catch(err => {
            console.error('获取讲座列表失败：', err)
            wx.showToast({
                title: '获取数据失败',
                icon: 'none'
            })
        }).finally(() => {
            this.setData({ loading: false })
            wx.stopPullDownRefresh()
        })
    },

    // 切换页码
    onPageChange(e) {
        const page = parseInt(e.currentTarget.dataset.page)
        if (page !== this.data.currentPage) {
            this.setData({ currentPage: page }, () => {
                this.getLectures()
                wx.pageScrollTo({
                    scrollTop: 0,
                    duration: 300
                })
            })
        }
    },

    // 上一页
    prevPage() {
        if (this.data.currentPage > 1) {
            this.setData({ currentPage: this.data.currentPage - 1 }, () => {
                this.getLectures()
                wx.pageScrollTo({
                    scrollTop: 0,
                    duration: 300
                })
            })
        }
    },

    // 下一页
    nextPage() {
        if (this.data.currentPage < this.data.totalPages) {
            this.setData({ currentPage: this.data.currentPage + 1 }, () => {
                this.getLectures()
                wx.pageScrollTo({
                    scrollTop: 0,
                    duration: 300
                })
            })
        }
    },

    // 搜索处理
    onSearch(e) {
        const keyword = e.detail.value
        this.setData({ 
            searchKeyword: keyword,
            currentPage: 1
        }, () => {
            this.getLectures(1)
        })
    },

    onFilterChange(e) {
        const filterIndex = parseInt(e.detail.value)
        this.setData({ 
            currentFilter: filterIndex,
            page: 0,  // 重置页码
            lectures: []  // 清空列表
        }, () => {
            this.getLectures(true)  // 重新加载
        })
    },

    onTimeFilterTap(e) {
        const type = e.currentTarget.dataset.type
        const newType = this.data.timeFilter === type ? '' : type
        
        this.setData({ 
            timeFilter: newType,
            currentPage: 1
        }, () => {
            this.getLectures(1)
        })
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id
        wx.navigateTo({
            url: `/pages/detail/detail?id=${id}`
        })
    },

    goToAdd() {
        console.log('点击添加按钮，管理员状态：', this.data.isAdmin) // 调试日志
        
        if (!this.data.isAdmin) {
            console.log('非管理员用户') // 调试日志
            wx.showToast({
                title: '仅管理员可添加讲座',
                icon: 'none'
            })
            return
        }

        console.log('准备跳转到添加页面') // 调试日志
        wx.navigateTo({
            url: '/pages/add/add',
            success: () => {
                console.log('跳转成功') // 调试日志
            },
            fail: (err) => {
                console.error('跳转失败：', err) // 调试日志
            }
        })
    },

    // 标签筛选处理
    onTagFilter(e) {
        const tag = e.currentTarget.dataset.tag
        this.setData({
            currentTag: tag,
            currentPage: 1
        }, () => {
            this.getLectures(true)
        })
    },

    // 添加获取标签颜色的方法
    getTagColor(tag) {
        return getTagColor(tag)
    },

    // 处理轮播图片加载错误
    onSwiperImageError(e) {
        const index = e.currentTarget.dataset.index
        console.error(`轮播图片加载失败，索引: ${index}`)
    },

    // 获取轮播图列表
    fetchSwiperList() {
        console.log('开始获取轮播图列表')
        db.collection('lectures')
            .where({
                showInSwiper: true,
                posterLink: db.command.neq('')
            })
            .orderBy('updateTime', 'desc') // 按更新时间倒序排列
            .get()
            .then(res => {
                console.log('获取到的轮播图数据:', res.data)
                this.setData({
                    swiperList: res.data.filter(item => item.posterLink) // 确保有海报链接
                })
            })
    },
})