// 数据存储管理工具

// 获取存储的数据
const getStorageData = (key) => {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.error('获取存储数据失败:', e);
    return null;
  }
};

// 设置存储数据
const setStorageData = (key, data) => {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (e) {
    console.error('设置存储数据失败:', e);
    return false;
  }
};

// 清除存储数据
const clearStorageData = (key) => {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error('清除存储数据失败:', e);
    return false;
  }
};

module.exports = {
  getStorageData,
  setStorageData,
  clearStorageData
};