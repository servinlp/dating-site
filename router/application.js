var express = require('express'),
router = express.Router(),
fs = require("fs"),
multer = require("multer"),
upload = multer({
  dest: 'public/profilepics/',
  limits: {
    fieldSize: '2MB',
  }
}),
AppTools = require("../tools/app-tools")

router.get("/*", function(req, res, next){
  if (!req.session.ID) {
    res.redirect("/")
  } else {
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      connection.query("SELECT profilePic FROM users WHERE ID = ?", req.session.ID, function(err, result){
        if(err) console.log(err)
        res.locals.profilePic = result[0].profilePic
        res.locals.loggedin = true
        connection.release()
        next()
      })
    })
  }
})

router.get("/match/:id", function(req, res){
  let matchID = req.params.id,
  sesID = req.session.ID
  // console.log("iets?");
  pool.getConnection(function(err, connection){
    // console.log("iets2?");
    if (err) console.log(err)
    // console.log("iets3?");
    connection.query(`SELECT users.*, voorkeur.haatLiefde, voorkeur.antwoord
      FROM users
      INNER JOIN voorkeur ON users.ID = voorkeur.userID WHERE users.ID = ?`, [sesID], function(err, result){
    // connection.query(`SELECT users.*, voorkeur.haatLiefde, voorkeur.antwoord,
    // (SELECT COUNT(meldingen.to_id) FROM meldingen WHERE meldingen.to_id = ? AND meldingen.made_by_id = ?) AS alMelding
    // FROM users RIGHT JOIN meldingen ON users.ID = meldingen.made_by_id
    // INNER JOIN voorkeur ON users.ID = voorkeur.userID WHERE users.ID = ?`, [matchID, sesID, sesID], function(err, result){
      if (err) console.log(err)

      console.log(result);

      if (result.length > 2) result.splice(1, 2)

      console.log(result);

      if (result[0].zoekende == 0) {
        res.redirect("/")
        connection.release()
        return
      }

      if (result[0].alMelding == 0) res.locals.melding = true

      let liefdeArr = result[0].antwoord.split(","),
      haatArr = result[1].antwoord.split(","),

      liefdeQuery = AppTools.transformPreference(liefdeArr),
      haatQuery = AppTools.transformPreference(haatArr)

      connection.query(`SELECT users.*, voorkeur.haatLiefde, voorkeur.antwoord,
        (((`+liefdeQuery+`) / (substrCount(voorkeur.antwoord, ',') + 1)) >= ?) AS lovepercentage,
        (((`+haatQuery+`) / (substrCount(voorkeur.antwoord, ',') + 1)) >= ?) AS hatepercentage,
        (DATE_FORMAT(FROM_DAYS(DATEDIFF(NOW(), users.leeftijd)), "%Y")+0) AS age
        FROM users RIGHT JOIN voorkeur ON users.ID = voorkeur.userID
        WHERE voorkeur.userID = ?
        AND users.gender = ? AND users.valtOp = ?`, [0.4, 0.4, matchID, result[0].valtOp, result[0].gender], function(err, results){
        if (err) console.log(err)


        // for (let i = results.length-1; 0 < i; i -= 2)
        //   if (results[(i - 1)].lovepercentage != 1 || results[i].hatepercentage != 1)

        // console.log(results);
        // results.splice(1, 2)
        console.log(results);

        if (results.length == 0) res.redirect("/")

        results = AppTools.combineAnswers(results)

        results = AppTools.getMatchingWords(results, liefdeArr, haatArr)


        connection.query("SELECT * FROM chatmessages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)", [sesID, matchID, matchID, sesID], function(err, resu){
          if (err) console.log(err)
          if (resu.length == 0) res.locals.startchat = true

          connection.release()

          res.render("user/match", {
            title: "Match with...",
            naam: result[0].voornaam,
            match: results[0],
            matchID: matchID
          })
        })
      })
    })
  })
})

router.post("/startchatting/:id", function(req, res) {
  console.log(req.body)
  let to = req.params.id,
  obj = {
    from_id: req.session.ID,
    to_id: to,
    message: req.body.message,
    chatRequest: 0,
  }


  console.log(obj);

  pool.getConnection(function(err, connection) {
    if (err) console.log(err)
    connection.query("INSERT INTO chatmessages SET ?", obj, function(err, result){
      if (err) console.log(err)

      // console.log(result)
      res.redirect("/app/match/" + to)

      connection.release()
    })
  })
})

