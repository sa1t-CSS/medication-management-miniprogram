const { formatDate } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    medicationList: [],
    selectedDate: '',
    displayDate: ''
  },
  
  onLoad: function(options) {
    const today = formatDate(new Date());
    this.setData({
      selectedDate: options && options.date ? options.date : today
    });
    this.loadMedicationData();
  },
  
  onShow: function() {
    this.loadMedicationData();
  },
  
  loadMedicationData: function() {
    const medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const datePlans = medicationPlans[this.data.selectedDate] || {};
    const dateMedicationData = Array.isArray(datePlans.evening) ? datePlans.evening : [];
    const medicationData = dateMedicationData.length > 0 ? dateMedicationData : app.getMedicationData('evening');

    this.setData({
      medicationList: medicationData,
      displayDate: this.data.selectedDate
    });
  },
  
  navigateToMine: function() {
    wx.switchTab({
      url: '/pages/mine/mine'
    });
  }
})
