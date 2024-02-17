import express from "express";
import cors from "cors";
import connectTodb from "./connectdb.js";
import User from "./userInfo.js";
import { ObjectId } from "mongodb";
import { generateToken, verifyToken } from "./jwtUtil.js";
import { Await } from "react-router-dom";
import createRandomOTP from "./randomOTP.js";
import sendMail from "./sendMail.js";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(cors());

let db;

const getDBdata = async () => {
  try {
    const dbCluster = await connectTodb();
    db = dbCluster.db("LexaDB");
    startServer();
  } catch (error) {
    console.error("Failed to connect to db:", error);
    process.exit(1);
  }
};

getDBdata();

const startServer = () => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  getUserInfo("65956470bbe7987b34eaf326");
};

// =============================== LOGIN API ====================================

app.post("/api/users/login", async (req, res) => {
  try {
    const body = req.body;
    const getInfo = await checkCredential(body);
    res.status(200).json(getInfo);
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

const checkCredential = async (data) => {
  try {
    const getUserdb = await db.collection("userDB");
    const findUser = await getUserdb.findOne({ email: data.email });

    if (findUser) {
      if (data.password === findUser.password) {
        const token = await generateToken(data);
        return {
          success: true,
          data: {
            email: findUser.email,
            username: findUser.username,
            id: findUser._id,
            access_token: token,
          },
        };
      } else {
        throw new Error("Incorrect password. Please try again.");
      }
    } else {
      throw new Error("We couldn't find a user with that information.");
    }
  } catch (error) {
    return { success: false, msg: error.message };
  }
};

// =============================== END  LOGIN API ==================================== //

const checkUserExist = async (data) => {
  try {
    const getUserdb = await db.collection("userDB");
    const findUser = await getUserdb.findOne({ email: data });

    if (findUser) {
      throw new Error("This email is already used!");
    }

    return { success: true, msg: "This email is available." };
  } catch (error) {
    return { success: false, msg: error }; // Use error.message
  }
};

// =============================== SIGN UP API ==================================== //
const insertNewUser = async (data) => {
  try {
    const userDB = await db.collection("userDB");
    const checkUser = await checkUserExist(data.email);

    if (!checkUser.success) {
      throw new Error("This email is already used!");
    }
    const addData = new User(
      data.name,
      data.lastName,
      data.phone,
      data.email,
      data.password
    );

    const result = await addData.createJson();
    const insertUser = await userDB.insertOne(JSON.parse(result));

    if (!insertUser.acknowledged) {
      throw new Error("Something went wrong.");
    }

    return {
      success: true,
      msg: "User successfully registered!",
      user_id: insertUser.insertedId,
    };
  } catch (error) {
    return { success: false, msg: error.message };
  }
};

app.post("/api/users/signUp", async (req, res) => {
  try {
    const body = req.body;
    const response = await insertNewUser(body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, msg: error });
  }
});

// =============================== END SIGN UP API ==================================== //

const getUserInfo = async (data) => {
  try {
    const userDB = await db.collection("userDB");
    // Corrected projection syntax to exclude the password field
    const userExist = await userDB.findOne(
      { _id: new ObjectId(data) },
      { projection: { password: 0 } }
    );

    if (!userExist) {
      throw new Error("The user does not exist");
    }

    return { success: true, user: userExist }; // Return user data
  } catch (error) {
    return { success: false, msg: error.message };
  }
};

// =============================== PROFILE ==================================== //

app.get("/api/profile/:userId", verifyToken, async (req, res) => {
  const userId = req.params.userId;

  if (!ObjectId.isValid(userId)) {
    return res.status(404).send("No record of a user with that ID");
  }

  try {
    const result = await getUserInfo(userId);

    if (!result.success) {
      return res.status(404).send(result.msg);
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// =============================== OTP==================================== //

const sendOtp = async (number, id, email) => {
  try {
    const userDB = await db.collection("userOTP");

    // Use findOne instead of find
    const checkUser = await userDB.findOne({ user_id: id });

    if (checkUser) {
      // Update existing user's OTP
      await userDB.updateOne({ user_id: id }, { $set: { otp: number } });
    } else {
      // Insert new user's OTP
      const addOTP = await userDB.insertOne({
        user_id: id,
        otp: number,
        email: email,
      });
      if (!addOTP.acknowledged) {
        throw new Error("Can't generate the OTP!");
      }
    }

    // Send email with the OTP
    const sendMailo = await sendMail(email, number, false);
    // console.log(sendMailo);

    return {
      success: true,
      msg: "We've sent a verification code to your email.",
    };
  } catch (error) {
    // console.error(error);
    return { success: false, msg: error.message };
  }
};

app.get("/api/otp/:userId", verifyToken, async (req, res) => {
  const userId = req.params.userId;

  if (!ObjectId.isValid(userId)) {
    return res.status(404).json({ error: "No record of a user with that ID" });
  }

  try {
    const userInfoResult = await getUserInfo(userId);
    if (!userInfoResult.success) {
      return res.status(404).json({ error: userInfoResult.msg });
    }

    const otp = createRandomOTP();
    const sendOtpResult = await sendOtp(otp, userId, userInfoResult.user.email);
    if (!sendOtpResult.success) {
      return res.status(500).json({ error: "Failed to send OTP" });
    }

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/otp/:userId", verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const bodyData = req.body;
  if (!ObjectId.isValid(userId)) {
    return res.status(404).send("No record of a user with that ID");
  }

  try {
    const result = await getUserInfo(userId);
    const sendO = await verifyOtp(userId, bodyData.otp);

    if (!result.success) {
      return res.status(404).json(result.msg);
    }

    const userVerified = await makeUserVerified(userId);

    res.status(200).json(sendO);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const verifyOtp = async (userId, inputOtp) => {
  try {
    const userDB = await db.collection("userOTP");
    const userRecord = await userDB.findOne({ user_id: userId });

    if (!userRecord) {
      return { success: false, msg: "User not found." };
    }
    // Compare the provided OTP with the one in the database
    if (userRecord.otp == inputOtp) {
      const makeUser = await makeUserVerified(userId);

      if (!makeUser.success) {
        throw new Error("No record of a user with that ID");
      }

      return makeUser;
      // return { success: true, msg: "OTP verified successfully." };
    } else {
      throw new Error("Invalid OTP. Please try again.");
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return {
      success: false,
      msg: error.message,
    };
  }
};

const makeUserVerified = async (id) => {
  try {
    const userdb = await db.collection("userDB");
    const updateUser = await userdb.updateOne(
      { _id: new ObjectId(id) },
      { $set: { verified: true, secured: true } }
    );

    if (updateUser.matchedCount === 0) {
      throw new Error("We can't find a User with that ID!");
    }

    if (updateUser.modifiedCount === 0) {
      throw new Error(`No updates made for the user with ID ${id}`);
    }

    return {
      success: true,
      user_id: id,
      msg: `User with ID ${id} successfully verified and secured.`,
    };
  } catch (error) {
    return { success: false, msg: error.message };
  }
};

// =============================== END OTP==================================== //

// Function to generate a random token
const generateTokens = () => {
  return crypto.randomBytes(10).toString("hex");
};

const createResetPassword = async (email) => {
  try {
    const userDB = await db.collection("userDB");

    // Generate a temporary random password
    const temporaryPassword = generateTokens();

    // Update the user document with the temporary password
    const updateResult = await userDB.updateOne(
      { email: email.email },
      {
        $set: {
          password: temporaryPassword,
          passwordChanged: true,
        },
      }
    );

    console.log(email);
    // Check if the update was successful
    if (updateResult.modifiedCount === 0) {
      throw new Error("User not found or update failed");
    }

    // Send the password reset link via email
    const sendMailo = await sendMail(email.email, temporaryPassword, true);
    console.log(sendMailo);
    return {
      success: true,
      msg: "We have sent a temporary password to your email address. Please check your inbox to proceed with accessing your account.",
    };
  } catch (error) {
    return { success: false, msg: error.message };
  }
};

app.post("/api/reset-password", async (req, res) => {
  const bodyData = req.body;
  try {
    const response = await createResetPassword(bodyData);

    if (!response.success) {
      throw new Error(response.msg);
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Handle uncaught promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});
