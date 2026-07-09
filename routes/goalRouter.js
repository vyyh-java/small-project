const express = require('express');
const goalRouter = express.Router();
const goalController = require('../controllers/goalController');

goalRouter.get("/",goalController.fetchAll);

goalRouter.post("/",goalController.create);

goalRouter.patch("/:id",goalController.update);

goalRouter.delete("/:id",goalController.delete);

module.exports = goalRouter;
