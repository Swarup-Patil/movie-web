const mongoose = require('mongoose')

const favouriteSchema = new mongoose.Schema({
    userid:{
        type: String,
    },
    name:{
        type: String,
        required: true 
    },
    price:{
        type: String,
        required: true 
    },
    genre:{
        type: String, 
        required: true 
    },
    country:{
        type: String, 
        required: true 
    },
    year:{
        type: String, 
        required: true 
    },
    image: {
        type: String,
        required: true ,    
    },
    movieid:{
        type: String, 
        require: true,
    }
})

module.exports = mongoose.model("Favourite" , favouriteSchema)