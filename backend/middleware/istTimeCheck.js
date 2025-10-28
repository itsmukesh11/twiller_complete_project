const moment = require('moment-timezone');

function inISTWindow(startHour, endHour) {
  const now = moment().tz('Asia/Kolkata');
  const start = now.clone().hour(startHour).minute(0).second(0);
  const end = now.clone().hour(endHour).minute(0).second(0);
  return now.isBetween(start, end, null, '[]');
}

module.exports = { inISTWindow };
