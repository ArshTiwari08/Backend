import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

cloudinary.config({ 
    cloud_name:  process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.LOUDINARY_API_KEY, 
    api_secret: process.env.LOUDINARY_API_SECRET
});

const uploadOnCloudnary = async(localfilePath)=>{
    try {
        if (!localfilePath) return null
        const responce = await cloudinary.uploader.upload(localfilePath,{
            resource_type: 'auto'
        })
        //file has been uploaded succesfully
        console.log("file is uploaded on cloudnary",responce.url);
        return responce

    } catch (error) {
        fs.unlinkSync(localfilePath)
    }
}

export {uploadOnCloudnary}