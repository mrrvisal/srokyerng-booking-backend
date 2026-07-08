// Lets service-layer files (no `req` access) emit socket events without
// threading the `io` instance through every function signature.
let io = null;

const setIO = (instance) => {
  io = instance;
};

const getIO = () => io;

module.exports = { setIO, getIO };
