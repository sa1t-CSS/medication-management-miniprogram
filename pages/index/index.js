const app = getApp();

Page({
  data: {
    reminders: [],
    morningCount: 0,
    noonCount: 0,
    eveningCount: 0,
    currentYear: 0,
    currentMonth: 0,
    currentMonthDays: [],
    prevMonthDays: [],
    calendarDayItems: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    morningColor: '#ff9f0a',
    noonColor: '#30b0c7',
    eveningColor: '#5856d6',
    selectedDate: null,
    emergencyContactName: '',
    emergencyContactPhone: ''
  },
  
  onLoad: function() {
    this.loadReminders();
    this.loadPlanCounts();
    this.initCalendar();
  },
  
  onShow: function() {
    this.syncTabBar();
    this.loadReminders();
    this.loadEmergencyContact();
    this.applyLastPlanDate();
    this.loadPlanCounts();
    this.refreshCalendar();
  },

  syncTabBar: function() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setData({
        selected: 0
      });
    }
  },
  
  initCalendar: function() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      selectedDate: now.getDate()
    }, () => {
      this.generateCalendar();
      this.loadPlanCounts();
    });
  },
  
  generateCalendar: function() {
    const { currentYear, currentMonth } = this.data;
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const totalDays = lastDay.getDate();
    const firstDayWeek = firstDay.getDay();
    const medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const today = new Date();
    
    const calendarDayItems = Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const plans = this.getMedicationPlansForDate(day, medicationPlans);
      const count = this.getPlansTotal(plans);
      const isSelected = this.data.selectedDate === day;
      const isToday = currentYear === today.getFullYear() &&
        currentMonth === today.getMonth() + 1 &&
        day === today.getDate();

      return {
        day,
        count,
        indicatorStyle: this.getDayIndicatorStyle(plans),
        dayNumberStyle: this.getDayNumberStyle(count, isSelected, isToday),
        isSelected,
        isToday
      };
    });
    const currentMonthDays = calendarDayItems.map(item => item.day);
    const prevMonthDays = Array.from({ length: firstDayWeek }, (_, i) => i);
    
    this.setData({
      currentMonthDays: currentMonthDays,
      prevMonthDays: prevMonthDays,
      calendarDayItems: calendarDayItems
    });
  },
  
  prevMonth: function() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear--;
      currentMonth = 12;
    } else {
      currentMonth--;
    }
    this.setData({
      currentYear: currentYear,
      currentMonth: currentMonth,
      selectedDate: null
    });
    this.generateCalendar();
  },
  
  nextMonth: function() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear++;
      currentMonth = 1;
    } else {
      currentMonth++;
    }
    this.setData({
      currentYear: currentYear,
      currentMonth: currentMonth,
      selectedDate: null
    });
    this.generateCalendar();
  },
  
  isToday: function(day) {
    const now = new Date();
    return this.data.currentYear === now.getFullYear() &&
           this.data.currentMonth === now.getMonth() + 1 &&
           day === now.getDate();
  },
  
  isSelectedDate: function(day) {
    return this.data.selectedDate === day;
  },
  
  getPlansTotal: function(plans) {
    return ['morning', 'noon', 'evening'].reduce((total, period) => {
      const periodPlans = plans && plans[period] ? plans[period] : [];
      return total + periodPlans.length;
    }, 0);
  },
  
  getDayMedicationCount: function(day) {
    return this.getPlansTotal(this.getMedicationPlansForDate(day));
  },

  getDayNumberStyle: function(count, isSelected, isToday) {
    const style = [];

    if (count <= 0) {
      if (isSelected || isToday) {
        style.push('background: #007aff');
        style.push('color: #ffffff');
        style.push('font-weight: 800');
        style.push('box-shadow: 0 10rpx 24rpx rgba(0, 122, 255, 0.28)');
      }
      return style.join(';');
    }

    style.push('background: #ff9f0a');
    style.push('color: #ffffff');
    style.push('font-weight: 800');
    style.push('text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.25)');

    if (isSelected) {
      style.push('border: 5rpx solid #007aff');
      style.push('box-shadow: 0 0 0 5rpx rgba(0, 122, 255, 0.18), 0 10rpx 24rpx rgba(255, 159, 10, 0.36)');
    } else {
      style.push('box-shadow: 0 10rpx 22rpx rgba(255, 159, 10, 0.34)');
    }

    return style.join(';');
  },
  
  getMedicationPlansForDate: function(day, medicationPlans) {
    const dateStr = `${this.data.currentYear}-${this.data.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const allPlans = medicationPlans || wx.getStorageSync('medicationPlans') || {};
    
    return allPlans[dateStr] || {
      morning: [],
      noon: [],
      evening: []
    };
  },

  getSelectedDateStr: function() {
    const day = this.data.selectedDate || 1;
    return `${this.data.currentYear}-${this.data.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  },
  
  getDayIndicatorStyle: function(plans) {
    const hasMorning = plans.morning && plans.morning.length > 0;
    const hasNoon = plans.noon && plans.noon.length > 0;
    const hasEvening = plans.evening && plans.evening.length > 0;
    
    let gradient = '';
    
    if (hasMorning && hasNoon && hasEvening) {
      gradient = `conic-gradient(
        ${this.data.morningColor} 0% 33.33%,
        ${this.data.noonColor} 33.33% 66.66%,
        ${this.data.eveningColor} 66.66% 100%
      )`;
    } else if (hasMorning && hasNoon) {
      gradient = `conic-gradient(
        ${this.data.morningColor} 0% 50%,
        ${this.data.noonColor} 50% 100%
      )`;
    } else if (hasMorning && hasEvening) {
      gradient = `conic-gradient(
        ${this.data.morningColor} 0% 50%,
        ${this.data.eveningColor} 50% 100%
      )`;
    } else if (hasNoon && hasEvening) {
      gradient = `conic-gradient(
        ${this.data.noonColor} 0% 50%,
        ${this.data.eveningColor} 50% 100%
      )`;
    } else if (hasMorning) {
      gradient = `linear-gradient(135deg, ${this.data.morningColor}, ${this.data.morningColor})`;
    } else if (hasNoon) {
      gradient = `linear-gradient(135deg, ${this.data.noonColor}, ${this.data.noonColor})`;
    } else if (hasEvening) {
      gradient = `linear-gradient(135deg, ${this.data.eveningColor}, ${this.data.eveningColor})`;
    } else {
      return 'display: none;';
    }
    
    return `background: ${gradient};`;
  },
  
  onDayClick: function(e) {
    const day = e.currentTarget.dataset.date;
    this.setData({
      selectedDate: day
    }, () => {
      this.generateCalendar();
      this.loadPlanCounts();
    });
    
    const dateStr = `${this.data.currentYear}-${this.data.currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const plans = this.getMedicationPlansForDate(day);
    const totalPlans = this.getPlansTotal(plans);
    
    if (totalPlans > 0) {
      wx.navigateTo({
        url: `/pages/date-detail/date-detail?date=${dateStr}`
      });
    } else {
      wx.showToast({
        title: `${this.data.currentMonth}月${day}日暂无用药计划`,
        icon: 'none'
      });
    }
  },
  
  refreshCalendar: function() {
    this.generateCalendar();
  },

  applyLastPlanDate: function() {
    const lastPlanDate = wx.getStorageSync('lastPlanDate');
    if (!lastPlanDate) {
      return;
    }

    const parts = lastPlanDate.split('-').map(item => parseInt(item, 10));
    if (parts.length !== 3 || parts.some(item => Number.isNaN(item))) {
      return;
    }

    this.setData({
      currentYear: parts[0],
      currentMonth: parts[1],
      selectedDate: parts[2]
    });
    wx.removeStorageSync('lastPlanDate');
  },
  
  loadReminders: function() {
    const reminders = app.getReminders();
    this.setData({
      reminders: reminders
    });
  },
  
  loadPlanCounts: function() {
    const selectedDate = this.getSelectedDateStr();
    const medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const selectedPlans = medicationPlans[selectedDate];
    
    this.setData({
      morningCount: selectedPlans && Array.isArray(selectedPlans.morning) ? selectedPlans.morning.length : 0,
      noonCount: selectedPlans && Array.isArray(selectedPlans.noon) ? selectedPlans.noon.length : 0,
      eveningCount: selectedPlans && Array.isArray(selectedPlans.evening) ? selectedPlans.evening.length : 0
    });
  },

  loadEmergencyContact: function() {
    const contact = wx.getStorageSync('emergencyContact') || {};
    this.setData({
      emergencyContactName: contact.name || '',
      emergencyContactPhone: contact.phone || ''
    });
  },

  callEmergencyContact: function() {
    if (!this.data.emergencyContactPhone) {
      wx.showToast({
        title: '请先在我的页面添加紧急联系人',
        icon: 'none'
      });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: this.data.emergencyContactPhone
    });
  },
  
  removeReminder: function(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个提醒吗？',
      success: (res) => {
        if (res.confirm) {
          app.removeReminder(id);
          this.loadReminders();
          
          wx.showToast({
            title: '提醒已删除',
            icon: 'success'
          });
        }
      }
    });
  },
  
  clearAllReminders: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有提醒吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearAllReminders();
          this.loadReminders();
          
          wx.showToast({
            title: '提醒已清空',
            icon: 'success'
          });
        }
      }
    });
  },
  
  navigateToTimePage: function(e) {
    const time = e.currentTarget.dataset.time;
    const urlMap = {
      morning: '/pages/morning/morning',
      noon: '/pages/noon/noon',
      evening: '/pages/evening/evening'
    };
    const date = this.getSelectedDateStr();
    
    wx.navigateTo({
      url: `${urlMap[time]}?date=${date}`
    });
  }
})
