const mongoose = require('mongoose')


const movieSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true 
    },
    price: {
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
    }
})


module.exports = mongoose.model("Movie" , movieSchema)