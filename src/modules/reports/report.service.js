const reportModel = require("./report.model");
const validate = require("./report.validation");

const createReport = async (userId, body) => {
  const { error } = validate.createReportSchema.validate(body);

  if (error) {
    return {
      result: false,
      status: 400,
      message: error.details[0].message,
    };
  }

  const report = await reportModel.create({
    reporter_id: userId,
    ...body,
  });

  const row = await reportModel.getById(report.insertId);

  return {
    result: true,
    status: 201,
    message: "Report submitted successfully",
    data: row,
  };
};

const getMyReports = async (userId) => {
  const rows = await reportModel.getMyReports(userId);

  return {
    result: true,
    status: 200,
    data: rows,
  };
};

const getMyReportDetail = async (reportId, userId) => {
  const row = await reportModel.getById(reportId);

  if (!row) {
    return {
      result: false,
      status: 404,
      message: "Report not found",
    };
  }

  if (row.reporter_id !== userId) {
    return {
      result: false,
      status: 403,
      message: "Access denied",
    };
  }

  return {
    result: true,
    status: 200,
    data: row,
  };
};

const getAllReports = async () => {
  const rows = await reportModel.getAll();

  return {
    result: true,
    status: 200,
    data: rows,
  };
};

const updateStatus = async (reportId, status) => {
  const { error } = validate.updateStatusSchema.validate({ status });
  if (error) {
    return {
      result: false,
      status: 400,
      message: error.details[0].message,
    };
  }

  const report = await reportModel.getById(reportId);

  if (!report) {
    return {
      result: false,
      status: 404,
      message: "Report not found",
    };
  }

  await reportModel.updateStatus(reportId, status);

  return {
    result: true,
    status: 200,
    message: "Status updated",
  };
};

const resolveReport = async (reportId, adminId, note) => {
  const { error } = validate.resolveReportSchema.validate({ resolution_note: note });
  if (error) {
    return {
      result: false,
      status: 400,
      message: error.details[0].message,
    };
  }

  const report = await reportModel.getById(reportId);

  if (!report) {
    return {
      result: false,
      status: 404,
      message: "Report not found",
    };
  }

  await reportModel.resolve(reportId, adminId, note);

  return {
    result: true,
    status: 200,
    message: "Report resolved",
  };
};

const getReportByIdAdmin = async (reportId) => {
  const row = await reportModel.getReportByIdAdmin(reportId);

  if (!row) {
    return {
      result: false,
      status: 404,
      message: "Report not found",
    };
  }

  return {
    result: true,
    status: 200,
    message: "Report fetched successfully",
    data: row,
  };
};

module.exports = {
  createReport,
  getMyReports,
  getMyReportDetail,
  getAllReports,
  updateStatus,
  resolveReport,
  getReportByIdAdmin,
};
