import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const options = {
  httpOnly: true,
  secure: true,
};

// step1 parse the body  and extract username password
// step2 check is user already exists
//step2 if not the create user
// send response
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // console.log("after injecting refresh token", user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // console.log(refreshToken, accessToken);

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("error while generating token", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName, username } = await req.body;
  console.log("/register", email, fullName);
  if (
    [email, password, fullName, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const doesExistsUserWithEmail = await User.findOne({ email });
  const doesExistsUserWithUsename = await User.findOne({ username });
  if (doesExistsUserWithEmail) {
    throw new ApiError(409, "User with same email already exists.");
  } else if (doesExistsUserWithUsename) {
    throw new ApiError(
      409,
      `User with same username = ${username} already exists.`
    );
  }
  const files = req.files;
  const avatarLocalPath = files?.avatar?.length > 0 ? files.avatar[0].path : "";
  const coverImageLocalPath =
    files?.coverImage?.length > 0 ? files.coverImage[0].path : "";

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadFileToCloudinary(avatarLocalPath);

  let coverImage = "";
  if (coverImageLocalPath) {
    coverImage = await uploadFileToCloudinary(coverImageLocalPath);
  }
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  console.log("upload avatar success");
  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Error while registering a user");
  }
  const response = new ApiResponse(
    201,
    createdUser,
    "User registered successfully"
  );
  return res.status(201).json(response);
});

// todo for loginUser
// 1. get credentials (email, password)
// 2. check if user with email exists
// 3. if not the throw error "no account found"
// 4. if exist check for password with bcrypt
// 5. if incorrect password throw error "incorrect password"
// 6. if correct then generate tokens (accessToken, refreshToken)
// 7. send response login succes
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = await req.body;
  console.log("/login ", email, username);
  if (!(email || username)) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res.cookie("accessToken", accessToken, options);
  res.cookie("refreshToken", refreshToken, options);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        // accessToken,
        // refreshToken,
      },
      "Login success"
    )
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  console.log("/logout ", req.user._id);
  const options = {
    httpOnly: true,
    secure: true,
  };
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
  return res.status(200).json(new ApiResponse(200, {}, "Logout success"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshTokenFromClient =
    (await req.cookies?.refreshToken) || (await req.body.refreshToken);
  console.log("resfreshTokenFrom client", refreshTokenFromClient);

  if (!refreshTokenFromClient) {
    console.log("token not  recieved");
    throw new ApiError(400, "Invalid refresh token");
  }
  try {
    console.log("entered try block");
    const decodedToken = jwt.verify(
      refreshTokenFromClient,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log("decoded token", decodedToken);

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    console.log("refresh token from user db", user);

    if (refreshTokenFromClient !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired!");
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("accessToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token ");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  console.log("change password", req.user._id);
  const { currentPassword, newPassword } = await req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Both fields are required");
  }

  const user = await User.findById(req.user?._id);

  let isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password");
  }

  // checkin if the new password is === old paswd
  isPasswordCorrect = await user.isPasswordCorrect(newPassword);
  if (isPasswordCorrect) {
    throw new ApiError(400, "New password should not match the old password.");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "get current user success"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = await req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { email, fullName },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "fields updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const file = req.file;
  const avatarLocalPath = file?.path;
  console.log('avatarLocalPath', avatarLocalPath, file)
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatar = await uploadFileToCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload file to cloudinary");
  }
  // const avatarId = getAssetIdFromURL(req.user.avatar);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  const prevAvatarUrl = req.user.avatar;
  if(prevAvatarUrl){
    const resp = await deleteFileFromCloudinary(prevAvatarUrl);
    console.log("file deleted", resp);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar upadted successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = await req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }
  const coverImage = await uploadFileToCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(500, "Failed to upload file to cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  const prevCoverImageUrl = req.user.coverImage;
  if(prevCoverImageUrl){
    const result = await deleteFileFromCloudinary(prevCoverImageUrl)
    if(result){
      console.log('coverImage deleted', coverImage)
    }
  }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id
  console.log('object id', userId)
  const watchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(userId))
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    avatar: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields:{
              owner: {
                $arrayElemAt: ["$owner", 0],
              }
            }
          }
        ],
      },
    },
  ]);

  return res
  .status(200).json(
    new ApiResponse(
      200,
      watchHistory[0]?.watchHistory || [],
      "Fetched watch history successfully"
    )
  );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(404, "User not found");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      }
    }
  ]);






console.log('channel', channel)
if(!channel?.length){
  throw new ApiError(404, "Channel not found")
}
return res.status(200).json(new ApiResponse(200,channel[0], "Channel fetched successfully"));
});


const test = asyncHandler(async (req, res)=>{
  console.log('req', await req.file)
  return res.json(new ApiResponse(200, "Runing", "Running"))
})
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserWatchHistory,
  getUserChannelProfile,
  test
};
