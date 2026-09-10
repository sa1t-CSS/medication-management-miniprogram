const app = getApp();
const { formatDate, generateDateRange, addPhoneCalendarReminder } = require('../../utils/util.js');

Page({
  data: {
    showForm: false,
    showScheduleForm: false,
    tempImagePath: '',
    medicineName: '',
    medicineDose: '',
    selectedDate: '',
    selectedTime: '',
    selectedPeriod: 'morning',
    selectedDuration: 7,
    currentMedicine: null,
    savedMedicines: [],
    cameraContext: null
  },
  
  onLoad: function() {
    this.loadSavedMedicines();
    this.initCamera();
    const today = new Date();
    this.setData({
      selectedDate: formatDate(today)
    });
  },
  
  onShow: function() {
    this.syncTabBar();
    this.loadSavedMedicines();
  },

  syncTabBar: function() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setData({
        selected: 2
      });
    }
  },
  
  initCamera: function() {
    this.setData({
      cameraContext: wx.createCameraContext()
    });
  },
  
  takePhoto: function() {
    const that = this;
    this.data.cameraContext.takePhoto({
      quality: 'normal',
      success: (res) => {
        that.setData({
          tempImagePath: res.tempImagePath,
          showForm: true,
          medicineName: '',
          medicineDose: ''
        });
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },
  
  cameraError: function(e) {
    console.error('相机错误:', e.detail);
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
  },
  
  onNameInput: function(e) {
    this.setData({
      medicineName: e.detail.value
    });
  },
  
  onDoseInput: function(e) {
    this.setData({
      medicineDose: e.detail.value
    });
  },
  
  onDateChange: function(e) {
    this.setData({
      selectedDate: e.detail.value
    });
  },
  
  onTimeChange: function(e) {
    this.setData({
      selectedTime: e.detail.value
    });
  },
  
  selectPeriod: function(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({
      selectedPeriod: period
    });
  },
  
  selectDuration: function(e) {
    const days = parseInt(e.currentTarget.dataset.days);
    this.setData({
      selectedDuration: days
    });
  },
  
  cancelForm: function() {
    this.setData({
      showForm: false,
      tempImagePath: '',
      medicineName: '',
      medicineDose: ''
    });
  },
  
  cancelSchedule: function() {
    this.setData({
      showScheduleForm: false
    });
  },
  
  saveMedicineInfo: function() {
    const { medicineName, medicineDose, tempImagePath } = this.data;
    
    if (!medicineName.trim()) {
      wx.showToast({
        title: '请输入药品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!medicineDose.trim()) {
      wx.showToast({
        title: '请输入用药剂量',
        icon: 'none'
      });
      return;
    }
    
    const medicine = {
      id: Date.now() + Math.random(),
      name: medicineName.trim(),
      dose: medicineDose.trim(),
      imagePath: tempImagePath,
      createTime: new Date().toISOString()
    };
    
    this.saveMedicineToLocal(medicine);
    
    this.setData({
      currentMedicine: medicine,
      showForm: false,
      showScheduleForm: true,
      selectedDate: this.data.selectedDate,
      selectedTime: '',
      selectedPeriod: 'morning',
      selectedDuration: 7
    });
  },
  
  saveMedicineToLocal: function(medicine) {
    let savedMedicines = wx.getStorageSync('savedMedicines') || [];
    
    const existingIndex = savedMedicines.findIndex(item => item.name === medicine.name);
    if (existingIndex !== -1) {
      savedMedicines[existingIndex] = medicine;
    } else {
      savedMedicines.push(medicine);
    }
    
    wx.setStorageSync('savedMedicines', savedMedicines);
    this.loadSavedMedicines();
  },
  
  loadSavedMedicines: function() {
    const savedMedicines = wx.getStorageSync('savedMedicines') || [];
    this.setData({
      savedMedicines: savedMedicines
    });
  },
  
  useSavedMedicine: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    this.setData({
      currentMedicine: medicine,
      showScheduleForm: true,
      selectedDate: this.data.selectedDate,
      selectedTime: '',
      selectedPeriod: 'morning',
      selectedDuration: 7
    });
  },
  
  saveMedicationPlan: function() {
    const { selectedDate, selectedTime, selectedPeriod, selectedDuration, currentMedicine } = this.data;
    
    if (!selectedDate) {
      wx.showToast({
        title: '请选择开始日期',
        icon: 'none'
      });
      return;
    }
    
    if (!selectedTime) {
      wx.showToast({
        title: '请选择用药时间',
        icon: 'none'
      });
      return;
    }
    
    const planData = {
      name: currentMedicine.name,
      dose: currentMedicine.dose,
      time: selectedTime,
      date: selectedDate,
      period: selectedPeriod,
      duration: selectedDuration
    };
    
    this.saveToMedicationPlanWithDuration(planData);
    
    this.setData({
      showScheduleForm: false,
      selectedTime: '',
      selectedPeriod: 'morning',
      selectedDuration: 7
    });
    
    wx.showToast({
      title: '用药计划设置成功',
      icon: 'success'
    });
    
    this.promptPhoneCalendar(planData, selectedPeriod, () => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    });
  },

  promptPhoneCalendar: function(planData, period, done) {
    const periodMap = {
      morning: '早晨用药',
      noon: '中午用药',
      evening: '晚上用药'
    };
    const onDone = done || function() {};

    wx.showModal({
      title: '手机日历提醒',
      content: '是否把第一次用药时间同步到手机日历提醒？小程序无法直接创建系统闹钟。',
      confirmText: '同步',
      cancelText: '跳过',
      success: (res) => {
        if (!res.confirm) {
          onDone();
          return;
        }

        addPhoneCalendarReminder(planData, periodMap[period], {
          success: () => {
            wx.showToast({
              title: '已同步到日历',
              icon: 'success'
            });
            onDone();
          },
          fail: () => {
            wx.showModal({
              title: '无法同步',
              content: '当前微信或手机环境不支持写入手机日历，请手动设置闹钟。',
              showCancel: false,
              success: onDone
            });
          }
        });
      }
    });
  },
  
  saveToMedicationPlanWithDuration: function(planData) {
    let medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const dates = generateDateRange(planData.date, planData.duration);
    
    dates.forEach(date => {
      if (!medicationPlans[date]) {
        medicationPlans[date] = {
          morning: [],
          noon: [],
          evening: []
        };
      }
      
      const planItem = {
        name: planData.name,
        dose: planData.dose,
        time: planData.time
      };
      
      const existingIndex = medicationPlans[date][planData.period].findIndex(
        item => item.name === planData.name && item.time === planData.time
      );
      
      if (existingIndex !== -1) {
        medicationPlans[date][planData.period][existingIndex] = planItem;
      } else {
        medicationPlans[date][planData.period].push(planItem);
      }
    });
    
    wx.setStorageSync('medicationPlans', medicationPlans);
    
    const globalMedicationData = app.getMedicationData();
    
    if (!globalMedicationData[planData.period]) {
      globalMedicationData[planData.period] = [];
    }
    
    const firstDayPlan = {
      name: planData.name,
      dose: planData.dose,
      time: planData.time
    };
    
    const existingGlobalIndex = globalMedicationData[planData.period].findIndex(
      item => item.name === planData.name && item.time === planData.time
    );
    
    if (existingGlobalIndex === -1) {
      globalMedicationData[planData.period].push(firstDayPlan);
      app.updateMedicationData(planData.period, globalMedicationData[planData.period]);
    }
  }
})
