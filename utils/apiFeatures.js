class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Returned value from Model.find(), an query object.
    this.queryString = queryString; // req.query received from the request.
  }

  filter() {
    // Filtering actions and getting the complex params
    const { filter, page, sort, fields, limit, ...queryObj } = this.queryString;

    // Transforming the url in a string able to be read by mongo db
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => {
      return `$${match}`;
    });

    // Returning the query
    this.query.find(JSON.parse(queryString));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fieldsString = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fieldsString);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const currentPage = Number(this.queryString.page) || 1;
    const currentLimit = Number(this.queryString.limit) || 100;
    const skip = (currentPage - 1) * currentLimit;

    this.query = this.query.skip(skip).limit(currentLimit);

    return this;
  }
}

module.exports = APIFeatures;
