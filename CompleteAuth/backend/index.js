import "dotenv/config"
import { connectDB } from "./src/db/db.js"
import { app } from "./app.js"

const PORT = process.env.PORT ||3000



connectDB()
.then(()=>{
    app.listen(PORT || 8000,()=>{
        console.log(`server is runing at port ${process.env.PORT}`)
    })
    app.on("error",(error)=>{
        console.log("Error", error)
        throw error
    })
})
.catch((err)=>{
    console.log("MongoDb connection Error", err)
})

