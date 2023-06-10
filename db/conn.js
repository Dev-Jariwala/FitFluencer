const mongoose = require('mongoose')
mongoose.set('strictQuery',true)
mongoose.connect("mongodb://127.0.0.1:27017/fitfluencer")
.then(()=>{
    console.log('Connection Sucessful........')
})
.catch((e)=>{
    console.log(e)
})