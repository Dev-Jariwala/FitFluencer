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
const bodyParser = require('body-parser');
initializePassport(passport)
const multer = require('multer');
const port = process.env.PORT || 3000

const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath));
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
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


// Landing Page
app.get('/', checkNOTAuthenticated, (req, res) => {
    res.render('index')
})


// Register Page - (method=GET)
app.get('/register', checkNOTAuthenticated, (req, res) => {
    res.render('register')
})
// Register Page - (method=POST)
app.post('/register', checkNOTAuthenticated, async (req, res) => {
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
                admin: false,
                coach: false
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



// Login Page - (method=GET)
app.get('/login', checkNOTAuthenticated, (req, res) => {
    res.render('login')
})
// Login Page - (method=POST)
app.post('/login', checkNOTAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,

}))


// Dashboard Page - (method=GET)
app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', {
        user: {
            firstname: req.user.firstname
        }
    })
})



// Profile Page - (method=GET)
app.get('/profile', checkAuthenticated, (req, res) => {
    res.render('profile', {
        user: {
            firstname: req.user.firstname,
            lastname: req.user.lastname,
            phone: req.user.phone,
            profile: req.user.profile,
            admin: req.user.admin,
            coach: req.user.coach
        }
    })
})



// Using multer storage for saving users profiles
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + path.extname(file.originalname)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const upload = multer({ storage: storage }).single('profile')

// Upload (method=POST)
app.post('/upload', upload, checkAuthenticated, async (req, res) => {
    try {
        const profile = req.file.filename;
        const addprofile = await UserData.updateOne({ _id: req.user.id }, {
            profile: profile
        });
        res.redirect("/profile");
    } catch (error) {
        res.send(error);
    }
})



// Rank Page - (method=GET)
app.get('/rank', checkAuthenticated, async (req, res) => {
    try {
        const users = await UserData.find({}, ('profile firstname lastname admin coach'));
        res.render('rank', { users });
    } catch (error) {
        // Handle error
        console.error(error);
        res.sendStatus(500);
    }
});



// ViewProfile Page of user = (method=GET)
app.get('/viewprofile/:id', checkAuthenticated, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserData.findById(userId);
        
        if (!user) {
            // User not found
            return res.sendStatus(404);
        }

        res.render('viewprofile', { user , isAdmin:req.user.admin });
    } catch (error) {
        // Handle error
        console.error(error);
        res.sendStatus(500);
    }
});



// Making coaches by admin from viewprofile pages of user
app.post('/makecoach/:id', checkAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await UserData.findById(userId);
  
      if (!user) {
        // User not found
        return res.sendStatus(404);
      }
  
      user.coach = true;
      await user.save();
  
      res.redirect(`/viewprofile/${userId}`);
    } catch (error) {
      // Handle error
      console.error(error);
      res.sendStatus(500);
    }
  });


  // Removing coaches by admin from viewprofile pages of user
  app.post('/removecoach/:id', checkAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await UserData.findById(userId);
  
      if (!user) {
        // User not found
        return res.sendStatus(404);
      }
  
      user.coach = false;
      await user.save();
  
      res.redirect(`/viewprofile/${userId}`);
    } catch (error) {
      // Handle error
      console.error(error);
      res.sendStatus(500);
    }
  });
  

app.delete('/logout', checkAuthenticated, (req, res) => {
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