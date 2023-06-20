const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profile: {
        type: String
    },
    admin: {
        type: Boolean
    },
    coach: {
        type: Boolean
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    // ,
    // totalStudents:{
    //     type:Number
    // }
});
const UserData = new mongoose.model("UserData", userSchema);

module.exports = UserData;