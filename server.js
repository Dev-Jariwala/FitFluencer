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

        let referralCode = req.body.referralCode;

        if (referralCode === "") {
            referralCode = "CrownManish"
        }

        // Validate referral code and find the coach
        const coach = await UserData.findOne({ referralCode });
        if (!coach) {
            req.flash('notMatched', 'Invalid Referral Code')
            return res.render("register")
        }


        if (password === cpassword) {
            const hashedPassword = await bcrypt.hash(password, 10)

            const registerUser = new UserData({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phone: req.body.phone,
                password: hashedPassword,
                admin: false,
                coach: false,
                coachId: coach._id
            });
            const result = await registerUser.save();
            // Use async/await to handle asynchronous operations
            async function countTotalStudents(coachId) {
                const students = await UserData.find({ coachId: coachId }).select('_id');

                let totalStudents = students.length;

                // Recursive function to retrieve all students for a given coach
                async function getStudentsRecursive(students) {
                    const studentIds = students.map(student => student._id);

                    const subStudents = await UserData.find({ coachId: { $in: studentIds } }).select('_id');
                    totalStudents += subStudents.length;

                    if (subStudents.length > 0) {
                        await getStudentsRecursive(subStudents);
                    }
                }

                await getStudentsRecursive(students);

                console.log(totalStudents);
                // await UserData.updateOne({ _id: coachId }, { totalStudents: totalStudents });
            }

            // Call the function with the coachId
            countTotalStudents(coach._id);
            return res.redirect('login')
        } else {
            req.flash('notMatched', 'Enter same passwords')
            return res.redirect("register")
        }
    } catch (error) {
        console.log(error)
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
            coach: req.user.coach,
            referralCode: req.user.referralCode
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
        const users = await UserData.find({}, ('profile firstname lastname admin coach totalStudents'));

        // Sort users array based on coach property
        users.sort((a, b) => {
            if (a.totalStudents > b.totalStudents) {
                return-1;
            } else if (b.totalStudents > a.totalStudents) {
                return 1;
            } else if (a.coach && b.admin) {
                return 1;
            } else if (a.admin && b.coach) {
                return -1;
            } else if (a.coach && !b.coach) {
                return -1;
            } else if (!a.coach && b.coach) {
                return 1;
            } else {
                return 0;
            }
        });
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

        let teacher = await UserData.findById(userId);
        let upline = [];
        let isDownline = false;
        // console.log(req.user._id)
        while (!(teacher.coachId == "648d7ce0e623ddcd19505ee0")) {
            const isCoachIdAvaiable = await UserData.findById(teacher.coachId);
            if(!isCoachIdAvaiable){
                teacher.coachId = "648d7ce0e623ddcd19505ee0";
                await teacher.save();
            }
            upline.push(teacher.coachId.toString())
            teacher = await UserData.findById(teacher.coachId);

        }
        // console.log(upline)
        for (let i = 0; i < upline.length; i++) {
            if (upline[i] == req.user._id) {
                isDownline = true;
            }
        }
        // console.log(isDownline);


        if (!user) {
            // User not found
            return res.sendStatus(404);
        }
        const students = await UserData.find({ coachId: user._id }, ('profile firstname lastname admin coach referralCode'));

        res.render('viewprofile', {
            user,
            isAdmin: req.user.admin,
            students,
            isSelf: req.user._id == userId,
            isDownline: isDownline
        });
    } catch (error) {
        // Handle error
        console.error(error);
        res.sendStatus(500);
    }
});



//   Generating referral code referral codes before admin creates coach
const generateReferralCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';

    let isUnique = false;
    while (!isUnique) {
        for (let i = 0; i < 8; i++) {
            referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Check if the generated code already exists in the database
        const existingUser = await UserData.findOne({ referralCode });
        if (!existingUser) {
            isUnique = true;
        } else {
            // Code already exists, regenerate a new code
            referralCode = '';
        }
    }
    console.log(referralCode);

    return referralCode;
};




// Making coaches by admin from viewprofile pages of user
app.post('/makecoach/:id', checkAuthenticated, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserData.findById(userId);

        if (!user) {
            // User not found
            return res.sendStatus(404);
        }

        // Generate a referral code for the coach
        const referralCode = await generateReferralCode();

        user.referralCode = referralCode;
        user.coach = true;
        await user.save();
        res.redirect(`/viewprofile/${userId}`);
    } catch (error) {
        // Handle error
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete User - (method=DELETE)
app.delete('/deleteuser/:id', checkAuthenticated, async (req, res) => {
    try {
        const userId = req.params.id;
        await UserData.findByIdAndDelete(userId);
        res.redirect('/rank');
    } catch (error) {
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
        user.referralCode = "";
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