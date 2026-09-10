Page({
  data: {
    selectedDate: '',
    displayDate: '',
    morningPlans: [],
    noonPlans: [],
    eveningPlans: [],
    totalPlans: 0
  },
  
  onLoad: function(options) {
    if (!options || !options.date) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }
    
    const date = options.date;
    this.setData({
      selectedDate: date
    });
    this.formatDisplayDate(date);
    this.loadDatePlans(date);
  },
  
  formatDisplayDate: function(dateStr) {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = weekdays[date.getDay()];
      
      this.setData({
        displayDate: `${month}月${day}日 星期${weekday}`
      });
    } catch (error) {
      console.error('日期格式化错误:', error);
      this.setData({
        displayDate: '日期格式错误'
      });
    }
  },
  
  loadDatePlans: function(dateStr) {
    const medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const datePlans = medicationPlans[dateStr] || {
      morning: [],
      noon: [],
      evening: []
    };
    
    const totalPlans = datePlans.morning.length + datePlans.noon.length + datePlans.evening.length;
    
    this.setData({
      morningPlans: datePlans.morning,
      noonPlans: datePlans.noon,
      eveningPlans: datePlans.evening,
      totalPlans: totalPlans
    });
  }
})