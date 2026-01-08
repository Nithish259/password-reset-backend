const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");

dotenv.config({ path: "./.env" });

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = ["http://localhost:5173"];

app.use(express.json());

app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

const DB = process.env.MONGO_URI;

mongoose.connect(DB).then(() => {
  console.log("DB connected");
});

//api endpoints
app.get("/", (req, res) => {
  res.send("Hello Nithish");
});

app.use("/api/auth", authRouter);

app.use("/api/user", userRouter);

app.listen(port, () => {
  console.log(`Server is listening on port no : ${port}`);
});
