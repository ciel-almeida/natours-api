require('dotenv').config();
const mongoose = require('mongoose');

// listener to caugh exceptions at the beginning of the program
process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log('UNCAUGH EXCEPTION: Shutting Down...');
  process.exit(1);
});

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
// console.log('DB PASS: ', DB);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true
  })
  .then(con => {
    // console.log(con.connections);
    console.log('DB connected');
  });

const host = process.env.HOST;
const port = process.env.PORT;

console.log('NODE_ENV: ', process.env.NODE_ENV);

const server = app.listen(port, () => {
  console.log(`Server listening on ${host}:${port}`);
});

process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION: Shutting Down...');
  server.close(() => {
    process.exit(1);
  });
});
