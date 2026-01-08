const User = require("./../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

require("dotenv").config();

const sendEmail = async ({ to, subject, text }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Password Reset Flow",
          email: process.env.SMTP_USER,
        },
        to: [{ email: to }],
        subject,
        textContent: text,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
  } catch (error) {
    throw error;
  }
};

module.exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: "Fail",
      message: "Please fill in all the details",
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "Fail",
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      status: "Success",
      token, // ✅ IMPORTANT
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

module.exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "Fail",
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Fail",
        message: "Invalid email",
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(400).json({
        status: "Fail",
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      status: "Success",
      token, // ✅ IMPORTANT
      message: "User successfully logged in",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

module.exports.logOut = async (req, res) => {
  return res.status(200).json({
    status: "Success",
    message: "User logged out successfully",
  });
};

/* ======================================================
   🔹 SEND RESET OTP (BREVO API)
====================================================== */

module.exports.sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "Fail",
      message: "Email is required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Fail",
        message: "User not found",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpiredAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    console.log("SENDING OTP TO:", email);

    await sendEmail({
      to: user.email,
      subject: "Password Reset Code",
      text: `Your CODE is ${otp}. It expires in 15 minutes.`,
    });

    return res.status(200).json({
      status: "Success",
      message: "CODE sent successfully",
    });
  } catch (error) {
    console.error("RESET OTP ERROR:", error);
    return res.status(500).json({
      status: "Fail",
      message: "Failed to send reset code",
    });
  }
};

/* ======================================================
   🔹 RESET PASSWORD
====================================================== */

module.exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      status: "Fail",
      message: "Email, OTP and new password are required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: "Fail",
        message: "User not found",
      });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({
        status: "Fail",
        message: "Invalid code entered",
      });
    }

    if (user.resetOtpExpiredAt < Date.now()) {
      return res.status(400).json({
        status: "Fail",
        message: "Code has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpiredAt = 0;
    await user.save();

    return res.status(200).json({
      status: "Success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
