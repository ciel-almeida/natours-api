const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');
// const AppError = require('../utils/appError');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const factory = require('./handlerFactory');

// Middlewares
// exports.checkID = (req, res, next, val) => {
//   console.log(`This is the middleware to check if the id ${val} is valid.`);
//   const id = +req.params.id;
//   const tour = tours.find((tour) => tour.id === id);

//   if (!tour) {
//     return res.status(404).send({
//       status: 'fail',
//       message: 'Tour not found, invalid ID.',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   console.log(req.body);
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).send({
//       status: 'fail',
//       message: 'Bad request.',
//     });
//   }
//   next();
// };

// Middleware with predetermined values (ALIAS)
exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAllDocs(Tour);

exports.getTourById = factory.getDoc(Tour, { path: 'reviews' });

exports.createNewTour = factory.createDoc(Tour);

exports.updateTour = factory.updateDoc(Tour);

exports.deleteTour = factory.deleteDoc(Tour);

exports.getTourStats = catchAsyncErrors(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: '$difficulty',
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

exports.getMonthlyPlan = catchAsyncErrors(async (req, res, next) => {
  const { year } = req.params;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $sort: {
        numTourStarts: -1
      }
    },
    {
      $project: { _id: 0 }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: plan
  });
});

exports.getToursWithin = catchAsyncErrors(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format latitude,longitude',
        400
      )
    );
  }

  const data = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  console.log(distance, latlng, unit);

  res
    .status(200)
    .json({ status: 'success', results: data.length, data: { data } });
});

exports.getDistances = catchAsyncErrors(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format latitude,longitude',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+lng, +lat]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({ status: 'success', data: { distances } });
});
