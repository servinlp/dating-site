var express = require('express'),
router = express.Router(),
AppTools = require("../tools/app-tools"),
bcrypt = require("bcrypt")

const staticSalt = "ki12nu-/;1nd"
const saltRound = 10

router.get("/login", (req, res) => {
  if (req.query.noMatch) {
    res.locals.noMatch = true
  }
  res.render("admin/admin", {title: "Admin login"})
})

router.post("/login", function(req, res){
  console.log(req.body);
  pool.getConnection((err, connection) => {
    if (err) console.log(err)
    connection.query("SELECT * FROM users WHERE email = ? AND role = 1", req.body.email, (err, result) => {
      if (err) console.log(err)
      console.log(result);
      if (result.length == 0){
        res.redirect("/die/admin?noMatch=true")
        return
      }

      bcrypt.compare(req.body.password + staticSalt, result[0].password, function(err, response){
        if (err) console.log(err)


        if (response) {
          req.session.ID = result[0].ID
          req.session.admin = true
          console.log(response)
          res.redirect("/die/admin")
        } else {
          res.redirect("/die/admin/login")
        }
        connection.release()
      })
    })
  })
})

router.get("/*", function(req, res, next) {
  if (!req.session.admin) {
    res.redirect("/")
  } else {
    res.locals.adminIn = true
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      connection.query("SELECT profilePic FROM users WHERE ID = ?", req.session.ID, function(err, result){
        if(err) console.log(err)
        res.locals.profilePic = result[0].profilePic
        connection.release()
        next()
      })
    })
  }
})

router.get("/", function(req, res){
  pool.getConnection(function(err, connection) {
    if (err) console.log(err)
    connection.query(`SELECT COUNT(DISTINCT users.ID) AS totaluser,
    (SELECT COUNT(users.online) FROM users WHERE online = 1) AS onlineUsers,
    (SELECT COUNT(meldingen.to_id) FROM meldingen) AS totalmeldingen
    FROM users JOIN meldingen`, function(err, result) {
      if (err) console.log(err)
      console.log(result)
      connection.query(`SELECT users.voornaam, meldingen.*
      FROM meldingen JOIN users ON meldingen.to_id = users.ID`, function(err, resu) {
        if (err) console.log(err)
        // result.push(resu[0].totalmeldingen)
        console.log(resu);
        res.render("admin/admin-dashboard", {stats: result, meldingen: resu})
        connection.release()
      })
    })
  })
})

router.post("/logout", (req, res) => {
  delete req.session.ID
  delete req.session.admin
  res.redirect("/")
})


module.exports = router
