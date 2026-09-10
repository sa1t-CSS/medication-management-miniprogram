// 通用工具函数

// 格式化时间
const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = formatNumber(date.getMonth() + 1);
  const day = formatNumber(date.getDate());

  return `${year}-${month}-${day}`;
};

const generateDateRange = (startDate, duration) => {
  if (!startDate) {
    return [];
  }

  const days = Number(duration) || 0;
  const totalDays = days <= 0 ? 1 : days;
  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return [startDate];
  }

  return Array.from({ length: totalDays }, (_, index) => {
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + index);
    return formatDate(nextDate);
  });
};

const getCalendarTimestamp = (date, time) => {
  const safeTime = time || '08:00';
  const dateTime = new Date(`${date.replace(/-/g, '/')} ${safeTime}:00`);

  if (Number.isNaN(dateTime.getTime())) {
    return 0;
  }

  return Math.floor(dateTime.getTime() / 1000);
};

const addPhoneCalendarReminder = (plan, periodText, callbacks = {}) => {
  if (!wx.addPhoneCalendar) {
    if (callbacks.fail) {
      callbacks.fail({
        errMsg: 'wx.addPhoneCalendar is not supported'
      });
    }
    return false;
  }

  const startTime = getCalendarTimestamp(plan.date, plan.time);

  if (!startTime) {
    if (callbacks.fail) {
      callbacks.fail({
        errMsg: 'invalid plan time'
      });
    }
    return false;
  }

  wx.addPhoneCalendar({
    title: `用药提醒：${plan.name}`,
    startTime,
    endTime: startTime + 30 * 60,
    description: `${periodText || '用药'} ${plan.name} ${plan.dose || ''}`.trim(),
    alarmOffset: 0,
    success: callbacks.success,
    fail: callbacks.fail
  });

  return true;
};

// 显示提示信息
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon
  });
};

module.exports = {
  formatTime,
  formatDate,
  generateDateRange,
  addPhoneCalendarReminder,
  showToast
};
