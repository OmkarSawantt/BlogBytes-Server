const Post=require('../models/postModel')
const User=require('../models/userModel')
const fs=require('fs')
const path=require('path')
const {v4:uuid}=require("uuid")
const HttpError = require("../models/errorModel")

//CreatePost  Post:api/posts   protected
const createPost = async(req,res,next)=>{
    try {
        let {title,category,description}=req.body;
        if(!title || !category || !description || !req.files){
            return next(new HttpError("Fill in all fields and choose thubnail",422));
        }
        const {thumbnail}=req.files
        if(thumbnail.size>2000000){
            return next(new HttpError("Thumbnail is too big.It should be less than 2 mb "))
        }
        let fileName=thumbnail.name; 
        let splittedFilename=fileName.split('.')
        let newFilename=splittedFilename[0]+uuid()+'.'+splittedFilename[splittedFilename.length-1]
                const newPost=await Post.create({title,category,description,thumbnail:newFilename,creator:req.user.id})
                if(!newPost){
                    return next(new HttpError("Post couldn't be created.",422))
                }
                const currentUser=await User.findById(req.user.id);
                const userPostCount=currentUser.posts+1;
                await User.findByIdAndUpdate(req.user.id,{posts:userPostCount})

                res.status(201).json(newPost)
            

        
    } catch (error) {
        return next(new HttpError(error))
    }
}

//GetPosts  Get:api/posts   Unprotected
const getPosts = async(req,res,next)=>{
    try {
        const posts=await Post.find().sort({updateAt:-1})
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}

//Get Single Post  Get:api/posts/:id   Unprotected
const getPost = async(req,res,next)=>{
    try {
        const  postId=req.params.id;
        const post=await Post.findById(postId);
        if(!post){
            return next(new HttpError("Post not found"))
        } 
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error))
    }
}
//Get post by category  get:api/posts/categories/:category   unprotected
const getCatPosts = async(req,res,next)=>{
    try {
        const{category}=req.params;
        const catPosts=await Post.find({category}).sort({createdAt:-1})
        res.status(200).json(catPosts);
    } catch (error) {
        return next(new HttpError(error))
    }
}

//Get author posts  get:api/posts/users/:id   protected
const getUserPosts = async(req,res,next)=>{
    try {
        const{id}=req.params;
        const posts=await Post.find({creator:id}).sort({createdAt:-1})
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error))
    }

}

//Edit Post  patch:api/posts/:id   protected
const editPost = async(req,res,next)=>{
    try {
        let fileName;
        let newFilename;
        let updatedPost;
        const postId=req.params.id;
        let {title,category,description}=req.body;
        if(!title || !category || !description){
            return next(new HttpError("Fill in all fields",422))
        }
        const oldPost=await Post.findById(postId);
        if(req.user.id==oldPost.creator){

            if(!req.files){
                updatedPost=await Post.findByIdAndUpdate(postId,{title,category,description},{new:true})
        }else{
            const {thumbnail}=req.files;
            if(thumbnail.size>2000000){
                return next(new HttpError("Thumbnail is too big.It should be less than 2 mb "))
            }
            fileName=thumbnail.name;                
            let splittedFilename=fileName.split('.')
            newFilename=splittedFilename[0]+uuid()+'.'+splittedFilename[splittedFilename.length-1]
            updatedPost=await Post.findByIdAndUpdate(postId,{title,category,description,thumbnail:newFilename},{new:true})
        }
            if(!updatedPost){
                return next(new HttpError("Couldn't update post ",400))
            }
            res.status(200).json(updatedPost)
        }
    } catch (error) {
        return next(new HttpError(error))
    }
}

//Delete Post  Delete:api/posts/:id   protected
const deletePost = async(req,res,next)=>{
    try {
        const postId=req.params.id;
        if(!postId){
            return next(new HttpError("Post Unavailable",400))
        }
        const post=await Post.findById(postId);
        const fileName=post?.thumbnail;
        if (req.user.id==post.creator){
            await Post.findByIdAndDelete(postId);
            const currentUser=await User.findById(req.user.id);
            const userPostCount=currentUser?.posts-1;
            await User.findByIdAndUpdate(req.user.id,{posts:userPostCount})
            res.json(fileName)
        }else{
          return next(new HttpError("Post couldn't be deleted",403))
        }
    } catch (error) {
        return next(new HttpError(error))
    }
}

const searchSugestion = async(req,res,next)=>{
    try{
        const posts = await Post.find().select('title');
        const titles = posts.map(post => post.title);
        res.json(titles);
    }catch(error){
        return next(new HttpError(error))
    }
}

const searchResult = async(req,res,next)=>{
    try{
        const {text}=req.body;
        if (/^ $/.test(text)) {
            return res.status(400).json({ error: 'Invalid input. Cannot be empty or only spaces.' });
        }
        const posts = await Post.find({ title: { $regex: text, $options: 'i' } }).sort({ createdAt: -1 });
        res.json(posts);
    }catch(error){
        return next(new HttpError(error))
    }
}
module.exports={createPost,getPosts,getPost,getCatPosts,getUserPosts,editPost,deletePost,searchSugestion,searchResult}