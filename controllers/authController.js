const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 90 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsyncErrors(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    confirmPassword: req.body.confirmPassword
  });

  //   const token = signToken(newUser._id);
  //   res.status(201).json({ status: 'success', token, data: { user: newUser } });
  newUser.password = undefined;
  newUser.active = undefined;
  newUser.role = undefined;
  createAndSendToken(newUser, 201, res);
});

exports.login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 401));
  }
  // 2. Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  // const correct = await user.correctPassword(String(password), user.password);

  if (!user || !(await user.correctPassword(String(password), user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  user.password = undefined;
  // 3. If everything is correct
  //   const token = signToken(user._id);
  //   res.status(200).json({ status: 'success', token });
  createAndSendToken(user, 200, res);
});

exports.protectedRoute = catchAsyncErrors(async (req, res, next) => {
  // 1) Getting token and check if it exists
  const { authorization } = req.headers;
  if (
    !authorization ||
    !authorization.startsWith('Bearer') ||
    !authorization.split(' ')[1]
  ) {
    return next(
      new AppError(
        'You are not logged in! Please verify your Authorization token and try again.',
        401
      )
    );
  }

  const token = authorization.split(' ')[1];

  // 2) Vefification Token
  // Turning the verify function into an promise in order to not block the event loop
  const jwtVerifyPromisified = promisify(jwt.verify);
  const decoded = await jwtVerifyPromisified(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does not longer exist!',
        401
      )
    );
  }

  // 4) Check if user changed password after the JWT token was issued
  const isChangedAfterEmission = currentUser.changedPasswordAfter(decoded.iat);
  if (isChangedAfterEmission) {
    return next(
      new AppError('User recently changed password! Please, log in again.', 401)
    );
  }

  // 5) Passing the current user for the next middlewares through the middleware
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  // 1. Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  // 2. Generate the random reset token
  const resetToken = user.passwordResetCode();
  user.save({ validadeBeforeSave: false });

  // 3. Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you didn't forgot your password, please ignore this email.`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10min)',
      message
    });

    res.status(200).json({ status: 'success', message: 'Token sent to email' });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validadeBeforeSave: false });
    console.log('Error: ', error);
    next(new AppError('Something went wrong. Try again later!', 500));
  }
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  console.log('teste de rota');
  // 1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken
  });
  console.log('User:', user);
  // 2. If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. Update changedPasswordAt property for the user

  // 4. Log the user in, sent JWT
  const token = signToken(user._id);

  res.status(200).json({ status: 'success', token });
});

exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  // 2. Check if POSTed password is valid
  if (
    !(await user.correctPassword(
      String(req.body.passwordCurrent),
      user.password
    ))
  ) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3. If so, update password
  user.password = req.body.newPassword;
  user.confirmPassword = req.body.confirmNewPassword;
  await user.save();

  // 4. Log user in, send JWT
  const token = signToken(user._id);
  res.status(200).json({ status: 'success', token });
});
