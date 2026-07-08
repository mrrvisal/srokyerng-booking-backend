const asyncHandler = require("../../utils/asyncHandler");

const reportService = require("./report.service");

const createReport = asyncHandler(async (req, res) => {
  const result = await reportService.createReport(req.user.id, req.body);

  return res.status(result.status).json(result);
});

const getMyReports = asyncHandler(async (req, res) => {
  const result = await reportService.getMyReports(req.user.id);

  return res.status(result.status).json(result);
});

const getMyReportDetail = asyncHandler(async (req, res) => {
  const result = await reportService.getMyReportDetail(req.params.id, req.user.id);

  return res.status(result.status).json(result);
});

module.exports = {
  createReport,
  getMyReports,
  getMyReportDetail,
};
