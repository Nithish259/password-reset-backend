const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP FAILED:", err);
  } else {
    console.log("✅ SMTP SUCCESS");
  }
});

module.exports = transporter;
