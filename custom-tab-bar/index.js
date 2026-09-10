Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: 'H'
      },
      {
        pagePath: '/pages/pending/pending',
        text: '医嘱',
        icon: 'R'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        icon: 'M'
      }
    ]
  },

  methods: {
    switchTab: function(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];

      if (!item) {
        return;
      }

      this.setData({
        selected: index
      });

      wx.switchTab({
        url: item.pagePath
      });
    }
  }
});
