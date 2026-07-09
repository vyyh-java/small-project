const express = require("express");
const path = require("path");
require("dotenv").config();
const pinoHttp = require('pino-http');
const session = require('express-session');
const sanitize = require('mongo-sanitize');
const mongoose = require("mongoose");
const goalRouter = require('./routes/goalRouter');
const app = express();
const PORT = 3000;

//testing only
const MONGODB_URI = 'mongodb://127.0.0.1:27017/finzen_db'

mongoose.connect(MONGODB_URI)
//mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Connection failed:", err));

// Middleware
app.use(pinoHttp()); //logger
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// user login simulation
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));

// avoid noSQL injection
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  next();
});

// goal mini middleware
app.use('/api/goals',goalRouter);

// user login simulation
app.get('/test-login', (req, res) => {
  req.session.userId = new mongoose.Types.ObjectId('000000000000000000000001');
  res.json({ message: 'Session set', userId: req.session.userId });
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
  res.json({ userId: req.session.userId, joinDate: '2026-01-12' });
});

// error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
app.listen(PORT, function() {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- Goals API: http://localhost:${PORT}/api/goals`);
});
