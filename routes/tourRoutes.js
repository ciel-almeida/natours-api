const express = require('express');
const toursController = require('../controllers/toursController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/')
  .get(toursController.getAllTours)
  .post(
    authController.protectedRoute,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.createNewTour
  );

router
  .route('/:id')
  .get(toursController.getTourById)
  .patch(
    authController.protectedRoute,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.updateTour
  )
  .delete(
    authController.protectedRoute,
    authController.restrictTo('admin', 'lead-guide'),
    toursController.deleteTour
  );

router
  .route('/top-5-cheap')
  .get(toursController.aliasTopTours, toursController.getAllTours);

router.route('/tour-stats').get(toursController.getTourStats);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(toursController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(toursController.getDistances);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protectedRoute,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    toursController.getMonthlyPlan
  );

module.exports = router;
