const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    },
    name:{
        type:String,
        required:[true,'Title cannot be empty!'],
        trim:true,
        maxLength:[50,'Your title was too long, cannot exceed 50 characters!']
    },
    deadline:{
        type:String,
        validate:{
            validator:function(v){
                if(!v) return true;
                return ( (new Date(v)).getTime() > (new Date()).setHours(23,59,59,999) )
            },
            message: 'Please pick tomorrow onward date'
        },
        required:[true,'Deadline cannot be empty!']
    },
    target:{
        type:Number,
        min:[0.01,'Target must be more than 0'],
        max:[100000000000, 'Your target is too big!'],
        required:[true,'Target cannot be empty!'],
    },
    category:{
        type:String,
        enum:{
            values:['short','middle','long'],
            message:'Please select between "short", "middle", "long"!'
        },
        required:[true,'Category cannot be empty!']
    },
    type:{
        type:String,
        enum:{
            values:['wallet', 'airplane', 'lightning-charge', 'cup-hot', 'car-front', 'gift', 'house', 'mortarboard', 'laptop', 'heart-pulse'],
            message: "Invalid type!"
        },
        default:"wallet",
        required:[true,'Type cannot be empty!']
    },
    saved:{
        type:Number,
        min:[0,'Amount saved become negative!'],
        max:[100000000000, 'Your target are too big!'],
        required:[true,'Target cannot be empty!'],
        default:0.00
    }
},
{
    timestamps: true
});

const Goal = mongoose.model('Goal',goalSchema);
module.exports = Goal;

