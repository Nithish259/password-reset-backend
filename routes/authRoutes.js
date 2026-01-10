const express = require("express");
const {
  register,
  login,
  sendResetLink,
  resetPassword,
  logOut,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/sendResetLink", sendResetLink);
router.post("/resetPassword/:token", resetPassword);
router.post("/logOut", logOut);

module.exports = router;
