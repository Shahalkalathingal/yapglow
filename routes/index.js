var express = require('express');
var router = express.Router();
const bcryptjs = require('bcryptjs')
const User = require('../models/UserModel')
const {v4:uuidv4} = require('uuid');
var ObjectId = require('mongoose').Types.ObjectId;
const axios = require('axios');
const Comment = require('../models/CommentModel')
const {ws} = require('../app')

const isLoggedIn = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next()
  } else {
    res.redirect('/account/login')
  }
}

const isNotLoggedIn = (req,res,next) => {
  if(req.session.isLoggedIn){
    res.redirect('/')
  }else{
    next()
  }
}

function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/.test(url);
}

/* GET home page. */
router.get('/',async(req,res)=>{
 let lives = []
let  livesLength = false
 let allLives = []
 const response = await axios.get(`${process.env.MEDIA_SERVER_HTTP}/api/streams`)
 
 
 if(req.session.isLoggedIn){
   if(!response.data.live || !response.data || response.data === {}){
     return res.render('index', { title: 'Home | YAPGLOW' ,user:true,lives});
    }

  allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
   
  allLives =  await Promise.all(allLives.map(async live=>{
    let streamkey = Object.keys(live)[0]
    let id = streamkey.substring(37)
    if(ObjectId.isValid(id)){
      let user = await User.findOne({_id:id})
      if(user || user != null){
        



        return {
          username:user.username,
          link:`/live/${user.username}`,
          thumbnail:user.image,
          none:false,
          bytes:live[streamkey].publisher.bytes

        }
      }else{
        return {none:true}
      }
    }else{
      return {none:true}
    }
   
   })) 
lives = await Promise.all(allLives.filter(async(live)=>{
  if(live.none != true){
    return live 
  }
}))


  
    
    if(lives.length > 6){
      livesLength = true
    }

    res.render('index', { title: 'Home | YAPGLOW' ,user:true,lives,livesLength});
  }else{
    if(!response.data.live || !response.data || response.data === {}){
      return res.render('index', { title: 'Home | YAPGLOW' ,lives});
     }
 
   allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
    
   allLives =  await Promise.all(allLives.map(async live=>{
     let streamkey = Object.keys(live)[0]
     let id = streamkey.substring(37)
     if(ObjectId.isValid(id)){
       let user = await User.findOne({_id:id})
       if(user || user != null){
         
 
 
 
         return {
           username:user.username,
           link:`/live/${user.username}`,
           thumbnail:user.image,
           none:false
         }
       }else{
         return {none:true}
       }
     }else{
       return {none:true}
     }
    
    })) 
 lives = await Promise.all(allLives.filter((live)=>{
   if(live.none != true){
     return live
   }
 }))
    
 if(lives.length > 6){
  livesLength = true
}
     
     
 
     res.render('index', { title: 'Home | YAPGLOW' ,lives,livesLength});

  }
})
router.get('/account/logout',async(req,res)=>{
  req.session.user = undefined
  req.session.isLoggedIn = undefined
  res.redirect('/')
})


router.get('/live/:id',isLoggedIn,async function (req, res, next) {
  const user = await User.findOne({username:req.params.id})
  let views
  if(!user || user === null){
    return res.redirect('/')

  }
  const video = {
   source:`${process.env.MEDIA_SERVER_HTTP}/live/${user.streamkey}`,
   views,
   username:user.username,
   _id:user._id
  }
  const response = await axios.get(`${process.env.MEDIA_SERVER_HTTP}/api/streams`)
  if(response.data && response.data.live){
    const lives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  

let live = lives.find((data)=>{
  let streamkey = Object.keys(data)[0]
  if(streamkey === user.streamkey){
    if(data[streamkey].publisher != null){
      return data
    }
  }

})

if(!live || live === undefined || live === null){
  await Comment.deleteMany({user:user._id})
return res.redirect('/')
}
video.views = live[user.streamkey].subscribers.length
    
  }else{
    await Comment.deleteMany({user:user._id})
   return res.redirect('/')
  }


  res.render('videopage', { title: 'Live | YAPGLOW',user:true,video });
});

