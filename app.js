var createError = require('http-errors');
const session = require('express-session')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const MongoDBStore = require('connect-mongodb-session');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var exphbs = require('express-handlebars')
const Handlebars = require('handlebars')
const mongoose = require('mongoose')
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access')
const dotenv = require('dotenv')
const child_process = require('child_process')
const mongoStore = MongoDBStore(session);
const WebSocket = require('ws')
dotenv.config()
const WS_PORT = 4000
const User = require('./models/UserModel')
const Comment = require('./models/CommentModel')
const ws = new WebSocket.Server({port:WS_PORT},()=>console.log(`WS server is listening at ws://localhost:${WS_PORT}`))
var app = express();

const store = new mongoStore({
  collection: "userSessions",
  uri: process.env.mongoURI,
  expires: 9999999999999,
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  store:store,
  cookie: { secure: true, maxAge: 9999999999999,httpOnly:true,secure:false },
  resave:false,
  name:'yapglow',
}))

let streamkey
let _id
app.get('/*',async(req,res,next)=>{
  if(req.session.user){
    const user = await User.findOne({_id:req.session.user._id})
    streamkey = user.streamkey
    _id = user._id
    next()
  }else{
    next()
  }
  
})

ws.on("connection",(socket)=>{
  console.log('New Connection :- ',_id)

  const ffmpeg = child_process.spawn('ffmpeg', [
    "-f",
    "lavfi",
    "-i",
    "anullsrc",
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-c:a",
    "aac",
    "-f",
    "flv",
    `rtmp://localhost/live/${streamkey}`
  ])
  

  ffmpeg.on('close', (code, signal) => {
    console.log('FFmpeg child process closed');
  });
  
  // ffmpeg.stdin.on('error', (e) => {
  //   console.log('FFmpeg STDIN Error', e);
  // });
  
  // ffmpeg.stderr.on('data', (data) => {
  //   console.log(`FFmpeg STDERR: ${_id}`, data.toString());
  // });
   
  socket.on('message', async(data) => {
    // console.log("got tracks");
    let string = data.toString()
    if(string === 'stop'){
      await Comment.deleteMany({user:_id})
     ffmpeg.kill()
     socket.terminate()
     socket.close()
    }else{
      ffmpeg.stdin.write(data)
    }
  });

  socket.on("close", async() => {
    await Comment.deleteMany({user:_id})
    console.log('live stopped :-  ',_id)
    ffmpeg.kill()
    
    socket.terminate()
   socket.close()
   });

  socket.on('error',async(err)=>{
    console.log("errorr............................");
  })
})




mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/yap-glow')
    .then(() => {
        console.log("Mongodb connected");
    })
    .catch(err => console.error(err))


// view engine setup
// Handlebars
app.engine(
  "hbs",
  exphbs.engine({
    helpers:{
      json: function(obj) {
        return JSON.stringify(obj);
      }
    },
    defaultLayout: "main",
    extname: "hbs",
    handlebars:allowInsecurePrototypeAccess(Handlebars)
  })
);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  if(req.session.isLoggedIn){
    res.render('error',{user:true,err});
  }else{
    res.render('error');

  }
});

module.exports = {app,ws};

