"use strict"

const path = require("path")
let renderLinks = undefined
const express = require("express")
const bodyParser = require("body-parser")
const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.set("views", path.join(__dirname, "node_modules"))

app.get("/", function(req, res) {
  res.format({
    "text/plain": function() {
      res.links({
        start: "start"
      }).send("Hello World! POST your name to /start to begin")
    },
    "text/html": function() {
      res.render("place.jade", require("places/root"))
    },
    "default": function() {
      res.status(406).send("Not Acceptable")
    }
  })
})

app.post("/start", function(req, res) {
  res.status(201).location(`games/${req.body.name}`)
  res.format({
    "text/plain": function() {
      res.send(`started as: ${req.body.name}`)
    },
    "text/html": function() {
      res.send(`Location: <a href="games/${req.body.name}">here</a>`)
    }
  })
})

app.get("/games/:id", function(req, res) {
  res.send(`you're at game ${req.params.id}`)
})

const server = app.listen(3000, function() {
  let host = server.address().address
  const port = server.address().port
  host = host === "::" ? "localhost" : host
  console.log("Example app listening at http://%s:%s", host, port)
  renderLinks = place => require("render-links")(`http://${host}:${port}`, place)
})
