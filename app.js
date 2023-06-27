const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

// Initializing the server
const app = express();

// GLOBAL MIDDLEWARES
// Set security HTTP Headers
app.use(helmet());

// Middleware to log request in the console
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body Parser Middleware to read the request body
app.use(express.json());

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter polution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Middleware to serve static files
app.use(express.static(`${__dirname}/public`));

// Middleware to limit the number of requests from the same IP
const limiter = rateLimit({
  max: 200,
  windowMs: 1000 * 60 * 60,
  message: 'Too many requests from this IP, please try again in an hour'
});
app.use('/api', limiter);

// ROUTES
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// Not found routes error handler
app.all('*', (req, res, next) => {
  // Anything passed inside a next() will be considered an error, and the middleware pipeline will be skipped to the end
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

// Middleware that works as an global error handle
app.use(globalErrorHandler);

module.exports = app;
