const User = require("./../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ❗ dotenv does NOT load env vars on Render, but keeping it is fine for local
require("dotenv").config();

/* ======================================================
   🔹 SMTP CONFIG (BREVO + RENDER SAFE)
====================================================== */

console.log("========== SMTP ENV CHECK ==========");
console.log("SMTP_USER EXISTS:", !!process.env.SMTP_USER);
console.log("SMTP_PASS EXISTS:", !!process.env.SMTP_PASS);
console.log("SENDER_EMAIL EXISTS:", !!process.env.SENDER_EMAIL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("====================================");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // MUST be false
  auth: {
    user: process.env.SMTP_USER, // Brevo SMTP login email
    pass: process.env.SMTP_PASS, // Brevo SMTP KEY (NOT API key)
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

/* ======================================================
   🔹 VERIFY SMTP (DETAILED LOGS)
====================================================== */

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP VERIFY ERROR");
    console.error("CODE:", err.code);
    console.error("COMMAND:", err.command);
    console.error("RESPONSE:", err.response);
    console.error("MESSAGE:", err.message);
  } else {
    console.log("✅ SMTP READY (Brevo)");
  }
});

/* ======================================================
   🔹 REGISTER
====================================================== */

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      status: "Success",
      data: { user },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* ======================================================
   🔹 LOGIN
====================================================== */

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

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: "Success",
      message: "User successfully logged in",
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* ======================================================
   🔹 LOGOUT
====================================================== */

module.exports.logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({
      status: "Success",
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

/* ======================================================
   🔹 SEND RESET OTP (🔥 MOST IMPORTANT FIX HERE)
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
      return res.status(401).json({
        status: "Fail",
        message: "User not found",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpiredAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    console.log("SENDING OTP TO:", email);
    console.log("USING FROM EMAIL:", process.env.SMTP_USER);

    const mailOption = {
      // ✅ FIX: always use SMTP_USER as sender
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Password Reset Code",
      text: `Your CODE is ${otp}. It expires in 15 minutes.`,
    };

    try {
      const info = await transporter.sendMail(mailOption);
      console.log("✅ MAIL SENT");
      console.log("MESSAGE ID:", info.messageId);
      console.log("RESPONSE:", info.response);
    } catch (mailError) {
      console.error("❌ SEND MAIL FAILED");
      console.error("CODE:", mailError.code);
      console.error("RESPONSE:", mailError.response);
      console.error("MESSAGE:", mailError.message);
      throw mailError;
    }

    return res.status(200).json({
      status: "Success",
      message: "CODE sent successfully",
    });
  } catch (error) {
    console.error("RESET OTP ERROR:", error);
    return res.status(500).json({
      status: "Fail",
      message: error.message,
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
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
