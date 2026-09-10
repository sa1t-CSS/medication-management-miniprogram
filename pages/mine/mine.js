const app = getApp();
const { formatDate, generateDateRange, addPhoneCalendarReminder } = require('../../utils/util.js');
const medicineAlgorithm = require('../../utils/medicineAlgorithm.js');

Page({
  data: {
    morningPlans: [],
    noonPlans: [],
    eveningPlans: [],
    showModal: false,
    showPlanCamera: false,
    cameraContext: null,
    emergencyContactName: '',
    emergencyContactPhone: '',
    bluetoothAvailable: false,
    bluetoothSearching: false,
    bluetoothConnected: false,
    bluetoothStatusText: '未连接蓝牙设备',
    bluetoothDevices: [],
    connectedBluetoothDevice: null,
    algorithmRecognizing: false,
    algorithmResultText: '',
    algorithmLastResult: null,
    currentPlan: {
      name: '',
      dose: '',
      time: '',
      date: '',
      duration: 1,
      imagePath: ''
    },
    editingTime: '',
    editingIndex: -1
  },
  
  onLoad: function(options) {
    this.initCamera();
    this.loadPlans();
    this.loadEmergencyContact();
    this.loadBluetoothDevice();
    const today = new Date();
    const dateStr = formatDate(today);
    this.setData({
      'currentPlan.date': dateStr
    });
    
    if (options && options.medicineName) {
      this.setData({
        showModal: true,
        editingTime: 'morning',
        editingIndex: -1,
        algorithmRecognizing: false,
        algorithmResultText: '',
        algorithmLastResult: null,
        'currentPlan.name': options.medicineName,
        'currentPlan.dose': '',
        'currentPlan.time': this.getDefaultTimeByPeriod('morning'),
        'currentPlan.date': dateStr,
        'currentPlan.duration': 1,
        'currentPlan.imagePath': ''
      });
    }
  },
  
  onShow: function() {
    this.syncTabBar();
    this.loadPlans();
    this.loadEmergencyContact();
    this.loadBluetoothDevice();
    this.loadPendingPlanDraft();
  },

  onHide: function() {
    this.stopBluetoothSearch();
  },

  onUnload: function() {
    this.stopBluetoothSearch();
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

  getDefaultTimeByPeriod: function(period) {
    const timeMap = {
      morning: '08:00',
      noon: '12:00',
      evening: '20:00'
    };

    return timeMap[period] || '08:00';
  },
  
  loadPlans: function() {
    const medicationData = app.getMedicationData();
    
    this.setData({
      morningPlans: medicationData.morning || [],
      noonPlans: medicationData.noon || [],
      eveningPlans: medicationData.evening || []
    });
  },

  loadEmergencyContact: function() {
    const contact = wx.getStorageSync('emergencyContact') || {};
    this.setData({
      emergencyContactName: contact.name || '',
      emergencyContactPhone: contact.phone || ''
    });
  },

  loadBluetoothDevice: function() {
    const savedDevice = wx.getStorageSync('bluetoothDevice');

    if (savedDevice && savedDevice.deviceId) {
      this.setData({
        connectedBluetoothDevice: savedDevice,
        bluetoothStatusText: `上次连接：${savedDevice.name || '未知设备'}`
      });
      return;
    }

    if (!this.data.bluetoothConnected) {
      this.setData({
        connectedBluetoothDevice: null,
        bluetoothStatusText: '未连接蓝牙设备'
      });
    }
  },

  getBluetoothDeviceName: function(device) {
    return device.name || device.localName || '未知设备';
  },

  ensureBluetoothAdapter: function(callback) {
    if (!wx.openBluetoothAdapter) {
      wx.showModal({
        title: '暂不支持',
        content: '当前微信或手机环境不支持蓝牙连接功能。',
        showCancel: false
      });
      return;
    }

    wx.openBluetoothAdapter({
      success: () => {
        this.watchBluetoothConnectionState();
        this.setData({
          bluetoothAvailable: true,
          bluetoothStatusText: this.data.bluetoothConnected ? this.data.bluetoothStatusText : '蓝牙已开启'
        });
        callback();
      },
      fail: () => {
        this.setData({
          bluetoothAvailable: false,
          bluetoothSearching: false,
          bluetoothStatusText: '蓝牙未开启'
        });
        wx.showModal({
          title: '无法使用蓝牙',
          content: '请先打开手机蓝牙，并允许微信使用蓝牙权限后再搜索设备。',
          showCancel: false
        });
      }
    });
  },

  watchBluetoothConnectionState: function() {
    if (this.bluetoothConnectionStateWatching || !wx.onBLEConnectionStateChange) {
      return;
    }

    this.bluetoothConnectionStateWatching = true;

    wx.onBLEConnectionStateChange((res) => {
      const currentDevice = this.data.connectedBluetoothDevice;

      if (!currentDevice || currentDevice.deviceId !== res.deviceId || res.connected) {
        return;
      }

      this.setData({
        bluetoothConnected: false,
        bluetoothStatusText: '蓝牙连接已断开'
      });
    });
  },

  startBluetoothSearch: function() {
    if (this.data.bluetoothSearching) {
      this.stopBluetoothSearch();
      return;
    }

    this.ensureBluetoothAdapter(() => {
      if (wx.offBluetoothDeviceFound && this.bluetoothFoundHandler) {
        wx.offBluetoothDeviceFound(this.bluetoothFoundHandler);
      }

      this.bluetoothFoundHandler = this.handleBluetoothDevicesFound.bind(this);
      wx.onBluetoothDeviceFound(this.bluetoothFoundHandler);

      this.setData({
        bluetoothSearching: true,
        bluetoothDevices: [],
        bluetoothStatusText: '正在搜索附近蓝牙设备'
      });

      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => {
          wx.showToast({
            title: '开始搜索',
            icon: 'none'
          });
        },
        fail: () => {
          this.setData({
            bluetoothSearching: false,
            bluetoothStatusText: '搜索失败'
          });
          wx.showToast({
            title: '蓝牙搜索失败',
            icon: 'none'
          });
        }
      });
    });
  },

  stopBluetoothSearch: function() {
    if (!this.data.bluetoothSearching) {
      return;
    }

    wx.stopBluetoothDevicesDiscovery({
      complete: () => {
        this.setData({
          bluetoothSearching: false,
          bluetoothStatusText: this.data.bluetoothConnected ? this.data.bluetoothStatusText : '已停止搜索'
        });
      }
    });
  },

  handleBluetoothDevicesFound: function(res) {
    const foundDevices = res.devices || [];
    const deviceMap = {};

    this.data.bluetoothDevices.forEach(device => {
      deviceMap[device.deviceId] = device;
    });

    foundDevices.forEach(device => {
      if (!device.deviceId) {
        return;
      }

      deviceMap[device.deviceId] = {
        deviceId: device.deviceId,
        name: this.getBluetoothDeviceName(device),
        RSSI: device.RSSI || 0
      };
    });

    const bluetoothDevices = Object.keys(deviceMap)
      .map(key => deviceMap[key])
      .sort((a, b) => {
        if (a.name === '未知设备' && b.name !== '未知设备') {
          return 1;
        }
        if (a.name !== '未知设备' && b.name === '未知设备') {
          return -1;
        }
        return b.RSSI - a.RSSI;
      });

    this.setData({
      bluetoothDevices
    });
  },

  connectBluetoothDevice: function(e) {
    const { id, name } = e.currentTarget.dataset;

    if (!id) {
      wx.showToast({
        title: '设备信息异常',
        icon: 'none'
      });
      return;
    }

    this.stopBluetoothSearch();
    this.setData({
      bluetoothStatusText: `正在连接：${name || '未知设备'}`
    });

    wx.createBLEConnection({
      deviceId: id,
      timeout: 10000,
      success: () => {
        const device = {
          deviceId: id,
          name: name || '未知设备'
        };

        wx.setStorageSync('bluetoothDevice', device);

        this.setData({
          bluetoothConnected: true,
          connectedBluetoothDevice: device,
          bluetoothStatusText: `已连接：${device.name}`
        });

        wx.showToast({
          title: '连接成功',
          icon: 'success'
        });

        this.loadBluetoothServices(id);
      },
      fail: () => {
        this.setData({
          bluetoothConnected: false,
          bluetoothStatusText: '连接失败，请靠近设备后重试'
        });
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        });
      }
    });
  },

  loadBluetoothServices: function(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        const services = res.services || [];
        this.setData({
          bluetoothStatusText: `已连接，可用服务 ${services.length} 个`
        });
      }
    });
  },

  disconnectBluetoothDevice: function() {
    const device = this.data.connectedBluetoothDevice || wx.getStorageSync('bluetoothDevice');

    if (!device || !device.deviceId) {
      wx.removeStorageSync('bluetoothDevice');
      this.setData({
        bluetoothConnected: false,
        connectedBluetoothDevice: null,
        bluetoothStatusText: '未连接蓝牙设备'
      });
      return;
    }

    wx.closeBLEConnection({
      deviceId: device.deviceId,
      complete: () => {
        wx.removeStorageSync('bluetoothDevice');
        this.setData({
          bluetoothConnected: false,
          connectedBluetoothDevice: null,
          bluetoothStatusText: '已断开蓝牙连接'
        });
      }
    });
  },

  loadPendingPlanDraft: function() {
    const draft = wx.getStorageSync('pendingPlanDraft');
    if (!draft) {
      return;
    }

    wx.removeStorageSync('pendingPlanDraft');

    const today = formatDate(new Date());
    this.setData({
      showModal: true,
      showPlanCamera: false,
      editingTime: 'morning',
      editingIndex: -1,
      algorithmRecognizing: false,
      algorithmResultText: '',
      algorithmLastResult: null,
      currentPlan: {
        name: draft.name || '',
        dose: draft.dose || '',
        time: this.getDefaultTimeByPeriod('morning'),
        date: today,
        duration: 1,
        imagePath: ''
      }
    });
  },

  onEmergencyNameInput: function(e) {
    this.setData({
      emergencyContactName: e.detail.value
    });
  },

  onEmergencyPhoneInput: function(e) {
    this.setData({
      emergencyContactPhone: e.detail.value
    });
  },

  saveEmergencyContact: function() {
    const name = this.data.emergencyContactName.trim();
    const phone = this.data.emergencyContactPhone.trim();

    if (!phone) {
      wx.showToast({
        title: '请输入紧急联系人电话',
        icon: 'none'
      });
      return;
    }

    wx.setStorageSync('emergencyContact', {
      name,
      phone
    });

    wx.showToast({
      title: '紧急联系人已保存',
      icon: 'success'
    });
  },
  
  addPlanItem: function(e) {
    const time = e.currentTarget.dataset.time;
    const today = new Date();
    const dateStr = formatDate(today);
    
    this.setData({
      showModal: true,
      showPlanCamera: false,
      editingTime: time,
      editingIndex: -1,
      algorithmRecognizing: false,
      algorithmResultText: '',
      algorithmLastResult: null,
      currentPlan: {
        name: '',
        dose: '',
        time: this.getDefaultTimeByPeriod(time),
        date: dateStr,
        duration: 1,
        imagePath: ''
      }
    });
  },
  
  editPlanItem: function(e) {
    const time = e.currentTarget.dataset.time;
    const index = e.currentTarget.dataset.index;
    const plans = this.getPlansByTime(time);
    
    this.setData({
      showModal: true,
      showPlanCamera: false,
      editingTime: time,
      editingIndex: index,
      algorithmRecognizing: false,
      algorithmResultText: '',
      algorithmLastResult: null,
      currentPlan: {
        imagePath: '',
        ...plans[index]
      }
    });
  },
  
  deletePlanItem: function(e) {
    const time = e.currentTarget.dataset.time;
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个用药计划吗？',
      success: (res) => {
        if (res.confirm) {
          const plans = [...this.getPlansByTime(time)];
          const deletedPlan = plans[index];
          
          plans.splice(index, 1);
          this.removeFromDatePlans(deletedPlan, time);
          app.updateMedicationData(time, plans);
          
          this.setData({
            [`${time}Plans`]: plans
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
    
    e.stopPropagation();
  },
  
  closeModal: function() {
    this.setData({
      showModal: false,
      showPlanCamera: false,
      algorithmRecognizing: false
    });
  },

  openPlanCamera: function() {
    if (!this.data.cameraContext) {
      this.initCamera();
    }

    this.setData({
      showPlanCamera: true
    });
  },

  closePlanCamera: function() {
    this.setData({
      showPlanCamera: false
    });
  },

  takePlanPhoto: function() {
    const cameraContext = this.data.cameraContext || wx.createCameraContext();

    cameraContext.takePhoto({
      quality: 'normal',
      success: (res) => {
        this.setData({
          'currentPlan.imagePath': res.tempImagePath,
          showPlanCamera: false
        });
        this.runMedicineRecognition(res.tempImagePath);
      },
      fail: () => {
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  runMedicineRecognition: function(imagePath) {
    if (!imagePath) {
      return;
    }

    this.setData({
      algorithmRecognizing: true,
      algorithmResultText: '正在识别药品信息...',
      algorithmLastResult: null
    });

    medicineAlgorithm.recognizeMedicineByImage(imagePath, {
      source: 'mine.planPhoto',
      currentPlan: this.data.currentPlan
    }).then(result => {
      const updates = {
        algorithmRecognizing: false,
        algorithmResultText: this.getAlgorithmResultText(result),
        algorithmLastResult: result
      };

      if (result.success && result.medicineName && !this.data.currentPlan.name.trim()) {
        updates['currentPlan.name'] = result.medicineName;
      }

      if (result.success && result.dose && !this.data.currentPlan.dose.trim()) {
        updates['currentPlan.dose'] = result.dose;
      }

      this.setData(updates);
    }).catch(() => {
      this.setData({
        algorithmRecognizing: false,
        algorithmResultText: '识别失败，请手动填写药品信息',
        algorithmLastResult: null
      });
    });
  },

  getAlgorithmResultText: function(result) {
    if (!result || !result.success) {
      return result && result.message ? result.message : '暂未识别到药品信息，可手动填写';
    }

    const confidence = result.confidence ? `，置信度 ${Math.round(result.confidence * 100)}%` : '';
    return `识别完成：${result.medicineName || '未知药品'}${result.dose ? '，' + result.dose : ''}${confidence}`;
  },

  cameraError: function() {
    wx.showToast({
      title: '相机启动失败',
      icon: 'none'
    });
  },
  
  onNameInput: function(e) {
    this.setData({
      'currentPlan.name': e.detail.value
    });
  },
  
  onDoseInput: function(e) {
    this.setData({
      'currentPlan.dose': e.detail.value
    });
  },
  
  onDateChange: function(e) {
    this.setData({
      'currentPlan.date': e.detail.value
    });
  },
  
  onTimeChange: function(e) {
    this.setData({
      'currentPlan.time': e.detail.value
    });
  },
  
  selectDuration: function(e) {
    const days = parseInt(e.currentTarget.dataset.days);
    this.setData({
      'currentPlan.duration': days
    });
  },
  
  savePlan: function() {
    const { editingTime, editingIndex, currentPlan } = this.data;
    
    if (!currentPlan.name.trim()) {
      wx.showToast({
        title: '请输入药品名称',
        icon: 'none'
      });
      return;
    }
    
    if (!currentPlan.dose.trim()) {
      wx.showToast({
        title: '请输入剂量',
        icon: 'none'
      });
      return;
    }
    
    if (!currentPlan.date) {
      wx.showToast({
        title: '请选择开始日期',
        icon: 'none'
      });
      return;
    }
    
    const plans = [...this.getPlansByTime(editingTime)];
    const planTime = currentPlan.time || this.getDefaultTimeByPeriod(editingTime);
    
    const planData = {
      name: currentPlan.name.trim(),
      dose: currentPlan.dose.trim(),
      time: planTime,
      date: currentPlan.date,
      duration: currentPlan.duration,
      imagePath: currentPlan.imagePath || '',
      algorithmResult: this.data.algorithmLastResult || null
    };
    
    if (editingIndex === -1) {
      plans.push(planData);
    } else {
      const oldPlan = plans[editingIndex];
      plans[editingIndex] = planData;
      this.removeFromDatePlans(oldPlan, editingTime);
    }
    
    this.updateDatePlans(planData, editingTime);
    wx.setStorageSync('lastPlanDate', planData.date);
    app.updateMedicationData(editingTime, plans);
    
    this.setData({
      [`${editingTime}Plans`]: plans
    });
    
    this.closeModal();
    this.askForReminder(planData, editingTime);
  },
  
  updateDatePlans: function(plan, timePeriod) {
    let medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const dates = generateDateRange(plan.date, plan.duration);
    
    dates.forEach(date => {
      if (!medicationPlans[date]) {
        medicationPlans[date] = {
          morning: [],
          noon: [],
          evening: []
        };
      }

      if (!Array.isArray(medicationPlans[date].morning)) {
        medicationPlans[date].morning = [];
      }

      if (!Array.isArray(medicationPlans[date].noon)) {
        medicationPlans[date].noon = [];
      }

      if (!Array.isArray(medicationPlans[date].evening)) {
        medicationPlans[date].evening = [];
      }
      
      const existingIndex = medicationPlans[date][timePeriod].findIndex(
        item => item.name === plan.name && item.time === plan.time
      );
      
      const planItem = {
        name: plan.name,
        dose: plan.dose,
        time: plan.time,
        imagePath: plan.imagePath || '',
        algorithmResult: plan.algorithmResult || null
      };
      
      if (existingIndex !== -1) {
        medicationPlans[date][timePeriod][existingIndex] = planItem;
      } else {
        medicationPlans[date][timePeriod].push(planItem);
      }
    });
    
    wx.setStorageSync('medicationPlans', medicationPlans);
  },
  
  removeFromDatePlans: function(plan, timePeriod) {
    let medicationPlans = wx.getStorageSync('medicationPlans') || {};
    const dates = generateDateRange(plan.date, plan.duration);
    
    dates.forEach(date => {
      if (medicationPlans[date] && Array.isArray(medicationPlans[date][timePeriod])) {
        medicationPlans[date][timePeriod] = medicationPlans[date][timePeriod].filter(
          item => !(item.name === plan.name && item.time === plan.time)
        );
        
        const morning = medicationPlans[date].morning || [];
        const noon = medicationPlans[date].noon || [];
        const evening = medicationPlans[date].evening || [];

        if (morning.length === 0 && noon.length === 0 && evening.length === 0) {
          delete medicationPlans[date];
        }
      }
    });
    
    wx.setStorageSync('medicationPlans', medicationPlans);
  },
  
  askForReminder: function(plan, timePeriod) {
    const periodMap = {
      'morning': '早晨',
      'noon': '中午',
      'evening': '晚上'
    };
    
    wx.showModal({
      title: '设置提醒',
      content: `是否将${periodMap[timePeriod]}的用药计划添加到今日提醒？`,
      confirmText: '添加提醒',
      cancelText: '暂不添加',
      success: (res) => {
        if (res.confirm) {
          app.addReminder(plan, timePeriod);
          wx.showToast({
            title: '已添加到提醒',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '计划已保存',
            icon: 'success'
          });
        }
        this.promptPhoneCalendar(plan, timePeriod);
      }
    });
  },

  promptPhoneCalendar: function(plan, timePeriod) {
    const periodMap = {
      morning: '早晨用药',
      noon: '中午用药',
      evening: '晚上用药'
    };

    wx.showModal({
      title: '手机日历提醒',
      content: '是否把第一次用药时间同步到手机日历提醒？小程序无法直接创建系统闹钟。',
      confirmText: '同步',
      cancelText: '跳过',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        addPhoneCalendarReminder(plan, periodMap[timePeriod], {
          success: () => {
            wx.showToast({
              title: '已同步到日历',
              icon: 'success'
            });
          },
          fail: () => {
            wx.showModal({
              title: '无法同步',
              content: '当前微信或手机环境不支持写入手机日历，请手动设置闹钟。',
              showCancel: false
            });
          }
        });
      }
    });
  },
  
  getPlansByTime: function(time) {
    switch(time) {
      case 'morning':
        return this.data.morningPlans;
      case 'noon':
        return this.data.noonPlans;
      case 'evening':
        return this.data.eveningPlans;
      default:
        return [];
    }
  }
})
