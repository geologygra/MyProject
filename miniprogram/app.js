App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-3gr1mse212702fc0',
        traceUser: true
      })
    }

    this.globalData = {
      userInfo: null
    }
  },

  onShow: function () {
    // 小程序启动或从后台进入前台显示时触发
  },

  onHide: function () {
    // 小程序从前台进入后台时触发
  },

  globalData: {
    userInfo: null,
    // 其他全局数据
  }
}) 