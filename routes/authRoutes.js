const express = require("express");
const {
  register,
  login,
  logOut,
  sendResetOtp,
  resetPassword,
} = require("../controllers/authController");

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logOut", logOut);
authRouter.post("/sendResetOtp", sendResetOtp);
authRouter.post("/resetPassword", resetPassword);

module.exports = authRouter;
