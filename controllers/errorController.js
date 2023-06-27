const AppError = require('../utils/appError');

// Global Error Handler
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};
const sendErrorProd = (err, res) => {
  // Operational trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  // Programing or other unknow error: don't leak error details
  else {
    // 1. Log error to developers see in the plataform console
    console.error('ERROR 🐞:', err);
    // 2. Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  // const value = err.errmsg.match(/["']/)
  const value = err.keyValue.name;
  const key = Object.keys(err.keyValue);
  const message = `Duplicated field value: (${key}: ${value}). Please use another value .`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = err => {
  return new AppError('Invalid Token. Please log in again!', 401);
};

const handleJWTExpiredError = err => {
  return new AppError('Your token has expired. Please log in again!', 401);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') {
      const error = handleCastErrorDB(err);
      sendErrorProd(error, res);
      return;
    }
    if (err.code === 11000) {
      const error = handleDuplicateFieldsDB(err);
      sendErrorProd(error, res);
      return;
    }
    if (err.name === 'ValidationError') {
      const error = handleValidationErrorDB(err);
      sendErrorProd(error, res);
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      const error = handleJWTError(err);
      sendErrorProd(error, res);
      return;
    }
    if (err.name === 'TokenExpiredError') {
      const error = handleJWTExpiredError(err);
      sendErrorProd(error, res);
      return;
    }
    sendErrorProd(err, res);
  }
};
