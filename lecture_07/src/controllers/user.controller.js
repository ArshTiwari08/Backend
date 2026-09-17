import {asynchandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudnary } from '../utils/cloudnary.js'
import jwt from "jsonwebtoken"
import { ApiResponce } from "../utils/ApiResponce.js";
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({
            validateBeforeSave: false
        });

        return {
            accessToken,
            refreshToken
        };

    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh tokens"
        );
    }
};

const registerUser = asynchandler(async(req,res)=>{
//steps to register to user
// get user details from frontend
// validation - not empty
// check if user already exists' : check by username and emails
// check form images & check for avatar
// upload them to cloudnary,avater
// create user object- create entry in db
// remove password and refresh token field from responce 
// check for user creation
// return responce

    const {fullname,email,username,password }= req.body

    // first step to  check the validation
    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required")
    // }
    // Second step to check the  validation

    // console.log("BODY:", req.body)
    // console.log("fullname:", fullname)
    // console.log("email:", email)
    // console.log("username:", username)
    // console.log("password exists:", !!password)

    if (
        [fullname, email, username, password].some(
            (field) => !field?.trim()
        )
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })
    if( existedUser){
        throw new ApiError(409,"user with the email or username is already exists")
    }
    console.log(req.files)

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    // advance Checking for both entry avatar and coverImage
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path


//if coverImage is optional
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // console.log("AVATAR PATH:", avatarLocalPath)
    // console.log("COVER PATH:", coverImageLocalPath)

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudnary(avatarLocalPath)
    const coverImage = await uploadOnCloudnary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user =  await User.create({
        fullname,
        avatar :avatar.url,
        coverImage :coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"somethings went wrong while registering the user")
    }

    // this one is also a way to send the responce
    // return res.status(201).json({createdUser})
    // Second way to do
    return res.status(201).json(
        new ApiResponce(200,createdUser,"Congratulation! user register Successfully ")
    )
    
})

// for the login USER
const loginUser = asynchandler(async (req, res) => {
    // 1. Get data from request
    const { email, username, password } = req.body;

    // 2. Check username/email and password
    if ((!username && !email) || !password) {
        throw new ApiError(400, "Username/email and password are required");
    }

    // 3. Find user
    const user = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    // 4. Check user
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // 5. Check password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // 6. Generate access and refresh tokens
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    // 7. Get logged-in user without password and refresh token
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    // 8. Cookie options
    const options = {
        httpOnly: true,
        secure: false
    };

    // 9. Send response
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponce(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    );
});

//for logged out user
const logoutUser = asynchandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponce(
            200,
            {},
            "User logged Out"
        )
    );
})

// for refresh accessToken
const refreshAccessToken = asynchandler(async (req, res) => {

    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    try {

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(
                401,
                "Refresh token is expired or invalid"
            );
        }

        const {
            accessToken,
            refreshToken
        } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: false
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponce(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refreshed successfully"
                )
            );

    } catch (error) {

        throw new ApiError(
            401,
            error?.message || "Invalid refresh token"
        );
    }
});

// to change current password
const changeCurrentPassword = asynchandler(async(req,res)=>{
    const {oldPassword,newPassword}= req.body
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:fasle})

    return res
    .status(200),
    json(new ApiResponce(200,{},"password changed successfully"))
})

// fetch current user
const getCurrentUser = asynchandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponce(200,req.user,"current user  fetched successfully"))
})

// to update account details
const updateAccountDetails = asynchandler(async(req,res)=>{
    const{fullname,email}= req.body
    if(!fullname||email){
        throw new ApiError(400,"all field are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email,
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponce(200,user,"Account details updated successfully!!"))
})

// updatig avatar image
const updateUserAvatar = asynchandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file  is missing")
    }

    const avatar = await uploadOnCloudnary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"error while uploading on the avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")
    return res
    .status(200).
    json((new ApiResponce(200,user,"avatar Upadated successfull")))


})

// updating coverImage
const updateUserCoverImage = asynchandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudnary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading coverImage")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")
    return res
    .status(200).
    json((new ApiResponce(200,user,"coverImage Upadated successfull")))

})

// simple pipeline to get subscriber and channel subscribedTO
const getUserChannelProfile = asynchandler(async(req,res)=>{
    const {username}= req.params
    if(!username?.trim){
        throw new ApiError(400,"username is missing")
    }
    // User.find({username})
    const channel = await User.aggregate([
        {
            $match :{
                username : username?.toLowerCase()
            }
        },
        {
            $lookup :{
                from : "Subscription",
                localField : "_id",
                foreignField : "channel",
                as : "subscriber"
            }
        },
        {
            $lookup :{
                from : "Subscription",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTO"
            }
        },
        {
            $addFields:{
                subscriberCount :{
                    $size : "$subscribers",
                },
                channelsSubscribedToCount :{
                    $size : "$subscribedTO"
                },
                isSubscribed :{
                    $cond :{
                        if:{$in:[req.user?._id,"$subscribers.subsciber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project :{
                fullname : 1,
                username : 1,
                subscriberCount,
                channelsSubscribedToCount,
                isSubscribed,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError (404, "Channel does not exist")
    }
    return res
    .status(200)
    .json(new ApiResponce(200,channel[0],"user channel fetched Successfully"))
})

// to getUser video history

const getWatchHistory = asynchandler(async(res,req)=>{
    const user = await User.aggregate(
        [
        {
            $match :{
                _id : new mongoose.Types.ObjectId(req.user._id)
            },
        },
        {
            $lookup:{
                form : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline :[
                    {
                        $lookup :
                    {
                        from : "users",
                        localField : "owner",
                        foreignField : "_id",
                        as : "owner",
                        pipeline :[
                            {
                                $project :{
                                    fullname :1,
                                    username : 1,
                                    avatar :1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields :
                    {
                        $first:"$owner"
                    }
                }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponce(
        200,
        user[0].watchHistory,
        "watch history fetched successfully"
    ))
})


export{registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}