"use strict"

const _ = require("lodash")
const bodyParser = require("body-parser")
const consolidate = require("consolidate")
const express = require("express")
const shortid = require("shortid")
const path = require("path")
const sendPlace = require("send-place")

const app = express()
app.engine("mustache", consolidate.mustache)
app.use(express.static(path.join(__dirname, "static")))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json({type: "application/*+json"}))
app.set("views", path.join(__dirname, "node_modules"))

const routes = process.argv[2] === "--obs" ? require("places/routes-obfuscated") : require("places/routes")

_.each(routes, function(uri, placeId) {
  // console.log("route", placeId, uri)
  const place = render(placeId, require(`places/${placeId}`), uri)
  app.get(uri, place.handler ? _.partial(place.handler, place) : function(request, response) {
    if (place.deleted) return response.status(410).location(place.locationAfterDelete).send()
    sendPlace(response, place)
  })

  _.each(place.actions, function(action) {
    // console.log(action)
    const target = action.href
    // console.log("target", action.unhref)
    if (action.handler) app[action.method.toLowerCase()](target, _.partial(action.handler, place, action))
    else {
      app[action.method.toLowerCase()](target, function(request, response) {
        sendPlace(response, action.unhref)
      })
    }
  })

  if (place.hook) place.hook(app, uri, place)
})

function render(placeId, place, uri) {
  if (place.rendered) return place
  // console.log("place", placeId, uri, _.map(place.actions, "href"))
  if (!render.stack) render.stack = []
  if (render.stack.length > 10) return
  place.rendered = true
  render.stack.push(0)
  // console.log("place 2", placeId, uri, _.map(place.actions, "href"))
  // place = _.cloneDeep(place)
  _.each(place.actions, action => {
    if (action.rendered) return
    action.rendered = true
    // if (action.href === placeId) return
    if (action.href !== "$self") action.unhref = render(action.href, require(`places/${action.href}`), routes[action.href])
    // console.log("action.href before", placeId, action.description, action.href)
    action.href = renderLink(action.href, uri)
    // console.log("action.href after", placeId, action.description, action.href)
    if (action.returnedLocation) action.returnedLocation = renderLink(action.returnedLocation)
    if (!action.method) action.method = "GET"
  })
  if (!place.links) place.links = []
  place.links.push({name: "self", rel: ["self"], href: placeId, description: "\u27F2"})
  _.each(place.links, link => {
    if (link.rendered) return
    link.rendered = true
    link.href = renderLink(link.href, uri)
  })
  if (place.authorized && place.authorized.location) place.authorized.location = renderLink(place.authorized.location)
  if (place.locationAfterCountdown) place.locationAfterCountdown = renderLink(place.locationAfterCountdown)
  if (place.locationAfterDelete) place.locationAfterDelete = renderLink(place.locationAfterDelete)
  render.stack.pop()
  return place
}

function renderLink(linkTemplate, reference) {
  if (linkTemplate === "$self") return reference.replace(/:\w+/, "game")
  // console.log("linkTemplate", linkTemplate, routes[linkTemplate])
  return routes[linkTemplate].replace(/:\w+/, "game")
}

/*
app.get("/", function(request, response) {
  response.format({
    "text/plain": function() {
      response.render("place.mustache", viewModelize(require("places/root"), "/"))
    },
    "text/html": function() {
      response.render("place.jade", viewModelize(require("places/root"), "/"))
    },
    "default": function() {
      response.status(406).send("Not Acceptable")
    }
  })
})

app.post("/", function(request, response) {
  const gameId = shortid.generate()
  const location = `${gameId}/landing_bay`
  response.status(201).location(location)
  response.format({
    "text/plain": function() {
      response.send(`Next: GET ${location}`)
    },
    "text/html": function() {
      response.send(`Next: <a href="${location}">here</a>`)
    },
    "default": function() {
      response.status(406).send("Not Acceptable")
    }
  })
})

app.get("/:id/landing_bay", function(request, response) {
  response.send(`you're at game ${request.params.id}`)
})
*/
const server = app.listen(3000, function() {
  let host = server.address().address
  const port = server.address().port
  host = host === "::" ? "localhost" : host
  console.log("Example app listening at http://%s:%s", host, port)
})
/*
function viewModelize(place, url) {
  place = _.cloneDeep(place)
  _.each(place.actions, function(action) {
    action.href = action.href === "$self" ? url : action.href
  })
  return place
}
*/
