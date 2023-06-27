const mongoose = require('mongoose');
// const User = require('./userModel');
const Tour = require('./tourModel');

// review, rating, createdAt, user ref, tour ref

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    trim: true,
    required: [true, `A review can't be left blank`]
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be equal or above to 1'],
    max: [5, 'Rating must be equal or below 5']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, `Review must belong to an user`]
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, `Review must belong to a tour`]
  }
});
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: '-__v -passwordChangedAt -email -role'
  });
  //   this.populate({ path: 'tour', select: '-guides name _id' });
  next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);
  const { _id, ...statsObj } = stats[0];
  // console.log('statsObj:', statsObj);
  // console.log('nratings:', statsObj.nRatings);
  // console.log('avg:', statsObj.avgRating);
  await Tour.findByIdAndUpdate(
    _id,
    {
      ratingQuantity: statsObj.nRatings,
      ratingsAverage: statsObj.avgRating
    },
    { useFindAndModify: false }
  );
};

reviewSchema.post('save', function() {
  // this points to the current review
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.post(/^findOneAnd/, async function(doc) {
  await doc.constructor.calcAverageRatings(doc.tour);
});

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
