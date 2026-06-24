import React, { useState } from "react";
import axios from "axios";
import { useNavigate,Link } from "react-router-dom";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Register = () => {
  const Navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password:"",
    phonenumber: "",
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
        const getdata = await axios.post(`${backendUrl}api/v1/auth/register`, formData);
        if (getdata?.data?.success) {

          Navigate("/login");
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
            type="text"
            name="username"
            placeholder="userName"
            value={formData.username}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
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
          <input
            type="tel"
            name="phonenumber"
            placeholder="Phone Number"
            value={formData.phonenumber}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button
            type="submit"
            className="w-full bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition"
          >
            Register
          </button>
        </form>
        <div className="ml-7">
                    <p>
                      Already have account?{' '}
                      <Link to="/">
                        <span className="text-blue-400">Login</span>
                      </Link>
                    </p>
              </div>
      </div>

    </div>
  );
};

export default Register;