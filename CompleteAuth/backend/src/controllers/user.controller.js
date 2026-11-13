import mongoose  from "mongoose";
import { newUser } from "../models/user.model.js"

// to genrate access and refresh token 
const generateRefreshToken = async (userId)=>{
    try {
        const user = await newUser.findById(userId)
        if(!user){
            console.log("user not found")
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
        console.log("access and refresh token genration error",error)
    }
}

//  to register user
const registerUser = async(req,res)=>{
    const {fullname,email,username,password } = req.body
    if([fullname,email,username,password].some((field) => !field?.trim())){
        console.log("all field are required",err)
    }


    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })
    if( existedUser){
        throw error (409,"user with the email or username is already exists")
    }
    
}