router.get('/account/login',isNotLoggedIn, function (req, res, next) {
  res.render('account/login', { title: 'Login | YAPGLOW' });
});

router.get('/account/register',isNotLoggedIn, function (req, res, next) {
  res.render('account/register', { title: 'Register | YAPGLOW' });
});


router.post('/account/login',isNotLoggedIn,async function (req, res, next) {
try {
  if (!req.body || !req.body.email || !req.body.password) {
    return res.render('account/login', { title: 'Login | YAPGLOW',msg:"Please enter all fields" , value:req.body});
  }
  const {  email,  password } = req.body
  const user = await User.findOne({ email: email })
  if(user === null){
    return res.render('account/login', { title: 'Login | YAPGLOW',msg:"No Account with this email" , value:req.body});
  }
  const isMatch = await bcryptjs.compare(password, user.password)
  if (!isMatch) {
    return res.render('account/login', { title: 'Login | YAPGLOW',msg:"Invalid Password" , value:req.body});
  }

  req.session.user = user
  req.session.isLoggedIn = true
  res.redirect('/')

} catch (error) {
  console.log(error);
}
});

router.post('/account/register',isNotLoggedIn, async function (req, res, next) {
  const { name, username, email, password, con_password, terms } = req.body;
  
  try {
    if (!email || !name || !username || !con_password || !password ) {
      return res.render('account/register', { title: 'Register | YAPGLOW', msg: "Please add all fields" ,value:req.body})
    }
    if (terms != 'on') {
      return res.render('account/register', { title: 'Register | YAPGLOW', msg: "Please accept terms & conditions" ,value:req.body })
    }
   

    if (password.length < 8) {
      return res.render('account/register', { title: 'Register | YAPGLOW', msg: "Password need at least 8 characters long" ,value:req.body})
    }

    if (password != con_password) {
      return res.render('account/register', { title: 'Register | YAPGLOW', msg: "Password do not match",value:req.body })
    }

    if (!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
      return res.render('account/register', { title: 'Register | YAPGLOW', msg: "Please enter a valid email",value:req.body })
    }
    const hashed = await bcryptjs.hash(password, 10)
    
    const NewUser = new User({
      email,
      password: hashed,
      username,
      name,
      streamkey:"none"
    })
    
    NewUser.save(async (err, user) => {
      if (err) {
        if (err.name === 'MongoServerError' && err.code === 11000) {

          return res.render('account/register', { title: 'Register | YAPGLOW', msg: `Either Email or Username is already taken` ,value:req.body})
          
        }
      }
      const streamkey = `${uuidv4()}-${user._id}`
      await User.updateOne({_id:user._id},{streamkey})
      const isMatch = await bcryptjs.compare(password, user.password)
      if (!isMatch) {
        return res.render('account/register', { title: 'Register | YAPGLOW', msg: `Invalid Password`,value:req.body })
      }

      req.session.user = user
      req.session.isLoggedIn = true

      res.redirect('/');
    })



  } catch(error) {
    return res.render('account/register', { title: 'Register | YAPGLOW', msg: error.message })
  }
});


