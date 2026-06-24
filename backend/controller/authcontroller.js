import { comparePassword, hashPassword } from "../helper/bcrypt.js";
import userModel from "../model/userSchema.js";

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateAccessToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.SECRET_KEY, { expiresIn: "1d" }); // Short expiry for access token
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.REFRESH_SECRET_KEY, {
    expiresIn: "2d",
  });
};


export const registercontroller = async (request, response) => {
  try {
    const { username, email, password, phonenumber } = request.body;

    if (!username) {
      return response.send("username is required");
    }
    if (!email) {
      return response.send("email is required");
    }
    if (!password) {
      return response.send("password is required");
    }

    if (!phonenumber) {
      return response.send("phonenumber is required");
    }

    const existinguser = await userModel.findOne({ email });
    if (existinguser) {
      return response.status(400).send({ message: "email already registered" });
    }
    const hashedPassword = await hashPassword(password);

    const user = new userModel({
      username,
      email,
      password: hashedPassword,
      phonenumber,
    });

    const refreshToken = generateRefreshToken(user._id);
    user.refreshtoken = refreshToken;

    await user.save();
    return response.status(201).send({
      success: true,
      message: "user registered successfully",
      user: user,
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({
      message: "something went wrong",
      error,
    });
  }
};

// login

export const loginController = async (request, response) => {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response
        .status(400)
        .send({ message: "invalid email or password" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return response.status(400).send({ message: "Email is not registered" });
    }

    if (user) {
      const comparedpassword = await comparePassword(
        request.body.password,
        user.password
      );

      if (!comparedpassword) {
        return response
          .status(200)
          .send({ success: false, message: "invalid email or password !" });
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshtoken = refreshToken;
      await user.save();
      response.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
      });

      return response.status(200).send({
        success: true,
        message: "Login Successfully",
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          phonenumber: user.phonenumber,

        },
        accessToken,
      });
    }
  } catch (error) {
    console.log(error);
    return response
      .status(500)
      .send({ success: false, message: "something went wrong!", error });
  }
};


export const refreshTokenController = async (request, response) => {
  try {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken)
      return response.status(403).json({ message: "Refresh Token is required" });

    const user = await userModel.findOne({ refreshtoken: refreshToken });

    if (!user) {
      return response.status(403).json({ message: "Invalid Refresh Token" });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET_KEY,
      async (err, decoded) => {
        if (err) {
          return response.status(403).json({ message: "Refresh Token Expired" });
        }

        const newAccessToken = generateAccessToken(decoded._id);
        const newRefreshToken = generateRefreshToken(decoded._id);

        // Update refresh token in database
        await userModel.updateOne({ _id: user._id }, { refreshtoken: newRefreshToken });

        response.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Lax"
        });

        response.json({ success: true, accessToken: newAccessToken });
      }
    );
  } catch (error) {
    console.log(error);
    response.status(500).json({ message: "Something went wrong", error });
  }
};
