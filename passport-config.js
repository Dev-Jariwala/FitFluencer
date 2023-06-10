const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const UserData = require('./models/schema')

function initialize(passport) {
    // function to authenticate Users........
    const authenticateUser = async (phone, password, done) => {
        // get user by email..........
        const user = await UserData.findOne({ phone: phone });
        // console.log(user);
        if (user == null) {
            return done(null, false, { message: 'User does not exist..' })
        }
        try {
            // checking if password enterd matches with password in database..
            const passwordMatched = await bcrypt.compare(password, user.password)
            if (passwordMatched) {
                return done(null, user)
            } else {
                return done(null, false, { message: 'Incorrect Details' })
            }
        } catch (error) {
            console.log(error)
            return done(error)
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'phone' }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await UserData.findById(id)
            return done(null, user)
        } catch (error) {
            done(error, false)
        }
    })
}

module.exports = initialize