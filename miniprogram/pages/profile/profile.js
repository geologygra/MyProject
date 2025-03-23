const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    isAdmin: false,  // 添加管理员状态
    loadingJoined: false,
    joinedLectures: []
  },

  onLoad() {
    // 检查是否支持 getUserProfile
    if (wx.getUserProfile) {
      this.setData({ canIUseGetUserProfile: true })
    }
    // 检查是否已登录
    this.checkUserLogin()
  },

  checkUserLogin() {
    wx.showLoading({ title: '加载中...' })
    const openid = wx.getStorageSync('openid')
    
    if (!openid) {
      wx.hideLoading()
      return
    }

    // 获取用户信息和权限
    db.collection('users').where({
      _openid: openid
    }).get().then(res => {
      if (res.data.length > 0) {
        const userInfo = res.data[0]
        const isAdmin = userInfo.isAdmin || false
        
        // 更新本地存储和页面状态
        wx.setStorageSync('isAdmin', isAdmin)
        this.setData({
          userInfo,
          hasUserInfo: true,
          isAdmin
        })
        
        console.log('用户登录状态：', {
          openid,
          isAdmin,
          userInfo
        })
      }
      wx.hideLoading()
    }).catch(err => {
      console.error('获取用户信息失败：', err)
      wx.hideLoading()
    })
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        wx.showLoading({ title: '登录中...' })
        
        // 调用云函数获取 openid
        wx.cloud.callFunction({
          name: 'login'
        }).then(result => {
          if (!result.result || !result.result.openid) {
            throw new Error('获取用户信息失败')
          }
          
          const openid = result.result.openid
          wx.setStorageSync('openid', openid)
          
          // 检查用户是否已存在
          return db.collection('users').where({
            _openid: openid
          }).get()
        }).then(res => {
          if (res.data.length > 0) {
            // 用户已存在，更新信息
            return db.collection('users').doc(res.data[0]._id).update({
              data: {
                ...userInfo,
                updateTime: db.serverDate()
              }
            })
          } else {
            // 新用户，添加记录
            return db.collection('users').add({
              data: {
                ...userInfo,
                isAdmin: false,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            })
          }
        }).then(() => {
          this.setData({
            userInfo,
            hasUserInfo: true,
            isAdmin: false
          })
          wx.setStorageSync('isAdmin', false)
          wx.hideLoading()
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
        }).catch(err => {
          console.error('登录失败：', err)
          wx.hideLoading()
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
        })
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err)
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    })
  },

  // 添加退出登录方法
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('openid')
          wx.removeStorageSync('isAdmin')
          
          // 重置页面状态
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            isAdmin: false
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 跳转到我的讲座
  goToMyLectures() {
    wx.navigateTo({
      url: '/pages/myLectures/myLectures'
    })
  },

  // 跳转到收藏记录
  goToCollections() {
    wx.navigateTo({
      url: '/pages/collections/collections'
    })
  },

  // 获取用户参加的讲座
  getJoinedLectures() {
    if (this.data.loadingJoined) return;
    
    this.setData({ loadingJoined: true });
    
    // 获取用户ID
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      this.setData({ loadingJoined: false });
      return;
    }
    
    // 调用云函数获取用户参加的讲座
    wx.cloud.callFunction({
      name: 'getUserLectures',
      data: {
        type: 'joined'
      }
    }).then(res => {
      console.log('获取参加的讲座成功:', res.result);
      
      if (res.result && res.result.data) {
        this.setData({
          joinedLectures: res.result.data,
          loadingJoined: false
        });
      } else {
        this.setData({
          joinedLectures: [],
          loadingJoined: false
        });
      }
    }).catch(err => {
      console.error('获取参加的讲座失败:', err);
      this.setData({
        joinedLectures: [],
        loadingJoined: false
      });
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    });
  },

  // 跳转到参加的讲座
  goToJoinedLectures() {
    // 跳转到参加的讲座页面
    wx.navigateTo({
      url: '/pages/joinedLectures/joinedLectures'
    });
  }
}) 