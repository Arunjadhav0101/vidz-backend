import { model, Schema } from "mongoose";
import mongooseAggregatePaginate  from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    videoFile:{
      type:String, // url 
      required:true, 
    },
    thumbnail:{
        type:String, // url 
        required:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        default:0,
    },
    isPublished:{
        type:Boolean,
        default:true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
}, {timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = model("Video", videoSchema)