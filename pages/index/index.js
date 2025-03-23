// 标签筛选处理
onTagFilter(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({
        currentTag: tag,
        currentPage: 1,
        lectures: [] // 清空当前列表
    }, () => {
        wx.showLoading({
            title: '加载中...'
        })
        this.getLectures(true).then(() => {
            wx.hideLoading()
        }).catch(() => {
            wx.hideLoading()
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            })
        })
    })
}

// 获取讲座列表
getLectures(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    const { currentPage, pageSize, searchKeyword, timeFilter, currentTag } = this.data
    
    return wx.cloud.callFunction({
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
            lectures: refresh ? data : [...this.data.lectures, ...data],
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
        this.setData({ loading: false })
    }).finally(() => {
        wx.stopPullDownRefresh()
    })
} 