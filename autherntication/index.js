const express = require("express")
const app = express()
port = 4000

app.get("/",(req, res)=>{
    res.send("Hello this is an testing case")
})

app.get("/work",(req, res)=>{
    res.send("<h1>Education is the my workign profession</h1>")
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});