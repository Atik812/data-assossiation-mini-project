const express = require('express')
const app = express()
const path = require('path')
const User = require('./models/users')
const Post = require("./models/post")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const upload = require("./config/multerconfig")

app.use(express.json())
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


app.get('/', (req, res) => {
    res.render('index')
})

app.post('/register', async (req, res) => {
    let { name, username, email, password, Age } = req.body;
    let user = await User.findOne({ email })
    if (user) return res.status(500).send("user already registerd")
    bcrypt.genSalt(10, (error, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await User.create({
                name,
                email,
                Age,
                username,
                password: hash,

            })
            let token = jwt.sign({ email: email, user: user._id }, "secret")
            res.cookie("token", token)
            res.send("you have registered")
        })
    })


})


app.get('/login',(req,res)=>{
    res.render('login')
})

app.post('/login',async(req,res)=>{
    let {password, email} = req.body;
    let user = await User.findOne({email:email})
    if(!user) return res.status(500).send("Something went wrong");
    bcrypt.compare(password,user.password,function(err,result){
        if(result){
            let token = jwt.sign({email:email,user:user._id},"secret")
            res.cookie("token",token);
            res.status(200).redirect('/profile')
        }
        else{
            res.redirect('/login')
        }
    })

})

app.get('/profile', islogedin ,async(req,res)=>{
    
 let user = await User.findOne({email:req.user.email}).populate('posts')
  res.render("profile",{user})
})

function islogedin(req,res,next){
    if(req.cookies.token === ""){ res.redirect('/login')
    } else{
   let data = jwt.verify(req.cookies.token,"secret")
   req.user = data;
   next()
  }
}

app.get('/logout',(req,res)=>{
    res.cookie("token","")
    res.redirect('/login')
})

app.post('/post', islogedin ,async(req,res)=>{
    let user = await User.findOne({email:req.user.email})
    let {content} = req.body;
    let post = await Post.create({
        user:user._id,
        content
    })
    user.posts.push(post._id)
    await user.save();
    res.redirect('/profile')
})

app.get('/edit/:id', islogedin,async(req,res)=>{
  let post = await Post.findOne({_id:req.params.id}).populate('user')
    res.render('edit',{post})
})

app.post('/update/:id', islogedin,async(req,res)=>{
   let post = await Post.findOneAndUpdate({_id:req.params._id},{content:req.body.content})
   res.redirect('/profile')

})


app.get('/delete/:id', islogedin,async(req,res)=>{
 let deleted = await Post.findOneAndDelete({_id:req.params.id})
 res.redirect('/profile')
})

app.get('/like/:id',islogedin, async (req,res) => {
    let post = await Post.findOne({_id:req.params.id}).populate('user')

    if (!post.likes) {
        post.likes = [];
    }

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid)
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid),1)
    }
     await post.save();
     res.redirect('/profile')
})

app.get('/profile/upload',(req,res)=>{
    res.render('profileupload')
})

app.post('/upload',islogedin, upload.single('image'),async (req,res)=>{
  let user = await User.findOne({email:req.user.email})
  user.profilepic = req.file.filename
  await user.save()
  res.redirect('/profile')
})

app.listen(3000, () => {
    console.log("server is rendering")
})