const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");

/* ================= EMAIL ================= */

const sendEmail = async ({ to, subject, text }) => {
  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: "Password Reset",
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
    }
  );
};

/* ================= REGISTER ================= */

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ status: "Fail", message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.status(201).json({
    status: "Success",
    token,
    data: { id: user._id, name: user.name, email: user.email },
  });
};

/* ================= LOGIN ================= */

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(400).json({ status: "Fail", message: "Invalid" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ status: "Fail", message: "Invalid" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ status: "Success", token });
};

/* ================= SEND RESET LINK ================= */

exports.sendResetLink = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ status: "Fail", message: "User not found" });

  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.resetPasswordToken = hashed;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Password",
    text: `Click to reset your password:\n${resetLink}\nThis link expires in 15 minutes.`,
  });

  res.json({ status: "Success", message: "Reset link sent" });
};

/* ================= RESET PASSWORD ================= */

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user)
    return res.status(400).json({ status: "Fail", message: "Invalid link" });

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = "";
  user.resetPasswordExpires = "";
  await user.save();

  res.json({ status: "Success", message: "Password reset successful" });
};

/* ================= LOGOUT ================= */

exports.logOut = (req, res) => {
  res.json({ status: "Success" });
};
