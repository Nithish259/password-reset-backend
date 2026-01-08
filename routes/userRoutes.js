const express = require("express");
const { getUserData } = require("../controllers/userController");
const User = require("../models/userModel");
const userAuth = require("../middleware/userAuth");

const userRouter = express.Router();

userRouter.get("/data", getUserData);

module.exports = userRouter;
