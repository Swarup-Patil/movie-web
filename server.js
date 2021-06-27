require("dotenv").config()
const express = require('express')
const app = express()
const path = require('path')
const logger = require("morgan")
const mongoose = require("mongoose")
const session = require("express-session")
const bcrypt = require("bcrypt");
const multer = require('multer')
const Regex = require('regex')

//middleware
app.use(express.static(path.join(__dirname, "public")))
app.use(logger("dev"))
app.use(express.json());
app.use(express.urlencoded({ extended: false}))

//models
const User = require("./models/user")
const Movie = require("./models/movie")
const Favourite = require("./models/favourite")
const Cart = require("./models/cart")

//session
app.use(session({
    secret: process.env.SECRET ,
    resave: true ,
    saveUninitialized:true,
}))

//ejs
app.set("view-engine" , "ejs")

//dbconnect
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useFindAndModify: false, 
}).then(() => console.log("DB connected"))
  .catch(error => console.log(error))

//image storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
      cb(null, Date.now() + file.originalname);
    }
  });

const upload = multer({ storage: storage });

//signup get
app.get("/" , (req , res) =>{
    let message= null;
    res.render("signup.ejs" ,{ message: message })
})

//signup post
app.post("/signup" , async (req,res) => {
        try{
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                name : req.body.name,
                email : req.body.email,
                password : hashedPassword,
            })
            await user.save();
            res.redirect("/login")
        } catch{
            res.redirect("/")
        }  
})

//loginget
app.get("/login" , (req,res) => {
    let message = null
    res.render("login.ejs" ,{ message: message })
})

//login post
app.post("/signin" , async (req, res) =>{
    await User.find({ name: req.body.name}).then(data => {
        console.log(data)
        if(data == undefined){
            const message = "invalid username or password"
            res.render("login.ejs" , { message: message })   
        }
        const verified = bcrypt.compareSync(req.body.password, data[0].password);
        console.log(data[0].role)
        if(verified){
            if(data[0].role == "admin"){
                req.session.user = data[0]
                res.redirect("/adminpanel") 
            }
            else{
                req.session.user = data[0]
                res.redirect("/home")
            }
        }
        else{
            const message = "invalid username or password"
            res.render("login.ejs" , { message: message }) 
        }
    }).catch(e =>{
        console.log(e)
        res.send("Error")
    })
})

//get home
app.get("/home" , checkAuthentication ,async(req, res) =>{
    const movies = await Movie.find().sort('-year').limit(5)
    res.render("User/home.ejs" , {
        movies:movies
    })
})

//get movies
app.get("/movies" , checkAuthentication ,async (req,res) => {
    const latest = await Movie.find().sort({ _id: -1 }).limit(5)
    const action = await Movie.find({genre: "Action"}).sort({ _id: -1 }).limit(5)
    const fantasy = await Movie.find({genre: "Fantasy"}).sort({ _id: -1 }).limit(5)
    const horror = await Movie.find({genre: "Horror"}).sort({ _id: -1 }).limit(5)
    res.render("User/Movies.ejs" ,{
        latest:latest,
        action:action,
        fantasy:fantasy,
        horror:horror,
    })
})

app.get("/search" , checkAuthentication, (req, res) =>{
    movies = {}
    res.render("User/searched.ejs" , {
        movies:movies
    })
})

//search bar
app.post("/search" , async(req,res) =>{
    var nam = req.body.search
    console.log(nam)
    try{
    const regex = new RegExp(nam , 'i')
    Movie.find({name:regex}).then(result =>{
        res.render("User/searched.ejs" ,{movies:result})
    })
   } catch{
        res.send("failure")
   }
})

//get movie-info
app.get("/movie/:id" , checkAuthentication ,async(req, res) =>{
    const movie = await Movie.findById(req.params.id)
    const similar_movie = await Movie.find({genre : movie.genre})
    res.render("User/desktop2.ejs" , {movie:movie , similar_movie:similar_movie})
})

// add to favourite
app.post("/addtofavourite/:id" , upload.single('image'), async (req , res) => {
    const movie = await Movie.findById(req.params.id)
            const item = new Favourite({ 
                userid: req.session.user._id,
                movieid: movie._id,
                name: movie.name,
                price: movie.price,
                year: movie.year,
                country: movie.country,
                genre: movie.genre,
                image: movie.image,
            })
            item.save();
            res.redirect("/home")})

