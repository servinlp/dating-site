var socket = io()

var loc = document.querySelectorAll('input[name="location"]'),
options = document.querySelectorAll(".options"),
profilepic = document.querySelectorAll("input[type='file']"),
verwijder = document.querySelectorAll(".verwijder"),
profile = document.querySelectorAll(".profile img"),
email = document.querySelectorAll("input[type='email']"),
account = document.querySelectorAll("form[action='/account/']")

if (loc[0]) {
  console.log("run");
 for (let input of loc){
   input.addEventListener("input", function(){
     let ul = this.parentNode.querySelector("ul")
     if(this.value.length >= 3){
       JSONHttpRequest('post', "/app/location/" + this.value, 'json', function(data) {
         ul.innerHTML = ""
         let lis = ul.querySelectorAll("li")
         if (lis[0]){
           for (var i = 0; i < lis.length; i++) {
             lis[i].removeEventListener("click", selectLocation)
           }
         }
         if(data.length > 0){
           for(let i = 0; i < data.length; i++) {
             let li = document.createElement("li")
             li.innerHTML = data[i].woonplaats
             ul.appendChild(li)
             li.addEventListener("click", selectLocation.bind(li))
           }
         }
       }, function(data){
         console.log("werkt niet");
         console.log(data);
       })
     } else {
       ul.innerHTML = ""
       let lis = ul.querySelectorAll("li")
       if (lis[0]){
         for (var i = 0; i < lis.length; i++) {
           lis[i].removeEventListener("click", selectLocation)
         }
       }
     }
   })
 }

  function selectLocation(){
    let label = this.parentNode.parentNode,
    input = label.querySelector("input"),
    ul = label.querySelector("ul")

    input.value = this.innerHTML
    ul.innerHTML = ""
  }
}

function JSONHttpRequest(get, url, type, succesHandler, errorHandler) {
  let req = new XMLHttpRequest()
  type = type || 'text'
  req.open(get, url, true)
  req.responseType = type
  req.onload = function() {
    let status = req.status
    if (status == 200) {
      succesHandler && succesHandler(req.response)
    } else {
      errorHandler && errorHandler(status)
    }
  }
  req.send()
}

if (profilepic[0]){
  // http://stackoverflow.com/questions/3814231/loading-an-image-to-a-img-from-input-file
  profilepic[0].addEventListener("change", function() {
    let files = this.files,
    fr = new FileReader()

    fr.onload = function () {
      profile[0].setAttribute("src", fr.result)
    }
    fr.readAsDataURL(files[0]);
  })
  profile[0].addEventListener("click", function(){
    profilepic[0].click()
  })
}

if(options[0])
  options[0].addEventListener("click", function(){ this.classList.toggle("open") })

if (email[0] && !account[0]){
  email[0].addEventListener("blur", function() {
    let that = this
    JSONHttpRequest( 'get', "/account/email-check/" + this.value.toLowerCase(), "json", function(data) {
      let label = that.parentNode
      console.log(data)
      if (!data.email) {
        let small = document.createElement("small")
        small.innerHTML = "Dit email adres is al in gebruik."
        label.appendChild(small)
      } else if (label.querySelectorAll("small")[0]){
        label.removeChild(label.querySelectorAll("small")[0])
      }
    }, function(data) {
      console.log("failure");
      console.log(data);
    })
  })
}
