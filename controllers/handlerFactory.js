const AppError = require('../utils/appError');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const APIFeatures = require('../utils/apiFeatures');

exports.getAllDocs = Model =>
  catchAsyncErrors(async (req, res, next) => {
    // Filter to ge all reviews of a given tour id if required
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const data = await features.query.explain(); // explain to get information about the database performance
    const data = await features.query;

    res
      .status(200)
      .json({ status: 'success', results: data.length, data: { data } });
  });

exports.getDoc = (Model, populateOptions) =>
  catchAsyncErrors(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const data = await query;

    if (!data) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({ status: 'success', data: { data } });
  });

exports.createDoc = Model =>
  catchAsyncErrors(async (req, res, next) => {
    const data = await Model.create(req.body);
    res.status(201).json({ status: 'success', data: { data } });
  });

exports.updateDoc = Model =>
  catchAsyncErrors(async (req, res, next) => {
    const data = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!data) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).send({
      status: 'success',
      data: { data }
    });
  });

exports.deleteDoc = Model =>
  catchAsyncErrors(async (req, res, next) => {
    const data = await Model.findByIdAndDelete(req.params.id);

    if (!data) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
