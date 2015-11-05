"use strict"

const _ = require("lodash")
const bodyParser = require("body-parser")
const consolidate = require("consolidate")
const express = require("express")
const path = require("path")
const sendPlace = require("send-place")
const render = require("render")
const persistence = require("persistence")

const app = express()
app.engine("mustache", consolidate.mustache)
app.use(express.static(path.join(__dirname, "static")))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json({type: "application/*+json"}))
app.set("views", path.join(__dirname, "node_modules"))

// const routes = process.argv[2] === "--obs" ? require("places/routes-obfuscated") : require("places/routes")
const routes = require("places/routes")

_.each(routes, function(uri, placeId) {
  const place = render(placeId, _.cloneDeep(require(`places/${placeId}`)), uri)

  app.get(uri, place.handler ? _.partial(place.handler, place) : function(request, response) {
    persistence.with(placeId, function(place) {
      if (place.deleted) return response.status(410).location(place.locationAfterDelete).send()
      if (place.fail) return response.sendStatus(740)
      if (place.location) response.location(place.location)
      sendPlace(response, place)
      return false
    })
  })

  const actions = place.ranged ? _(place[place.ranged]).map("actions").compact().flatten().value() : place.actions

  _.each(actions, function(action) {
    const target = action.href
    console.log("register handler for", placeId, action.name, action.method.toLowerCase(), target)
    if (action.handler) app[action.method.toLowerCase()](target, _.partial(action.handler, _.assign({id: placeId}, place), action))
    else {
      app[action.method.toLowerCase()](target, function(request, response) {
        persistence.with(action.hrefId, function(actionTargetPlace) {
          sendPlace(response, actionTargetPlace)
        })
      })
    }
  })

  if (place.hook) place.hook(app, uri, place, placeId)

  // this is commented because express show them in the allow header when call options, which I don't want
  // these routes take effect only if nothing is already defined for that route and that method
  // app.get(uri, (request, response) => response.sendStatus(405))
  // app.post(uri, (request, response) => response.sendStatus(405))
  // app.put(uri, (request, response) => response.sendStatus(405))
  // app.patch(uri, (request, response) => response.sendStatus(405))
  // app.delete(uri, (request, response) => response.sendStatus(405))
})


const server = app.listen(process.env.PORT, function() {
  let host = server.address().address
  const port = server.address().port
  host = host === "::" ? "localhost" : host
  console.log("Example app listening at http://%s:%s", host, port)
})
