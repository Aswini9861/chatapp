import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../src/context/authSlice';
import { Link } from 'react-router-dom';
import { UserCircle, Settings, Mail, LogOut } from "lucide-react";

export default function ProfileModal({ open, onClose }) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    //localStorage.removeItem("refreshToken");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="absolute top-[19%] left-[2%] w-72 bg-white rounded-xl shadow-2xl p-4
        transform transition-all duration-300 ease-in-out scale-100 hover:scale-[1.02]"
      >
        {/* Header */}
        <div className="flex items-center border-b border-gray-100 pb-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500
          flex items-center justify-center text-white font-semibold mr-3">
            {auth?.user?.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {auth?.user?.username || 'User'}
            </h3>
            <p className="text-xs text-gray-500">Profile Menu</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
        <button
            className="w-full text-left py-2 px-3 rounded-lg text-gray-700
            hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200
            flex items-center hover:shadow-lg gap-2"
          >
            <UserCircle className="w-5 h-5 text-gray-500" />
            Profile
          </button>

          <button
            className="w-full text-left py-2 px-3 rounded-lg text-gray-700
            hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200
            flex items-center hover:shadow-lg gap-2"
          >
            <Settings className="w-5 h-5 text-gray-500" />
            Settings
          </button>

          <button
            className="w-full text-left py-2 px-3 rounded-lg text-gray-700
            hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200
            flex items-center hover:shadow-lg gap-2"
          >
            <Mail className="w-5 h-5 text-gray-500" />
            Contact Us
          </button>

          {/* Logout */}
          <Link to="/login" className="block mt-3">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-blue-700
              text-gray rounded-lg hover:from-blue-700 hover:to-blue-800
              transition-all duration-200 hover:shadow-lg flex items-center gap-2"
            >
              <LogOut className="w-5 h-5 text-gray" />
              Logout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}