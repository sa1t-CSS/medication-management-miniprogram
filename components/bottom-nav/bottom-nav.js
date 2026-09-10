Component({
  properties: {
    currentPage: {
      type: String,
      value: 'index'
    }
  },
  
  data: {},
  
  methods: {
    switchTab: function(e) {
      const page = e.currentTarget.dataset.page;
      const urlMap = {
        'index': '/pages/index/index',
        'pending': '/pages/pending/pending',
        'smart': '/pages/smart/smart',
        'mine': '/pages/mine/mine'
      };
      
      // 使用 switchTab 进行页面跳转
      wx.switchTab({
        url: urlMap[page],
        fail: (err) => {
          console.error('跳转失败:', err);
          // 如果 switchTab 失败，尝试使用 redirectTo
          wx.redirectTo({
            url: urlMap[page]
          });
        }
      });
    }
  }
})