router.get('/account/profile',isLoggedIn,async function (req, res, next) {

  const _id = req.session.user._id
  const userDet = await User.findOne({_id:_id}).populate('favorites')
  let category
  if(userDet.category === 'none' || !userDet.category){
    category = {
      none:true
    }}else if(userDet.category === 'vloging/gaming'){
    category = {
      vloging:true
    }
  }else if(userDet.category === 'music/live'){
    category = {
      music:true
    }
  }else if(userDet.category === 'hangout/dating'){
    category = {
      hangout:true
    }
  }else if(userDet.category === 'concert/festival'){
    category = {
      concert:true
    }
  }else if(userDet.category === 'lgbt'){
    category = {
      lgbt:true
    }
  }

  let lives = []
 let allLives = []
 const response = await axios.get(`${process.env.MEDIA_SERVER_HTTP}/api/streams`)
 
 
 
   if(!response.data.live || !response.data || response.data === {}){
     return res.render('account/profile', { title: 'Profile | YAPGLOW' ,lives,user:true,userDetails:userDet,category,});
    }

  allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
   
  allLives =  await Promise.all(allLives.map(async live=>{
    let streamkey = Object.keys(live)[0]
    let id = streamkey.substring(37)
    if(ObjectId.isValid(id)){
      let user = await User.findOne({_id:id})
      if(user || user != null){



        return {
          username:user.username,
          link:`/live/${user.username}`,
          thumbnail:user.image,
          none:false,
          streamkey
        }
      }else{
        return {none:true}
      }
    }else{
      return {none:true}
    }
   
   })) 
lives = await Promise.all(allLives.map(async(live)=>{
  if(live.none != true){
    let okay = false
    lives = await Promise.all(userDet.favorites.filter((fav)=>{
      if(fav.streamkey === live.streamkey){
        okay = true
      } 
    }))
    if(okay){
      return live
    }else{
      return {none:true}
    }
  }
}))

lives = await Promise.all(lives.filter((live)=>{
  if(live.none != true){
    return live
  }
}))

   
  
  

    
  

  res.render('account/profile', { title: 'Profile | YAPGLOW',user:true,userDetails:userDet,category,lives});
});

router.get('/account/edit-profile',isLoggedIn,async(req,res)=>{
  const _id = req.session.user._id
  const user = await User.findOne({_id:_id})
  let category
  if(user.category === 'none' || !user.category){
    category = {
      none:true
    }}else if(user.category === 'vloging/gaming'){
    category = {
      vloging:true
    }
  }else if(user.category === 'music/live'){
    category = {
      music:true
    }
  }else if(user.category === 'hangout/dating'){
    category = {
      hangout:true
    }
  }else if(user.category === 'concert/festival'){
    category = {
      concert:true
    }
  }else if(user.category === 'lgbt'){
    category = {
      lgbt:true
    }
  }
  res.render('account/edit-profile', { title: 'Edit Profile | YAPGLOW',user:true,userDetails:user,category});

})

router.post('/account/edit-profile',isLoggedIn,async(req,res)=>{
  let {name,username,bio,image,category,old_password,new_password,email} = req.body
  let categoryVar
  if(category === 'none' || !category){
    categoryVar = {
      none:true
    }}else if(category === 'vloging/gaming'){
      categoryVar = {
      vloging:true
    }
  }else if(category === 'music/live'){
    categoryVar = {
      music:true
    }
  }else if(category === 'hangout/dating'){
    categoryVar = {
      hangout:true
    }
  }else if(category === 'concert/festival'){
    categoryVar = {
      concert:true
    }
  }else if(category === 'lgbt'){
    categoryVar = {
      lgbt:true
    }
  }
  if(!name || !username){
    return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Please add all required fields",userDetails:req.body,category:categoryVar})
  }
  if(image && !isImage(image)){
    return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Image type is not supported",userDetails:req.body,category:categoryVar})
  }
  
  
  if(category === 'none'){
    category = ''
  }
  const user = await User.findOne({_id:req.session.user._id})

  if(old_password && new_password){
    
    const isMatch = await bcryptjs.compare(old_password, user.password)
  if (!isMatch) {
    return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Old Password is wrong",userDetails:req.body,category:categoryVar})
  }

  if (new_password.length < 8) {
    return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Password need atleast 8 chars long",userDetails:req.body,category:categoryVar})
  }
  if(old_password === new_password){
    return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Please use another password",userDetails:req.body,category:categoryVar})
  }

  const password = await bcryptjs.hash(new_password, 10)

  try {
    await User.findOneAndUpdate({_id:req.session.user._id},{
      name,username,bio,image,category,password
    })
    res.redirect('/account/profile')
  } catch (err) {
    if (err) {
      if (err.name === 'MongoServerError' && err.code === 11000) {

        return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Username is already taken",userDetails:req.body,category:categoryVar})
        
      }
    }
  }


  }else{
    try {
      
      await User.findOneAndUpdate({_id:req.session.user._id},{
        name,username,bio,image,category
      })
      res.redirect('/account/profile')
    } catch (err) {
      if (err) {
        if (err.name === 'MongoServerError' && err.code === 11000) {
  
          return res.render('account/edit-profile',{title: 'Edit Profile | YAPGLOW',user:true,msg:"Username is already taken",userDetails:req.body,category:categoryVar})
          
        }
      }
    }
  }
  

  
})

