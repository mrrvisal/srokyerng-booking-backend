// const asyncHandler = (fn) => {
//   return (req, res, next) => {
//     return Promise.resolve(fn(req, res, next)).catch(next);
//   };
// };

// module.exports = asyncHandler;
const asyncHandler = (fn) => {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("ASYNC ERROR:", err);
      next(err);
    });
  };
};

module.exports = asyncHandler;