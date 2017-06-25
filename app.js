// Load modules
var path = require('path'), // core
    express = require('express'),
    bodyParser = require('body-parser'),
    bcrypt = require("bcrypt"),
    fs = require("fs"),

    multer = require("multer"),
    upload = multer({
      dest: 'public/profilepics/',
      limits: {
        fieldSize: '2MB',
      },
    })

    // myConnection = require('express-myconnection'),
    login = require("./router/loggin"),
    application = require("./router/application"),
    admin = require("./router/admin"),
    AppTools = require("./tools/app-tools"),

    app = express(),
    server = require("http").Server(app),
    io = require("socket.io")(server),

    session = require("express-session")({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: true,
    }),
    sharedsession = require("express-socket.io-session"),

    mysql = require('mysql'),
    pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'datingsite'
    })

// mysql.connection(function)
app.use(session)

io.use(sharedsession(session, {
    autoSave:true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('public'))


app.get('/', function(req, res) {
  if (!req.session.ID) {
    res.render("index", {title: "Home"})
  } else if(req.session.admin) {
    res.redirect("/die/admin")
  } else {
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      connection.query(`SELECT users.*, users.profilePic, voorkeur.haatLiefde, voorkeur.antwoord
        FROM users INNER JOIN voorkeur ON users.ID = voorkeur.userID WHERE users.ID = ?`, req.session.ID, function(err, result){
        if (err) console.log(err)
        // console.log(result)

        if (result[0].zoekende == 0) {
          res.render("dashboard", {
            title: "Dashboard",
            loggedin: true,
            naam: result[0].voornaam,
            profilePic: result[0].profilePic,
            matches: [],
            notSearching: true,
          })
          connection.release()
          return
        }

        let liefdeArr = result[0].antwoord.split(","),
        haatArr = result[1].antwoord.split(","),

        liefdeQuery = AppTools.transformPreference(liefdeArr),
        haatQuery = AppTools.transformPreference(haatArr)

        // console.log(liefdeQuery);
        // console.log(haatQuery);

        // http://stackoverflow.com/questions/322839/mysql-count-matching-words
        // Word count functie
        connection.query(`SELECT users.*, voorkeur.haatLiefde, voorkeur.antwoord,
          (((`+liefdeQuery+`) / (substrCount(voorkeur.antwoord, ',') + 1)) >= ?) AS lovepercentage,
          (((`+haatQuery+`) / (substrCount(voorkeur.antwoord, ',') + 1)) >= ?) AS hatepercentage,
          (DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), users.leeftijd)), "%Y")+0) AS age
          FROM users RIGHT JOIN voorkeur ON users.ID = voorkeur.userID WHERE voorkeur.userID != ?
          AND users.gender = ? AND users.valtOp = ? AND users.zoekende = 1`, [0.4, 0.4, req.session.ID, result[0].valtOp, result[0].gender], function(err, results){
          if (err) console.log(err)

          for (let i = results.length-1; 0 < i; i -= 2)
            if (results[(i - 1)].lovepercentage != 1 || results[i].hatepercentage != 1) results.splice((i - 1), 2)

          results = AppTools.combineAnswers(results)

          results = AppTools.getMatchingWords(results, liefdeArr, haatArr)

          // console.log(results);

          if (req.query.first == "true") res.locals.first = true

          connection.release()

          res.render("dashboard", {
            title: "Dashboard",
            loggedin: true,
            naam: result[0].voornaam,
            profilePic: result[0].profilePic,
            matches: results
          })
        })

      })
    })
  }
})

app.post("/", function(req, res){
  let ik = req.body.ik,
  naar = req.body.voor;

  res.redirect("/account/registreren?ik="+ik+ "&naar="+naar+"");
});

app.use('/account', login)
app.use('/app', application)
app.use('/die/admin', admin)

app.get("/*", function(req, res) {
  res.redirect("/")
})



server.listen(3000, function(){
  console.log("Started on port 3000");
});


require("./router/socket")(io)
