/**
 * Validate date range query parameters
 * Both start_date and end_date must be provided together or both omitted
 * Date format: YYYY-MM-DD
 */
const validateDateRange = ({ start_date, end_date }) => {
  const errors = [];

  // Check if only one date is provided
  if ((start_date && !end_date) || (!start_date && end_date)) {
    errors.push("Both start_date and end_date must be provided together");
    return errors;
  }

  // If both are provided, validate format
  if (start_date && end_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(start_date)) {
      errors.push("start_date must be in YYYY-MM-DD format");
    }

    if (!dateRegex.test(end_date)) {
      errors.push("end_date must be in YYYY-MM-DD format");
    }

    // Validate date values
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      errors.push("start_date is not a valid date");
    }

    if (isNaN(endDateObj.getTime())) {
      errors.push("end_date is not a valid date");
    }

    // Check if start_date is before end_date
    if (errors.length === 0 && startDateObj > endDateObj) {
      errors.push("start_date must be before end_date");
    }
  }

  return errors;
};

module.exports = {
  validateDateRange,
};
