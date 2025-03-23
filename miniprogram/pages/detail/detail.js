// pages/detail/detail.js
const db = wx.cloud.database()
const { CATEGORIES } = require('../../utils/categories.js')
const { getTagColor } = require('../../utils/tagColors.js')

Page({

    /**
     * 页面的初始数据
     */
    data: {
        lecture: null,
        loading: true,
        categories: CATEGORIES,
        categoryValues: ['academic', 'technology', 'culture', 'science'],
        isAdmin: false,
        shareImage: '', // 分享图片的临时路径
        canvasWidth: 750, // canvas 宽度
        canvasHeight: 1000 // canvas 高度
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        const { id } = options
        this.getLectureDetail(id)
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
        // 检查用户登录和管理员状态
        const isAdmin = wx.getStorageSync('isAdmin') || false
        this.setData({ isAdmin })
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
        const { lecture } = this.data
        if (!lecture) return {
            title: '讲座详情',
            path: '/pages/index/index'
        }
        
        return {
            title: lecture.title,
            path: `/pages/detail/detail?id=${lecture._id}`,
            imageUrl: lecture.posterUrl || lecture.posterLink || '',
            success: function(res) {
                wx.showToast({
                    title: '分享成功',
                    icon: 'success'
                })
            },
            fail: function(res) {
                wx.showToast({
                    title: '分享失败',
                    icon: 'none'
                })
            }
        }
    },

    /**
     * 用户点击右上角分享到朋友圈
     */
    onShareTimeline() {
        const { lecture } = this.data
        if (!lecture) return {
            title: '讲座详情',
            query: ''
        }
        
        return {
            title: `${lecture.title} - ${lecture.speaker || ''}`,
            query: `id=${lecture._id}`,
            imageUrl: lecture.posterUrl || lecture.posterLink || '',
            success: function(res) {
                wx.showToast({
                    title: '分享成功',
                    icon: 'success'
                })
            },
            fail: function(res) {
                wx.showToast({
                    title: '分享失败',
                    icon: 'none'
                })
            }
        }
    },

    // 生成分享图片
    async generateShareImage() {
        const { lecture } = this.data
        if (!lecture) return
        
        wx.showLoading({ title: '生成图片中...' })
        
        try {
            // 创建 canvas context
            const ctx = wx.createCanvasContext('shareCanvas')
            
            // 设置背景色
            ctx.setFillStyle('#ffffff')
            ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
            
            // 绘制标题
            ctx.setFontSize(40)
            ctx.setFillStyle('#333333')
            this.drawWrappedText(ctx, lecture.title, 50, 100, this.data.canvasWidth - 100, 60)
            
            // 绘制时间、地点等信息
            ctx.setFontSize(30)
            ctx.setFillStyle('#666666')
            let y = 250
            const info = [
                `时间：${lecture.time || '暂无'}`,
                `地点：${lecture.location || '暂无'}`,
                `主讲人：${lecture.speaker || '暂无'}`
            ]
            
            info.forEach(text => {
                ctx.fillText(text, 50, y)
                y += 60
            })
            
            // 如果有海报图片，绘制海报
            const posterImage = lecture.posterUrl || lecture.posterLink
            if (posterImage) {
                try {
                    await this.drawPosterImage(ctx, posterImage, 50, y, 650, 300)
                    y += 320
                } catch (err) {
                    console.error('绘制海报失败:', err)
                }
            }
            
            // 绘制二维码提示
            ctx.setFontSize(28)
            ctx.setFillStyle('#999999')
            ctx.fillText('长按识别二维码，查看讲座详情', 50, y + 50)
            
            // 绘制完成
            ctx.draw(false, async () => {
                try {
                    const tempFilePath = await this.canvasToTempFilePath()
                    this.setData({ shareImage: tempFilePath })
                    wx.hideLoading()
                    
                    // 显示保存图片的提示
                    wx.showModal({
                        title: '图片已生成',
                        content: '图片已生成，是否保存到相册？',
                        success: (res) => {
                            if (res.confirm) {
                                this.saveImageToAlbum()
                            }
                        }
                    })
                } catch (err) {
                    console.error('生成图片失败:', err)
                    wx.hideLoading()
                    wx.showToast({
                        title: '生成图片失败',
                        icon: 'none'
                    })
                }
            })
        } catch (err) {
            console.error('生成分享图片失败:', err)
            wx.hideLoading()
            wx.showToast({
                title: '生成图片失败',
                icon: 'none'
            })
        }
    },
    
    // 将文本按指定宽度换行绘制
    drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return y
        
        const chars = text.split('')
        let line = ''
        let currentY = y
        
        chars.forEach(char => {
            const testLine = line + char
            const metrics = ctx.measureText(testLine)
            
            if (metrics.width > maxWidth && line.length > 0) {
                ctx.fillText(line, x, currentY)
                line = char
                currentY += lineHeight
            } else {
                line = testLine
            }
        })
        
        ctx.fillText(line, x, currentY)
        return currentY
    },
    
    // 绘制海报图片
    drawPosterImage(ctx, imageUrl, x, y, width, height) {
        return new Promise((resolve, reject) => {
            wx.getImageInfo({
                src: imageUrl,
                success: (res) => {
                    ctx.drawImage(res.path, x, y, width, height)
                    resolve()
                },
                fail: reject
            })
        })
    },
    
    // Canvas 转临时文件路径
    canvasToTempFilePath() {
        return new Promise((resolve, reject) => {
            wx.canvasToTempFilePath({
                canvasId: 'shareCanvas',
                success: res => resolve(res.tempFilePath),
                fail: reject
            })
        })
    },
    
    // 保存图片到相册
    async saveImageToAlbum() {
        if (!this.data.shareImage) {
            wx.showToast({
                title: '请先生成分享图片',
                icon: 'none'
            })
            return
        }
        
        try {
            await wx.saveImageToPhotosAlbum({
                filePath: this.data.shareImage
            })
            wx.showToast({
                title: '保存成功',
                icon: 'success'
            })
        } catch (err) {
            console.error('保存图片失败:', err)
            if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                    title: '提示',
                    content: '需要您授权保存图片到相册',
                    success: (res) => {
                        if (res.confirm) {
                            wx.openSetting()
                        }
                    }
                })
            } else {
                wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                })
            }
        }
    },

    // 分享到朋友圈
    shareToTimeline() {
        this.generateShareImage()
    },

    getLectureDetail(id) {
        wx.showLoading({ title: '加载中...' })
        
        const openid = wx.getStorageSync('openid')
        if (!openid) {
            wx.hideLoading()
            wx.showToast({
                title: '请在个人中心登录后查看讲座详情',
                icon: 'none',
                duration: 2000,
                success: () => {
                    // 延迟返回，让用户能看到提示
                    setTimeout(() => {
                        wx.navigateBack()
                    }, 2000)
                }
            })
            return
        }

        // 同时获取讲座信息、用户信息和参加状态
        Promise.all([
            db.collection('lectures').doc(id).get(),
            db.collection('users').where({
                _openid: openid
            }).get(),
            // 查询用户是否参加该讲座
            db.collection('user_joined_lectures').where({
                _openid: openid,
                lectureId: id
            }).get()
        ]).then(([lectureRes, userRes, joinRes]) => {
            const lecture = lectureRes.data
            const user = userRes.data[0] || {}
            
            // 检查收藏和参加状态
            lecture.isCollected = (user.collectedLectures || []).includes(id)
            lecture.isJoined = joinRes.data.length > 0
            
            this.setData({
                lecture,
                loading: false
            })
            wx.hideLoading()
        }).catch(err => {
            console.error('获取讲座详情失败：', err)
            wx.hideLoading()
            wx.showToast({
                title: '获取详情失败',
                icon: 'none'
            })
        })
    },

    // 切换收藏状态
    toggleCollect() {
        const openid = wx.getStorageSync('openid')
        if (!openid) {
            wx.showToast({
                title: '请先登录',
                icon: 'none'
            })
            return
        }

        const lectureId = this.data.lecture._id
        const isCollected = this.data.lecture.isCollected

        wx.showLoading({ title: isCollected ? '取消收藏中...' : '收藏中...' })

        // 更新用户的收藏列表
        db.collection('users').where({
            _openid: openid
        }).update({
            data: {
                collectedLectures: isCollected ?
                    db.command.pull(lectureId) :
                    db.command.addToSet(lectureId)
            }
        }).then(() => {
            this.setData({
                'lecture.isCollected': !isCollected
            })
            wx.hideLoading()
            wx.showToast({
                title: isCollected ? '已取消收藏' : '已收藏',
                icon: 'success'
            })
        }).catch(err => {
            console.error('更新收藏状态失败：', err)
            wx.hideLoading()
            wx.showToast({
                title: '操作失败',
                icon: 'none'
            })
        })
    },

    // 修改参加讲座功能
    toggleJoin() {
        // 检查用户是否登录
        const openid = wx.getStorageSync('openid')
        if (!openid) {
            wx.showToast({
                title: '请先登录',
                icon: 'none'
            })
            return
        }
        
        const lectureId = this.data.lecture._id
        const isJoined = this.data.lecture.isJoined
        
        wx.showLoading({ title: isJoined ? '取消中...' : '参加中...' })
        
        // 根据当前状态决定是添加还是删除记录
        if (isJoined) {
            // 取消参加
            wx.cloud.callFunction({
                name: 'toggleLectureAction',
                data: {
                    action: 'join',
                    lectureId,
                    isAdd: false
                }
            }).then(res => {
                if (res.result && res.result.code === 0) {
                    // 更新本地状态
                    const lecture = { ...this.data.lecture, isJoined: false }
                    this.setData({ lecture })
                    
                    wx.showToast({
                        title: '已取消参加',
                        icon: 'success'
                    })
                } else {
                    throw new Error(res.result.error || '操作失败')
                }
            }).catch(err => {
                console.error('取消参加失败:', err)
                wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                })
            }).finally(() => {
                wx.hideLoading()
            })
        } else {
            // 参加讲座
            wx.cloud.callFunction({
                name: 'toggleLectureAction',
                data: {
                    action: 'join',
                    lectureId,
                    isAdd: true
                }
            }).then(res => {
                if (res.result && res.result.code === 0) {
                    // 更新本地状态
                    const lecture = { ...this.data.lecture, isJoined: true }
                    this.setData({ lecture })
                    
                    wx.showToast({
                        title: '已参加',
                        icon: 'success'
                    })
                } else {
                    throw new Error(res.result.error || '操作失败')
                }
            }).catch(err => {
                console.error('参加讲座失败:', err)
                wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                })
            }).finally(() => {
                wx.hideLoading()
            })
        }
    },

    formatTime(dateStr) {
        if (!dateStr) return ''
        // 处理数据库中的时间戳
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
            // 如果是字符串格式，先转换为 iOS 兼容格式
            const formattedStr = dateStr.replace(/-/g, '/') + ':00'
            date = new Date(formattedStr)
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    onEdit() {
        const { _id } = this.data.lecture
        wx.navigateTo({
            url: `/pages/edit/edit?id=${_id}`
        })
    },

    onDelete() {
        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个讲座信息吗？删除后无法恢复。',
            success: res => {
                if (res.confirm) {
                    this.deleteLecture()
                }
            }
        })
    },

    deleteLecture() {
        const lectureId = this.data.lecture._id
        if (!lectureId) {
            wx.showToast({
                title: '无法删除，讲座ID不存在',
                icon: 'none'
            })
            return
        }

        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个讲座吗？此操作不可恢复。',
            success: res => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中...' })
                    wx.cloud.callFunction({
                        name: 'deleteLecture',
                        data: { lectureId }
                    })
                    .then(() => {
                        wx.showToast({
                            title: '删除成功',
                            icon: 'success'
                        })
                        // 返回上一页
                        setTimeout(() => {
                            wx.navigateBack()
                        }, 1500)
                    })
                    .catch(err => {
                        console.error('删除失败：', err)
                        wx.showToast({
                            title: '删除失败',
                            icon: 'none'
                        })
                    })
                    .finally(() => {
                        wx.hideLoading()
                    })
                }
            }
        })
    },

    previewPoster() {
        const posterImage = this.data.lecture.posterUrl || this.data.lecture.posterLink;
        
        // 检查 URL 是否有效
        if (!posterImage || posterImage.trim() === '') {
            wx.showToast({
                title: '图片链接无效',
                icon: 'none'
            })
            return;
        }

        // 直接预览图片
        wx.previewImage({
            urls: [posterImage],
            current: posterImage,
            showmenu: true
        })
    },

    // 添加获取标签颜色的方法
    getTagColor(tag) {
        return getTagColor(tag)
    },

    copyLectureInfo() {
        const { lecture } = this.data
        if (!lecture) return
        
        // 格式化讲座信息
        const info = [
            `【${lecture.title}】`,
            `时间：${lecture.time || '暂无'}`,
            `地点：${lecture.location || '暂无'}`,
            `主讲人：${lecture.speaker || '暂无'}`,
            `主办方：${lecture.organizer || '暂无'}`,
            lecture.watchMethod ? `观看方式：${lecture.watchMethod}` : '',
            `\n简介：${lecture.description || '暂无'}`,
            lecture.tags?.length ? `\n标签：${lecture.tags.join('、')}` : ''
        ].filter(Boolean).join('\n')
        
        wx.setClipboardData({
            data: info,
            success: () => {
                wx.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                })
            },
            fail: () => {
                wx.showToast({
                    title: '复制失败',
                    icon: 'none'
                })
            }
        })
    },

    editLecture() {
        const lectureId = this.data.lecture._id
        if (lectureId) {
            wx.navigateTo({
                url: `/pages/edit/edit?id=${lectureId}`
            })
        } else {
            wx.showToast({
                title: '无法编辑，讲座ID不存在',
                icon: 'none'
            })
        }
    },
})