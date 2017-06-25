module.exports = AppTools = {
  fileRename: function(fs, file, cb) {
    let imgI = 0

    while(fs.existsSync(file.destination + imgI + file.originalname))
      imgI++

    fs.rename(file.destination + file.filename, file.destination + imgI + file.originalname, function(err){
      if (err) console.log(err);
      console.log("rename succesfull")
      cb(imgI)
    })
  },

  updateUser: function(pool, obj, ID, cb){
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      connection.query("UPDATE users SET ? WHERE ID = ?", [obj, ID], function(err, result){
        if (err) console.log(err)
        cb(result)
        connection.release()
      })
    })
  },

  removeCurrentProfilePic: function(fs, pool, ID, cb){
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      connection.query("SELECT profilePic FROM users WHERE ID = ?", ID, function(err, result){
        if (err) console.log(err)
        console.log(result[0]);
        fs.unlink("./public/profilepics/" + result[0].profilePic, function(){
          console.log("unlink");
          cb()
        })
        connection.release()
      })
    })
  },

  transformPreference: function(arr) {
    let tempQuery = ""
    for (var i = 0; i < arr.length; i++) {
      if (i == arr.length - 1) {
        tempQuery += "substrCount(antwoord, '"+ arr[i] +"')"
        break
      }
      tempQuery += "substrCount(antwoord, '"+ arr[i] +"') + "
    }

    return tempQuery
  },

  combineAnswers: function(results){
    for (let i = results.length-1; 0 < i; i -= 2) {
      results[i-1].haatAntwoord = results[i].antwoord
      results.splice(i, 1)
    }

    return results
  },

  getMatchingWords: function(results, liefdeArr, haatArr){
    for (let i = 0; i < results.length; i++) {
      let matchArr = results[i].antwoord.split(","),
      haatMatchArr = results[i].haatAntwoord.split(",")
      results[i].liefdeMatchWords = []
      results[i].haatMatchWords = []
      for (let u = 0; u < liefdeArr.length; u++){
        if (liefdeArr[u] == matchArr[u]) results[i].liefdeMatchWords.push(matchArr[u])

        if (haatArr[u] == haatMatchArr[u] && haatArr[u] != undefined) results[i].haatMatchWords.push(haatMatchArr[u])
      }
    }

    return results
  },

  getAllOpenChats: function(pool, ID, cb){
    pool.getConnection(function(err, connection){
      if (err) console.log(err)
      // connection.query("SELECT (DISTINCT from_id) AS fromID, (DISTINCT to_id) AS toID FROM chatmessages WHERE from_id != ? OR to_id != ?", [ID, ID], function(err, result){
      connection.query("SELECT DISTINCT from_id FROM chatmessages WHERE to_id = ?", ID, function(err, resultOne){
        if (err) console.log(err)
        // console.log(resultOne)
        connection.query("SELECT DISTINCT to_id FROM chatmessages WHERE from_id = ?", ID, function(err, resultTwo){
          if (err) console.log(err)
          // console.log(resultTwo)
          let allChats = []
          for (let message of resultOne)
            if (!allChats.includes(message.from_id)) allChats.push(message.from_id)

          for (let message of resultTwo)
            if (!allChats.includes(message.to_id)) allChats.push(message.to_id)

          cb(allChats)

          connection.release()
        })
      })
    })
  },

  getLastMessageFromID: function(pool, arr, cb) {
    pool.getConnection(function(err, connection) {
      if (err) console.log(err)
      let results = []
      for(let i = 0; i < arr.length; i++) {
        connection.query("SELECT chatmessages.*, users.voornaam, users.profilePic, users.online, (users.ID) AS userID, DATE_FORMAT(chatmessages.time, '%e-%b') AS day, DATE_FORMAT(chatmessages.time, '%H:%i') AS sendTime FROM chatmessages RIGHT JOIN users ON ? = users.ID WHERE from_id = ? OR to_id = ? ORDER BY chatmessages.ID DESC LIMIT 1",
        [arr[i], arr[i], arr[i]], function(err, result){
          if (err) console.log(err)
          results.push(result[0])

          if (i == arr.length - 1) {
            console.log(results);
            cb(results)
          }
        })
      }
      connection.release()
    })
  },

  getChatMessages: function(pool, myID, otherID, cb) {
    pool.getConnection(function(err, connection) {
      if (err) console.log(err)
      connection.query("SELECT *, DATE_FORMAT(time, '%e-%b') AS day, DATE_FORMAT(time, '%H:%i') AS sendTime FROM chatmessages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY ID ASC", [myID, otherID, otherID, myID], function(err, result) {
        if (err) console.log(err)
        console.log(result);
        cb(result)
        connection.release()
      })
    })
  },

  getUsersInfo: function(pool, myID, otherID, cb) {
    pool.getConnection(function(err, connection) {
      if (err) console.log(err)
      connection.query("SELECT ID, voornaam, profilePic, online, lastLoggedIn FROM users WHERE ID = ?", myID, function(err, res) {
        if (err) console.log(err)
        connection.query("SELECT ID, voornaam, profilePic, online, lastLoggedIn FROM users WHERE ID = ?", otherID, function(err, resu) {
          if (err) console.log(err)
          cb([res[0], resu[0]])
          connection.release()
        })
      })
    })
  },

  // http://stackoverflow.com/questions/4060004/calculate-age-in-javascript
  calculateAge: function(birthday) { // birthday is a date
    let ageDifMs = Date.now() - birthday.getTime();
    let ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  },

  getPossibleLocations: function(pool, location, cb) {
    pool.getConnection(function(err, connection) {
      if (err) console.log(err)
      connection.query("SELECT DISTINCT woonplaats FROM 4pp WHERE woonplaats LIKE ?", "%"+location+"%", function(err, result) {
        if (err) console.log(err)
        cb(result)
        connection.release()
      })
    })
  },

  deleteMyAccount: function(fs, pool, ID, cb) {
    this.removeCurrentProfilePic(fs, pool, ID, function(){})

    pool.getConnection(function(err, connection) {
      if (err) console.log(err)
      connection.query("DELETE FROM voorkeur WHERE userID = ?", ID, function(err, res){
        if (err) console.log(err)
        console.log(res)
      })
      connection.query("DELETE FROM chatmessages WHERE from_id = ? OR to_id = ?", [ID, ID], function(err, res){
        if (err) console.log(err)
        console.log(res)
      })
      connection.query("DELETE FROM users WHERE ID = ?", ID, function(err, result){
        if (err) console.log(err)
        console.log(result)
        cb()
        connection.release()
      })
    })
  },

}
