const User = require('../models/userModel');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsyncErrors(async (req, res, next) => {
  // 1. Check if the password is present in the body
  if (req.body.password) {
    next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2. Filtering the request and updating the user
  const { name, email } = req.body;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { name, email },
    { new: true, runValidators: true }
  );

  // 3. Sending response with the new data
  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

exports.deleteMe = catchAsyncErrors(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({ status: 'success', data: null });
});

exports.createUser = (req, res, next) => {
  next(new AppError('Route not implemented. Use /signup instead!'));
};

exports.getAllUsers = factory.getAllDocs(User);

exports.getUserById = factory.getDoc(User);

exports.updateUser = factory.updateDoc(User);

exports.deleteUser = factory.deleteDoc(User);
