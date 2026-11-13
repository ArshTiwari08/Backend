import mongoose from "mongoose";

const connectDB = async()=>{
    try {
        const dbInstance = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`\nmongoDB connected  !! DB host ${dbInstance.connection.host}`)
    } catch (error) {
        console.log("mongodb connection Errro",error)
        process.exit(1)
    }
}

export {connectDB}