// require('dotenv').config({path :'./env'})
import dotenv from "dotenv"
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
    path : './.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`server is runing at port ${process.env.PORT}`)
    })
    app.on("error",(error)=>{
        console.log("Error", error)
        throw error
    })
})
.catch((err)=>{
    console.log("mongoDB connection feiled error!", err)
})


// Wey to connect mongodb with backend
/*
import express from "express"
const app = express()

(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("Error",(error)=>{
            console.log("Error",error)
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listening on port ${process.env.PORT}`)

        })
    }catch(error){
        console.log(error)
        throw err
    }
})()
*/