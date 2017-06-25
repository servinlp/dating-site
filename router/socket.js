module.exports = function(io) {
  io.on("connection", function(socket){
    console.log("connect");
    // console.log(socket.handshake.session);

    if (socket.handshake.session.ID) {
      pool.getConnection(function(err, connection){
        if (err) console.log(err)
        connection.query("UPDATE users SET online = 1 WHERE ID = ?", socket.handshake.session.ID, function(err, result){
          if (err) console.log(err)
          // console.log(result)
          connection.release()
        })
      })
    }

    socket.on("disconnect", function(data){
      console.log(data)
      console.log("Disconnect");

      if (socket.handshake.session.ID) {
        pool.getConnection(function(err, connection){
          if (err) console.log(err)
          // connection.query("UPDATE users SET online = 0, lastLoggedIn = CURRENT_TIMESTAMP WHERE ID = ?", socket.handshake.session.ID, function(err, result){
          connection.query("UPDATE users SET online = 0 WHERE ID = ?", socket.handshake.session.ID, function(err, result){
            if (err) console.log(err)
            // console.log(result)
            connection.release()
          })
        })
      }
    })
  })
}
