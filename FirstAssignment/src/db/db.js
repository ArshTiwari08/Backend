import mongoose from "mongoose";
import "dotenv/config";

const connectDB =async ()=>{
    try {
        const connectInstance = await mongoose.connect(process.env.MONGODB_URL)
        console.log(`\n mongoDB connected  !! DB host ${connectInstance .connection.host}`)
    } catch (error) {
        throw error
    }
} 
export default connectDB