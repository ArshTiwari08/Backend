import {asynchandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudnary } from '../utils/cloudnary.js'
// import upload  from "../middlewares/multer.middleware.js"
import { ApiResponce } from "../utils/apiResponce.js" 

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return{refreshToken, accessToken}

    } catch (error) {
        throw new ApiError(501,"something went wrong while genearting access and refresh token")
    }
}

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
const loginUser = asynchandler(async(req, res)=>{
    //Working todo
    // 1) user should signed up
    // 2) req -> data
    // username & email
    // password check
    // accrss and refrsh token and send to user
    // sent cookies
    // responce to user

    const{email,username, password}= req.body

    if(!username,email){
        throw new ApiError(404,"username or password is required")
    }

    const user = await User.findOne({
        $or:[username,email]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }
    
    const isPasswordvalid = await user.isPasswordCorrect(password)
    if(!isPasswordvalid){
        throw new ApiError(401,"Invalid user credential")
    }

    const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

    const logedInUser = User.findById(user._id)
    select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refresh token",refreshToken,options)
    .json(
        new ApiResponce(
            200,
            {
                user: logedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
        )
    )
})

//for logged out user
const logoutUser = asynchandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken : undefined
            }
        },{
            new : true
        }
        
    )
    const options = {
        httpOnly : true,
        secure : true
    }
    return res
    .status(200)
    .clearCookies("accessToken",options)
    .clearCookies("refreshToken",options)
    .json(new ApiResponce(200,{},"User logged out"))
})

export{registerUser,loginUser,logoutUser}