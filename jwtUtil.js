import jwt from "jsonwebtoken";

const JWT_SECRET =
  "3a24541f2120007de914829d605731ed8c155fc346e3f46a481d16da7843cc10aed25bb9c36b1cc5956782adb98756d9bbf24acbeac1f08f6aba4ed809271fbe"; // Ensure this is set in your environment variables

const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    // Other user properties if needed
  };

  const options = {
    expiresIn: "2h", // Adjust as per requirement
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  const [bearer, id] = token.split(" ");
  if (!token) {
    return res
      .status(401)
      .json({ success: false, msg: "Access denied. No token provided." });
  }
  // if (!id) {
  //   return res
  //     .status(401)
  //     .json({
  //       success: false,
  //       msg: "Access denied. No user identifier provided.",
  //     });
  // }

  try {
    const decoded = jwt.verify(id, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ success: false, msg: "Invalid token." });
  }
};

export { generateToken, verifyToken };
