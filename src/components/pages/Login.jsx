import { motion } from "framer-motion";
import { AUTH_URL } from "../../store/constants.js";
import {logo} from "../../assets/assets.js";

export default function Login() {
  const currentUrl = window.location.href;

  const handleLoginWithGoogle = () => {
    window.location.href = `${AUTH_URL}?controller=auth&action=googleLogin&frontend=${encodeURIComponent(
      currentUrl
    )}`;
  };

  const handleLoginWithMicrosoft = () => {
    window.location.href = `${AUTH_URL}?controller=auth&action=microsoftLogin&frontend=${encodeURIComponent(
      currentUrl
    )}`;
  };


  const loginImg =
    "https://app.guestpostcrm.com/images/loginPage.jpg";

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-r from-[#e8f0ff] via-[#f3fffa] to-[#f8fff5]">

      {/* LEFT SECTION */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-1 flex-col items-center justify-center px-6 md:px-10"
      >
        {/* Logo */}
        <img
          src={logo}
          alt="GuestPostCRM"
          className="w-56 mb-10 select-none"
        />

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
          Login to your account
        </h1>

        {/* Google Login */}
        <button
          onClick={handleLoginWithGoogle}
          className="mt-8 w-full max-w-xs flex items-center justify-center gap-3 rounded-full px-4 py-3 border border-gray-300 bg-white shadow-sm hover:bg-gray-100 transition-all duration-300"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-gray-800 font-medium">
            Login with Google
          </span>
        </button>

        {/* Microsoft Login */}
        <button
          onClick={handleLoginWithMicrosoft}
          className="mt-4 w-full max-w-xs flex items-center justify-center gap-3 rounded-full px-4 py-3 border border-gray-300 bg-black text-white shadow-sm hover:bg-gray-900 transition-all duration-300"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
            alt="Microsoft"
            className="w-5 h-5 bg-white rounded"
          />
          <span className="font-medium">
            Log in with Microsoft
          </span>
        </button>

        {/* Signup */}
        <p className="mt-6 text-gray-600 text-sm text-center">
          Don’t have an account?
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();

              // First hit destroy.php
              fetch("https://www.guestpostcrm.com/rightee/destroy.php", {
                method: "GET",
                credentials: "include",
              })
                .finally(() => {
                  // Then redirect to google.php
                  window.location.href =
                    "https://www.guestpostcrm.com/rightee/google.php";
                });
            }}
            className="ml-1 text-purple-600 font-medium hover:underline"
          >
            Sign Up
          </a>
        </p>
      </motion.div>

      {/* RIGHT SECTION */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-1 items-center justify-center p-4"
      >
        <div className="relative w-full h-full max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl">

          {/* Background Image */}
          <img
            src={loginImg}
            alt="Login visual"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/10" />

        </div>
      </motion.div>
    </div>
  );
}