import mongoose,{Schema} from "mongoose";

const userSchema = new Schema(
    {
        name :{
            type :String,
            required : true,
            lowercase : true
        },
        age: {
            type : Number,
            required : true
        },
        city : {
            type : String,
            required : true
        },
        work :{
            type : String,
            required : true
        }
    }
    ,{
    timestamps:true
    }
)

export const User = mongoose.model("User",userSchema)

