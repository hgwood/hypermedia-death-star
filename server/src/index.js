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

const routes = process.argv[2] === "--obs" ? require("places/routes-obfuscated") : require("places/routes")

_.each(routes, function(uri, placeId) {
  const place = render(placeId, _.cloneDeep(require(`places/${placeId}`)), uri)
  app.get(uri, place.handler ? _.partial(place.handler, place) : function(request, response) {
    persistence.with(placeId, function(place) {
      if (place.deleted) return response.status(410).location(place.locationAfterDelete).send()
      sendPlace(response, place)
      return false
    })
  })

  _.each(place.actions, function(action) {
    // console.log(action)
    const target = action.href
    // console.log("target", action.unhref)
    if (action.handler) app[action.method.toLowerCase()](target, _.partial(action.handler, place, action))
    else {
      app[action.method.toLowerCase()](target, function(request, response) {
        persistence.with(action.hrefId, function(actionTargetPlace) {
          sendPlace(response, actionTargetPlace)
        })
      })
    }
  })

  if (place.hook) place.hook(app, uri, place, placeId)
})


const server = app.listen(process.env.PORT, function() {
  let host = server.address().address
  const port = server.address().port
  host = host === "::" ? "localhost" : host
  console.log("Example app listening at http://%s:%s", host, port)
})
