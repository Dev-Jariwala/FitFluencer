const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    firstname:{
        type:String,
        required:true
    },
    lastname:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    }
});
const UserData = new mongoose.model("UserData",userSchema);

module.exports = UserData;