router.get("/account", function(req, res){
  pool.getConnection(function(err, connection){
    if (err) console.log(err)
    connection.query("SELECT * FROM users WHERE ID = ?", req.session.ID, function(err, result){
      if (err) console.log(err)

      console.log(result);
      console.log(result[0].zoekende);

      connection.release()

      res.render("user/account", {
        title: "Instellingen",
        me: result[0]
      })
    })
  })
})

router.post("/account", upload.single("profilepic"), function(req, res){
  console.log(req.body);
  console.log(req.file);
  console.log(typeof req.file);

  let obj = {
    zoekende: req.body.zoekende == 'on' ? 1 : 0,
    valtOp: req.body.voor,
    location: req.body.location,
    distance: req.body.distance,
    leeftijdVan: req.body.leeftijdVan,
    leeftijdTot: req.body.leeftijdTot,
  }

  if (req.file != undefined) {

    AppTools.fileRename(fs, req.file, function(imgI){
      obj.profilePic = imgI + req.file.originalname

      AppTools.removeCurrentProfilePic(fs, pool, req.session.ID, function(){
        console.log("succes");
      })

      AppTools.updateUser(pool, obj, req.session.ID, function(result){
        console.log(result)
        res.redirect("/app/account")
      })
    })
  } else {
    AppTools.updateUser(pool, obj, req.session.ID, function(result){
      console.log(result)
      res.redirect("/app/account")
    })
  }
})

router.post("/location/:location", function(req, res){
  let check = req.params.location
  AppTools.getPossibleLocations(pool, check, function(data) {
    if (data.length == 0) {
      res.send("no matches")
      return
    }
    res.send(data)
  })
})

router.get("/chat-overzicht", function(req, res){
  AppTools.getAllOpenChats(pool, req.session.ID, function(result){
    AppTools.getLastMessageFromID(pool, result, function(results){
      console.log(results);
      res.render("user/chat-overzicht", {
        title: "Chat overzicht",
        chats: results
      })
    })
  })
})

router.get("/chat/:id", function(req, res){
  AppTools.getUsersInfo(pool, req.session.ID, req.params.id, function(resu){
    console.log(resu);
    AppTools.getChatMessages(pool, req.session.ID, req.params.id, function(result) {
      console.log(result)
      res.render("user/chat", {
        title: "Chat",
        personInfo: resu,
        messages: result,
      })
    })
  })
})

router.post("/chat/:id", function(req, res) {
  let id = req.params.id
  console.log(id);
  console.log(req.session.ID);
  console.log(req.body);
  pool.getConnection(function(err, connection) {
    if (err) console.log(err)
    let obj = {
      from_id: req.session.ID,
      to_id: id,
      message: req.body.message,
      chatRequest: 0,
    }
    console.log(obj);
    connection.query("INSERT INTO chatmessages SET ?", obj, function(err, result){
      if (err) console.log(err)
      console.log(result)

      connection.release()
      res.redirect("/app/chat/" + id)
    })
  })
})

router.get("/delete-account", function(req, res) {
  res.render("user/delete-account")
})

router.post("/delete-account", function(req, res) {
  // res.render("user/delete-account")
  AppTools.deleteMyAccount(fs, pool, req.session.ID, function() {
    delete req.session.ID
    res.redirect("/")
  })
})

router.post("/melden/:id", function(req, res) {
  let obj = {
    made_by_id: req.session.ID,
    to_id: req.params.id,
    type: req.body.melding,
    message: req.body.bijschrijving || "geen bijschrijving",
  }
  pool.getConnection(function(err, connection) {
    if (err) console.log(err)
    connection.query("INSERT INTO meldingen SET ?", obj, function(err, result) {
      if (err) console.log(err)
      console.log(result)
      res.redirect("/app/match/"+req.params.id)
      connection.release()
    })
  })
})

router.get("/", function(req, res){
  res.redirect("/")
})

module.exports = router
