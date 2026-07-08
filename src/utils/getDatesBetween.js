const dayjs = require("dayjs");

const getDatesBetween = (startDate, endDate) => {
  const dates = [];

  let current = dayjs(startDate);

  while (current.isBefore(dayjs(endDate))) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  return dates;
};

module.exports = {
  getDatesBetween,
};
