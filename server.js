require('dotenv').config()
//  Importing libraries..............
const express = require('express')
const app = express()
const path = require("path");
require('./db/conn')
const UserData = require('./models/schema')
const bcrypt = require('bcrypt')
const initializePassport = require('./passport-config')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
initializePassport(passport)
const port = process.env.PORT || 3000

const publicPath = path.join(__dirname, './public');

app.use(express.static(publicPath));
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.set('view engine', 'ejs');
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/register',checkNOTAuthenticated, (req, res) => {
    res.render('register')
})
app.post('/register',checkNOTAuthenticated, async (req, res) => {
    try {

        const password = req.body.password;
        const cpassword = req.body.cpassword;

        if (password === cpassword) {
            const hashedPassword = await bcrypt.hash(password, 10)

            const registerUser = new UserData({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phone: req.body.phone,
                password: hashedPassword,
            });
            const result = await registerUser.save();
            res.redirect('login')
        } else {
            req.flash('notMatched', 'Enter same passwords')
            res.redirect("register")
        }
    } catch (error) {
        res.redirect('register')
    }
})

app.get('/login',checkNOTAuthenticated, (req, res) => {
    res.render('login')
})
app.post('/login',checkNOTAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,

}))

app.get('/dashboard',checkAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: {
            firstname: req.user.firstname
        }
    })
})
app.delete('/logout',checkAuthenticated, (req, res) => {
    req.logout(req.user, err => {
        if (err) return next(err)
        res.redirect('/login')
    })
})
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}
function checkNOTAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}
app.listen(port, () => {
    console.log(`Listining on the port ${port}....`)
})