router.get('/category/:id',async function (req, res, next) {
  let lives = []
let  livesLength = false
 let allLives = []
 const response = await axios.get(`${process.env.MEDIA_SERVER_HTTP}/api/streams`)
 
 
 if(req.session.isLoggedIn){
   if(!response.data.live || !response.data || response.data === {}){

     return res.render('index', { title: 'Category | YAPGLOW' ,user:true,category:true});
    }

  allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
   
  allLives =  await Promise.all(allLives.map(async live=>{
    let streamkey = Object.keys(live)[0]
    let id = streamkey.substring(37)
    if(ObjectId.isValid(id)){
      let user = await User.findOne({_id:id})
      if(user || user != null){



        return {
          username:user.username,
          link:`/live/${user.username}`,
          thumbnail:user.image,
          none:false,
          category:user.category,
        }
      }else{
        return {none:true}
      }
    }else{
      return {none:true}
    }
   
   })) 
   let category = ""
lives = await Promise.all(allLives.filter((live)=>{
  if(live.none != true){
    if(live.category){
      live.category = live.category.split("/").shift()
      let paramsId = req.params.id.split("-").shift()
      if(live.category === paramsId){
       return live
      }
    }
      
    
  }
}))
  
    
    if(lives.length > 6){
      livesLength = true
    }
    category = req.params.id.replace('-','/')

    res.render('index', { title: 'Category | YAPGLOW' ,user:true,lives,livesLength,category:true,cateGory:category});
  }else{
    if(!response.data.live || !response.data || response.data === {}){
      return res.render('index', { title: 'Category | YAPGLOW' ,lives,category:true});
     }
 
   allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
    
   allLives =  await Promise.all(allLives.map(async live=>{
     let streamkey = Object.keys(live)[0]
     let id = streamkey.substring(37)
     if(ObjectId.isValid(id)){
       let user = await User.findOne({_id:id})
       if(user || user != null){
         
 
 
 
         return {
           username:user.username,
           link:`/live/${user.username}`,
           thumbnail:user.image,
           none:false,
           category:user.category
         }
       }else{
         return {none:true}
       }
     }else{
       return {none:true}
     }
    
    })) 
 lives = await Promise.all(allLives.filter((live)=>{
  if(live.category.length === req.params.id.length){
    return live
  }
 }))
 
    
 if(lives.length > 6){
  livesLength = true
}
     
     
 
     res.render('index', { title: 'Category | YAPGLOW' ,lives,livesLength,category:true});

  }

});

router.get('/about', function (req, res, next) {
  if(req.session.isLoggedIn){

    res.render('static/about', {user:true, title: 'About | YAPGLOW' });
  }else{
    res.render('static/about', { title: 'About | YAPGLOW' });
  }
});

router.get('/terms', function (req, res, next) {
  if(req.session.isLoggedIn){

    res.render('static/terms', {user:true, title: 'Terms & Conditions | YAPGLOW' });
  }else{
    res.render('static/terms', { title: 'Terms & Conditions | YAPGLOW' });
  }
});



router.get('/golive',isLoggedIn,async(req,res)=>{
  const user = await User.findOne({_id:req.session.user._id})
  res.render('golive',{title: 'Go live | YAPGLOW',user:true,userDetails:user,server:process.env.MEDIA_SERVER,video:{_id:user._id} })


})

router.get('/favorites/remove/:id',isLoggedIn,async(req,res)=>{
  if(!ObjectId.isValid(req.params.id)){
    return res.redirect('/account/profile')
  }
  const _id = ObjectId(req.params.id)
  const userid = req.session.user._id
  await User.updateOne({_id:userid},{$pull:{
    favorites:_id
  }})
  await User.updateOne({_id},{$pull:{
    loved:userid
  }})
  
  res.redirect('/account/profile')
})

