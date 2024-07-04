const config = require('../config/auth.config')
const db = require('../models')
const User = require('../models/user.model')
const Role = require('../models/role.model')

var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')

exports.signup = async (req, res) => {
    try {
        const {name, username, email, password, phone,confirm_password} = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({error: "Email chưa đúng định dạng"});
        }

        const existingUser = await User.findOne({username});
        if (existingUser) {
            return res.status(400).json({error: "Username đã được sử dụng"});
        }

        const existingEmail = await User.findOne({email});
        if (existingEmail) {
            return res.status(400).json({error: "Email đã được sử dụng"});
        }

        const existingPhone = await User.findOne({phone});
        if (existingPhone) {
            return res.status(400).json({error: "Số điện thoại đã được sử dụng"});
        }
        if (confirm_password.trimEnd() !== password.trimEnd()) {
            return res.status(400).json({error: "Mật khẩu chưa trùng khớp "});
        }
        if (password.length < 6) {
            return res.status(400).json({error: "Mật khẩu phải nhiều hơn 6 kí tự"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password.trimEnd(), salt);

        const role = await Role.findOne({name: 'user'})

        const newUser = new User({
            email,
            username,
            name : name.trimEnd(),
            phone,
            password: hashedPassword,
            roles: [role._id]
        });

        if (newUser) {
            const token = jwt.sign({id: newUser._id, username: newUser.username}, config.secret, {
                algorithm: 'HS256',
                allowInsecureKeySizes: true,
                expiresIn: 86400 // 24 hours
            })
            await newUser.save();

            res.status(201).json({
                id: newUser._id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                accessToken : token,
            });
        } else {
            res.status(400).json({error: "Invalid user data"});
        }

    } catch(error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.signin = async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email}).populate('roles', '-__v')

        const isPasswordCorrect = bcrypt.compareSync(password, user?.password || "")


        if (!user || !isPasswordCorrect) {
            return res.status(400).json({error: "Sai thông tin đăng nhập"});
        }

        if(!user.active){
            return res.status(403).json({error: "Tài khoản của bạn đã bị khóa"});
        }

        const token = jwt.sign({id: user._id, username: user.username}, config.secret, {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: 86400 // 24 hours
        })
        var authorities = user.roles.map((role) => 'ROLE_' + role.name.toUpperCase())

        res.status(200).send({
            id: user._id,
            username: user.username,
            email: user.email,
            name : user.name,
            roles: authorities,
            accessToken : token,
            deposit : user.auction_deposit,
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({error: "Internal Server Error"});
    }
}

exports.adminSignin = (req, res) => {
    User.findOne({
        email: req.body.email
    })
        .populate('roles', '-__v')
        .then((user) => {
            if (!user || user.roles[0].name !== 'admin') {
                return res.status(404).send({message: 'Email not found.'})
            }
            var passwordIsValid = bcrypt.compareSync(req.body.password, user.password)

            if (!passwordIsValid) {
                return res.status(401).send({
                    accessToken: null,
                    message: 'Invalid Password!'
                })
            }

            const token = jwt.sign({id: user.id}, config.secret, {
                algorithm: 'HS256',
                allowInsecureKeySizes: true,
                expiresIn: 86400 // 24 hours
            })

            var authorities = user.roles.map((role) => 'ROLE_' + role.name.toUpperCase())

            res.status(200).send({
                id: user._id,
                email: user.email,
                roles: authorities,
                accessToken: token
            })
        })
        .catch((err) => {
            res.status(500).send({message: err})
        })
}

exports.logout = (req, res) => {
    try {
        res.status(200).json({message: "Logged out successfully"});
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({error: "Internal Server Error 1"});
    }
};
