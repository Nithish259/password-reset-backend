const User = require("./../models/userModel");
const jwt = require("jsonwebtoken");

module.exports.getUserData = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({
        status: "Fail",
        message: "User not Found",
      });
    }

    res.json({
      status: "Success",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};
