var express = require('express'),
router = express.Router(),
fs = require("fs"),
bcrypt = require("bcrypt"),
multer = require("multer"),
upload = multer({
  dest: 'public/profilepics/',
  limits: {
    fieldSize: '2MB',
  },
  // fileFilter: function(req, file, cb){
  //   if (file.mimetype !== 'image/png' && file.mimetye !== "image/jpeg") {
  //     req.fileValidationError = 'goes wrong on the mimetype';
  //     return cb(null, false, new Error('goes wrong on the mimetype'));
  //   }
  //   cb(null, true);
  // },
})

const saltRound = 10
const staticSalt = "ki12nu-/;1nd"


router.get("/", function(req, res){
  if (req.query.noMatch) res.locals.noMatch = true;
  res.render("loggin/login", {title: "Login"});
})

router.post("/", function(req, res){

  pool.getConnection(function(err, connection){
    if (err) console.log(err)

    connection.query('SELECT * FROM users WHERE email = ? AND role = 0', req.body.email, function(err, result){
      if (err) console.log(err)

      console.log(result)

      if (result.length == 0) {
        res.redirect("/account?noMatch=true")
        return
      }

      console.log("password")
      console.log(req.body.password + staticSalt)
      console.log(result[0].password)

      bcrypt.compare(req.body.password + staticSalt, result[0].password, function(err, response){
        if (err) console.log(err)

        console.log(response)

        connection.release()

        if (response) {
          req.session.ID = result[0].ID
          res.redirect("/")
        } else {
          res.redirect("/account")
        }

      })
    })
  })
})

router.get("/registreren", function(req, res){
  let ik = req.query.ik,
  naar = req.query.naar

  console.log(ik);
  console.log(naar);

  res.render("loggin/registreren", {ik: ik, naar: naar, title: "Registreren"})
})

router.post("/registreren", upload.single('profilepic'), function(req, res){
  console.log(req.body);
  console.log(req.file);

  let imgI = 0,
  reload = false,
  reloadObj = {
    ik: req.body.ik,
    naar: req.body.voor,
    title: "Registreren",
  },
  BDay = +new Date(req.body.birthdate),
  age = ~~ ((Date.now() - BDay) / (31557600000))

  while(fs.existsSync(req.file.destination + imgI + req.file.originalname))
    imgI++

  fs.rename(req.file.destination + req.file.filename, req.file.destination + imgI + req.file.originalname, function(err){
    if (err) console.log(err);
    console.log("rename succesfull");
  })

  // http://stackoverflow.com/questions/21336881/how-to-get-the-age-from-input-type-date-using-html-js
  if (age < 18) {
    reload = true
    reloadObj.niet18 = true
  }
  if (req.body.password != req.body.passwordAgain) {
    reload = true
    reloadObj.passwordMatchError = true
  }
  if (req.body.password.length < 7) {
    reload = true
    reloadObj.teKort = true
  }
  if (reload) {
    res.render("loggin/registreren", reloadObj)
    return
  }

  var body = {
    email: req.body.email,
    voornaam: req.body.name,
    achternaam: req.body.surname,
    password: req.body.password + staticSalt,
    profilePic: imgI + req.file.originalname,
    gender: req.body.ik,
    valtOp: req.body.voor,
    location: req.body.location,
    distance: req.body.distance,
    leeftijdVan: req.body.beginAge,
    leeftijdTot: req.body.eindAge,
    leeftijd: req.body.birthdate,
    role: 0,
    zoekende: 1,
  }
  req.body.insertion ? body.tussen = req.body.insertion : ""
  req.body.profilePic ? body.profilePic = req.body.profilePic : ""

  console.log(body);

  bcrypt.genSalt(saltRound, function(err, salt) {
    if (err) console.log(err)
    body.salt = salt
    console.log(salt)
    bcrypt.hash(body.password, salt, function(err, hash) {
      if (err) console.log(err)
      console.log(hash)

      body.password = hash

      console.log(body);

      pool.getConnection(function(err, connection){
        if (err) console.log(err)

        connection.query('INSERT INTO users set ?, registreerdOp = CURRENT_TIMESTAMP', body, function(err, result){
          if (err) console.log(err)
          console.log(result);
          console.log(req.session);
          req.session.ID = result.insertId
          console.log(req.session);

          connection.release()

          res.redirect("/account/choice");
        })
      })

    })
  })


});

router.get("/choice", function(req, res){
  res.render("loggin/choice", {title: "Ik Hou van"})
})

router.post("/choice", function(req, res){

  let arr = []
  for(let item in req.body){
    arr.push(req.body[item])
  }

  let stringArr = arr.join()

  let obj = {
    userID: req.session.ID,
    haatLiefde: "liefde",
    antwoord: stringArr,
  }

  pool.getConnection(function(err, connection){
    if (err) console.log(err)

    connection.query('INSERT INTO voorkeur set ?', obj, function(err, result){
      if (err) console.log(err)
      console.log(result)

      connection.release()

      res.redirect("/account/haat")
    })
  })

})

router.get("/haat", function(req, res){
  res.render("loggin/haat", {title: "Ik haat"})
})

router.post("/haat", function(req, res){
  let arr = []
  for(let item in req.body){
    arr.push(req.body[item])
  }

  let stringArr = arr.join()

  let obj = {
    userID: req.session.ID,
    haatLiefde: "haat",
    antwoord: stringArr,
  }

  pool.getConnection(function(err, connection){
    if (err) console.log(err)

    connection.query('INSERT INTO voorkeur SET ?', obj, function(err, result){
      if (err) console.log(err)
      console.log(result)

      connection.release()

      res.redirect("/?first=true")
    })
  })
})

router.get("/wachtwoord-vergeten", function(req, res){
  res.render("loggin/wachtwoord-vergeten", {title: "Wachtwoord vergeten"})
})

router.post("/wachtwoord-vergeten", function(req, res){
  res.redirect("/account/accountwachtwoord-send")
})

router.get("/wachtwoord-send", function(req, res){
  res.render("loggin/wachtwoord-send", {title: "Nieuw wachtwoord instellen"})
})

router.post("/logout", function(req, res){
  delete req.session.ID
  res.redirect("/")
})

router.get("/email-check/:email", function(req, res) {
  let email = req.params.email
  console.log(email)
  pool.getConnection(function(err, connection) {
    if (err) console.log(err)
    connection.query("SELECT ID FROM users WHERE email = ?", email, function(err, result){
      if (err) console.log(err)
      let email = result.length != 1 ? true : false
      res.json({email})
      connection.release()
    })
  })
})

module.exports = router
