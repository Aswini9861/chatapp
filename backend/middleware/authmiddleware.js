import Jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const requireSignin = (request, response, next) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return response.status(401).send({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decodetoken = Jwt.verify(token, process.env.SECRET_KEY);
    request.user = decodetoken;
    next();
  } catch (error) {
    console.log(error);
    return response.status(401).send({ message: "invalid request" });
  }
};
