const Review = require('../models/reviewModel');
// const catchAsyncErrors = require('../utils/catchAsyncErrors');
// const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.addingRefsInRequest = (req, res, next) => {
  // Getting info in order to allow nested routes
  req.body.user = req.user.id;
  req.body.tour = req.params.tourId;
  next();
};

// exports.getAllReviews = catchAsyncErrors(async (req, res, next) => {
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const data = await Review.find(filter);
//   res
//     .status(200)
//     .json({ status: 'success', results: data.length, data: { reviews: data } });
// });

exports.getAllReviews = factory.getAllDocs(Review);

exports.getReviewById = factory.getDoc(Review);

exports.createNewReview = factory.createDoc(Review);

exports.updateReview = factory.updateDoc(Review);

exports.deleteReview = factory.deleteDoc(Review);