router.get('/favorites/removes/:id',isLoggedIn,async(req,res)=>{
  if(!ObjectId.isValid(req.params.id)){
    return res.redirect('/account/profile')
  }
  const _id = ObjectId(req.params.id)
  const userid = req.session.user._id
  await User.updateOne({_id:userid},{$pull:{
    favorites:_id
  }})
  await User.updateOne({_id},{$pull:{
    loved:userid
  }})
  
  res.json({status:true})
})

router.get('/favorites/check/:id',isLoggedIn,async(req,res)=>{

  const user = await User.findOne({_id:req.session.user._id}).populate('favorites')
  
  let Liked = false;
  if(!user || user === null || user === undefined){
    return res.json({status:false})
  }
  if(user.username === req.params.id){
    return res.json({status:false})
  }
  user.favorites.forEach(async fav => {
    if(fav.username === req.params.id){
      Liked = true
    }
  });
  if(Liked){

    res.json({status:true})
  }else{
    res.json({status:false})

  }
})

router.get('/favorites/add/:id',isLoggedIn,async(req,res)=>{
  const user = await User.findOne({_id:req.session.user._id}).populate('favorites')
  let liked = false

  user.favorites.forEach(async fav => {
    if(fav.username === req.params.id){
      liked = true
    }
  });
 if(liked){
  return res.json({status:false})
 }
 let userDet = await User.findOne({username:req.params.id})
let userid = user._id
let _id = userDet._id
if(user.username === userDet.username){
  return res.json({status:false})
}

 await User.updateOne({_id:userid},{$push:{
  favorites:_id
}})
await User.updateOne({_id},{$push:{
  loved:userid
}})
 res.json({status:true})

 
})

router.get('/comments/check/:id',isLoggedIn,async(req,res)=>{
  if(!ObjectId.isValid(req.params.id)){
    return res.json({status:false})
  }
  let user = await User.findOne({_id:req.params.id})
  let lives = []
   let allLives = []
   const response = await axios.get(`${process.env.MEDIA_SERVER_HTTP}/api/streams`)
   let live
     if(!response.data.live || !response.data || response.data === {}){
       await Comment.deleteMany({user:req.params.id})
      return res.json({status:false})
      }
  
    allLives = Object.entries(response.data.live).map((e) => ( { [e[0]]: e[1] } ))  
     
    allLives =  await Promise.all(allLives.map(async live=>{
      let streamkey = Object.keys(live)[0]
      let id = streamkey.substring(37)
      if(ObjectId.isValid(id)){
        let user = await User.findOne({_id:id})
        if(user || user != null){
          let views = live[streamkey].subscribers.length
  
  
  
          return {
            username:user.username,
            link:`/live/${user.username}`,
            thumbnail:user.image,
            none:false,
            views

          }
        }else{
          return {none:true}
        }
      }else{
        return {none:true}
      }
     
     })) 
     lives = await Promise.all(allLives.filter(async(live)=>{
       if(live.none != true){
         return live 
        }
      }))
      
  live = await lives.find((x)=>{
    if(user){
      if(x.username === user.username){
        return x
      }
    }
    
  })

  
  if(!live){
    await Comment.deleteMany({user:req.params.id})
    return res.json({status:false})
  }

    
  
 
  let comments = await Comment.find({user:user._id})
  res.json({status:true,comments,views:live.views})
  
})


router.get('/comments/add/:id',isLoggedIn,async(req,res)=>{
  if(!ObjectId.isValid(req.params.id)){
    return res.json({status:false})
  }
  
  let isSelf = false
  let text = req.query.text
  if(text === '' || text === null || text === undefined){
    return res.json({status:false})
  }
  let username = req.session.user.username
  let user = await User.findOne({_id:req.params.id})
  let streamkey = user.streamkey
  const liveUser = req.params.id.toString()
  const commentUser = req.session.user._id.toString()

  if(liveUser === commentUser){
    isSelf = true
  }
if(user){
  await Comment.create({
    isSelf,
    text,
    user:user._id,
    username,
    streamkey
  })
  

  let comments = await Comment.find({user:user._id})
  res.json({status:true,comments})

}
})



module.exports = router;
