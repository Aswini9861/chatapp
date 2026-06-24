import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../context/authSlice";
import { setAccessToken } from "../config/ApiHandler";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Login = () => {
  const dispatch = useDispatch()
  const Navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password:"",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    try {
        const getdata = await axios.post(`${backendUrl}api/v1/auth/login`, formData,{
          withCredentials: true, // ✅ Important for cookies
        });

        if (getdata?.data?.success) {

          const accessToken = getdata.data.accessToken;
          setAccessToken(accessToken); // Store in memory instead of localStorage
          localStorage.setItem("user", JSON.stringify(getdata.data.user));
          localStorage.setItem("accessToken", JSON.stringify(getdata.data.accessToken));
          dispatch(
            login({
              id: getdata.data.user._id,
              user: getdata.data.user,
              token: accessToken, // Use token from memory
            })
          );
          Navigate("/home");
        } else {
          console.error("Something went wrong");
        }
      } catch (error) {
        console.log(error);
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-300">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 relative">

        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="font-bold text-2xl mb-2">📩 chat</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          <button
            type="submit"
            className="w-full bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition"
          >
            Login
          </button>
        </form>
        <div className="ml-7">
              <p>
                Don't have an account?{' '}
                <Link to="/register">
                  <span className="text-blue-400">Register</span>
                </Link>
              </p>
        </div>

      </div>
    </div>
  );
};

export default Login;