// src/services/reservationScheduler.js
const dayjs = require("dayjs");

// Run every hour (3600000 ms)
const AUTO_COMPLETE_INTERVAL = 3600000;

let intervalId = null;

const autoCompleteReservations = async () => {
  try {
    const reservationModel = require("../modules/reservations/reservation.model");
    const affectedRows = await reservationModel.autoCompleteExpiredReservations();
    if (affectedRows > 0) {
      console.log(
        `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] Auto-completed ${affectedRows} reservation(s)`
      );
    }
  } catch (error) {
    console.error("Auto-complete reservations error:", error.message);
  }
};

const autoExpirePendingReservations = async () => {
  try {
    const reservationModel = require("../modules/reservations/reservation.model");
    const affectedRows = await reservationModel.autoExpirePendingReservations();
    if (affectedRows > 0) {
      console.log(
        `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] Auto-expired ${affectedRows} pending reservation(s)`
      );
    }
  } catch (error) {
    console.error("Auto-expire pending reservations error:", error.message);
  }
};

const runScheduledTasks = async () => {
  await autoCompleteReservations();
  await autoExpirePendingReservations();
};

const startAutoCompleteScheduler = () => {
  // Run immediately on startup
  runScheduledTasks();

  // Then run every hour
  intervalId = setInterval(runScheduledTasks, AUTO_COMPLETE_INTERVAL);
  console.log("Reservation scheduler started (auto-complete + auto-expire, every hour)");
};

const stopAutoCompleteScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Reservation scheduler stopped");
  }
};

module.exports = {
  startAutoCompleteScheduler,
  stopAutoCompleteScheduler,
};