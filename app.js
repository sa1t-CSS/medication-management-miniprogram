App({
  onLaunch: function () {
    this.initData();
  },
  
  globalData: {
    medicationData: {
      morning: [],
      noon: [],
      evening: []
    },
    reminders: [],
    userInfo: null
  },
  
  initData: function() {
    try {
      const storedData = wx.getStorageSync('medicationData');
      if (storedData) {
        this.globalData.medicationData = storedData;
      }
      
      const storedReminders = wx.getStorageSync('reminders');
      if (storedReminders) {
        this.globalData.reminders = storedReminders;
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  },
  
  saveData: function() {
    try {
      wx.setStorageSync('medicationData', this.globalData.medicationData);
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  },
  
  saveReminders: function() {
    try {
      wx.setStorageSync('reminders', this.globalData.reminders);
      return true;
    } catch (e) {
      console.error('保存提醒数据失败:', e);
      return false;
    }
  },
  
  updateMedicationData: function(time, data) {
    if (this.globalData.medicationData[time] !== undefined) {
      this.globalData.medicationData[time] = data;
      const success = this.saveData();
      
      if (success) {
        this.notifyPagesUpdate();
      }
      
      return success;
    }
    return false;
  },
  
  addReminder: function(plan, timePeriod) {
    const periodMap = {
      'morning': '早晨',
      'noon': '中午', 
      'evening': '晚上'
    };
    
    const reminder = {
      id: Date.now() + Math.random(),
      time: plan.time,
      period: periodMap[timePeriod],
      medicine: plan.name,
      dose: plan.dose,
      timePeriod: timePeriod
    };
    
    this.globalData.reminders.push(reminder);
    this.saveReminders();
    this.notifyPagesUpdate();
    
    return reminder;
  },
  
  removeReminder: function(id) {
    this.globalData.reminders = this.globalData.reminders.filter(item => item.id !== id);
    this.saveReminders();
    this.notifyPagesUpdate();
  },
  
  clearAllReminders: function() {
    this.globalData.reminders = [];
    this.saveReminders();
    this.notifyPagesUpdate();
  },
  
  notifyPagesUpdate: function() {
    const pages = getCurrentPages();
    
    pages.forEach(page => {
      if (page && typeof page.loadMedicationData === 'function') {
        page.loadMedicationData();
      }
      
      if (page && typeof page.loadPlans === 'function') {
        page.loadPlans();
      }
      
      if (page && typeof page.loadReminders === 'function') {
        page.loadReminders();
      }
      
      if (page && typeof page.loadPlanCounts === 'function') {
        page.loadPlanCounts();
      }
      
      if (page && typeof page.refreshCalendar === 'function') {
        page.refreshCalendar();
      }
      
      if (page && typeof page.loadSavedMedicines === 'function') {
        page.loadSavedMedicines();
      }
    });
  },
  
  getMedicationData: function(time) {
    if (time) {
      return this.globalData.medicationData[time] || [];
    }
    return this.globalData.medicationData;
  },
  
  getReminders: function() {
    return this.globalData.reminders || [];
  }
})