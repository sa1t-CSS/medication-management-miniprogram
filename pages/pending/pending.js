const frequencyTextMap = {
  once: '每日一次',
  twice: '每日两次',
  three: '每日三次',
  needed: '按需服用'
};

const timeTextMap = {
  morning: '早晨',
  noon: '中午',
  evening: '晚上',
  beforeMeal: '饭前',
  afterMeal: '饭后',
  beforeSleep: '睡前'
};

Page({
  data: {
    medicineName: '',
    frequencyKey: 'once',
    selectedTimes: ['早晨'],
    selectedTimeMap: {
      morning: true,
      noon: false,
      evening: false,
      beforeMeal: false,
      afterMeal: false,
      beforeSleep: false
    },
    notes: '',
    medicalRecords: []
  },

  onLoad: function() {
    this.loadMedicalRecords();
  },

  onShow: function() {
    this.syncTabBar();
    this.loadMedicalRecords();
  },

  syncTabBar: function() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setData({
        selected: 1
      });
    }
  },

  onMedicineNameInput: function(e) {
    this.setData({
      medicineName: e.detail.value
    });
  },

  selectFrequency: function(e) {
    this.setData({
      frequencyKey: e.currentTarget.dataset.key
    });
  },

  toggleTime: function(e) {
    const key = e.currentTarget.dataset.key;
    const time = timeTextMap[key];
    const selectedTimes = [...this.data.selectedTimes];
    const index = selectedTimes.indexOf(time);
    const nextSelected = index === -1;

    if (nextSelected) {
      selectedTimes.push(time);
    } else {
      selectedTimes.splice(index, 1);
    }

    this.setData({
      selectedTimes,
      [`selectedTimeMap.${key}`]: nextSelected
    });
  },

  onNotesInput: function(e) {
    this.setData({
      notes: e.detail.value
    });
  },

  clearForm: function() {
    this.setData({
      medicineName: '',
      frequencyKey: 'once',
      selectedTimes: ['早晨'],
      selectedTimeMap: {
        morning: true,
        noon: false,
        evening: false,
        beforeMeal: false,
        afterMeal: false,
        beforeSleep: false
      },
      notes: ''
    });
  },

  saveMedicalRecord: function() {
    const { medicineName, frequencyKey, selectedTimes, notes } = this.data;

    if (!medicineName.trim()) {
      wx.showToast({
        title: '请输入药物名称',
        icon: 'none'
      });
      return;
    }

    if (selectedTimes.length === 0) {
      wx.showToast({
        title: '请选择服用时间',
        icon: 'none'
      });
      return;
    }

    const record = {
      id: Date.now() + Math.random(),
      medicineName: medicineName.trim(),
      frequency: frequencyTextMap[frequencyKey],
      times: selectedTimes,
      notes: notes.trim(),
      createTime: this.formatTime(new Date())
    };

    this.saveRecordToLocal(record);
    this.clearForm();

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  saveRecordToLocal: function(record) {
    const medicalRecords = wx.getStorageSync('medicalRecords') || [];
    medicalRecords.unshift(record);

    wx.setStorageSync('medicalRecords', medicalRecords);
    this.loadMedicalRecords();
  },

  loadMedicalRecords: function() {
    this.setData({
      medicalRecords: wx.getStorageSync('medicalRecords') || []
    });
  },

  useMedicalRecord: function(e) {
    const record = e.currentTarget.dataset.record;
    wx.setStorageSync('pendingPlanDraft', {
      name: record.medicineName,
      dose: record.notes || '',
      source: 'medicalRecord'
    });

    wx.switchTab({
      url: '/pages/mine/mine'
    });
  },

  deleteRecord: function(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条医嘱记录吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const medicalRecords = (wx.getStorageSync('medicalRecords') || []).filter(item => item.id !== id);

          wx.setStorageSync('medicalRecords', medicalRecords);
          this.loadMedicalRecords();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  clearAllRecords: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空全部医嘱记录吗？',
      confirmText: '清空',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('medicalRecords', []);
          this.loadMedicalRecords();

          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  formatTime: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});