// get favourite page
app.get("/favourite", checkAuthentication ,async (req , res) => {  
    await Favourite.find({userid: req.session.user._id }).then(item =>{
        res.render("User/favourites.ejs" , {item:item})
    }).catch(error => {
        console.log(error)
        res.send("error")
    })
})

//delete favourite
app.post("/deletefav/:id", async (req , res) =>{
    await Favourite.findByIdAndDelete({_id: req.params.id}).then(result =>{
        if(result){
            res.redirect("/favourite")
        }
    }).catch(e => {
        res.send("error in catch")
    })
})

// add to cart
app.post("/addtocart/:id" , upload.single('image'), async (req , res) => {
    await Movie.findById(req.params.id).then(movie => {
        try{
            const item = new Cart({ 
                userid: req.session.user._id,
                movieid: movie._id,
                name: movie.name,
                price: movie.price,
                year: movie.year,
                country: movie.country,
                genre: movie.genre,
                image: movie.image,
            })
            item.save();
            console.log(item)
            res.redirect("/home")
    } catch (error){
        console.log(error)
        res.send("error")
    } 
  })
})

// get cart page
app.get("/cart", checkAuthentication ,async (req , res) => {  
    await Cart.find({userid: req.session.user._id }).then(order =>{
        let totalvalue=0
        for(i in order){
           totalvalue += Number(order[i].price)
        }
        console.log(totalvalue)
        res.render("User/cart.ejs" , {
            orders:order,
            total:totalvalue
        })
    }).catch(error => {
        console.log(error)
        
    })
})

//delete cart
app.post("/deletecart/:id", async (req , res) =>{
    await Cart.findByIdAndDelete({_id: req.params.id}).then(result =>{
        if(result){
            res.redirect("/cart")
        }
    }).catch(e => {
        res.send("error in catch")
    })
})

// ------------------------------- admin routes -------------------------------------- 

//get adminpanel
app.get("/adminpanel" , checkAuthentication,async (req,res) => {
    const movies = await Movie.find().sort({ _id: -1 })
    res.render("admin/adminhome.ejs" ,{
        movies:movies,
    })  
})

//get movie-info
app.get("/adminmovie/:id" , checkAuthentication ,async(req, res) =>{
    const movie = await Movie.findById(req.params.id)
    res.render("admin/adminmovie.ejs" , {movie:movie})
})

//get admin-add
app.get("/admin-add" , checkAuthentication ,(req,res) => {
    res.render("admin/admin-add.ejs")
})

//post add movie
app.post('/add', upload.single('image'), async (req, res, next) => {
    try{  
        const movie = new Movie ({
        name: req.body.moviename,
        price: req.body.price,
        year: req.body.year,
        country: req.body.country,
        genre: req.body.genre,
        image: req.file.filename
      }) 
        movie.save()
        res.redirect("/adminpanel")
    }catch(error){
        console.log(error)
    }    
})

//edit movie Get
app.get("/editmovie/:id" , checkAuthentication ,async (req, res) =>{
    await Movie.findById(req.params.id).then( movie => {
         console.log(movie)
         res.render("admin/update.ejs" , { movie: movie })  
        }).catch( e =>{
        console.log(e)
        res.send("error")
    })
})

//edit movie post
app.post("/update/:id" , async(req , res) =>{
    await Movie.findOneAndUpdate({_id: req.params.id}, {
        $set: {
            name: req.body.moviename,
            price: req.body.price,
            year: req.body.year,
            country: req.body.country,
            genre: req.body.genre,
        }
    }, { new:true }).then(result => {
        if(result){
            res.redirect("/adminpanel")
        }else{
            res.send("error")
        }
    }).catch(e => {
        res.send(e)
   })
})

//delete movie
app.post("/delete/:id" ,async (req , res) =>{
    await Movie.findByIdAndDelete({_id: req.params.id}).then(result =>{
        if(result){
            console.log(result)
            res.redirect("/adminpanel")
        }
    }).catch(e => {
        res.send("error in catch")
    })
})

//logout
app.post("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

function checkAuthentication(req, res, next) {
    if(req.session.user) {
        return next();
    } else {
        res.redirect("/")
    }
}

//listening on port
let port = process.env.PORT || 3000;
app.listen(port , () => {
    console.log("Listening on port")
})
