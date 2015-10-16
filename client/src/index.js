"use strict"

const _ = require("lodash")
const unirest = require("unirest")
const bluebird = require("bluebird")
const colors = require("colors")
const jsYaml = require("js-yaml")
const httpStatusCodes = require("http-status-codes")
const shortid = require("shortid")

let current
let referenceUrl
let referenceMediaType
let redoWithAuth

module.exports = {
  to: bluebird.promisify(gotoAndSet),
  do: bluebird.promisify(doAction),
  go: bluebird.promisify(gotoLink),
  follow: bluebird.promisify(follow),
  auth: bluebird.promisify(auth),
  wait: bluebird.promisify(wait),
  body: body,
  json: () => console.log(json(current.body)),
  yaml: () => console.log(yaml(current.body)),
  look: () => current.body.properties && console.log(current.body.properties.description),
  links: () => console.log(yaml(current.body.links)),
  actions: () => console.log(yaml(current.body.actions))
}

module.exports.silent = silent(module.exports)

function gotoAndSet(url, mediaType = "text/plain", callback = _.noop) {
  if (typeof mediaType === "function") {
    callback = mediaType
    mediaType = "text/plain"
  }
  referenceUrl = url
  referenceMediaType = mediaType
  gotoUrl(url, mediaType, callback)
}

function gotoUrl(url, mediaType = "text/plain", callback = _.noop) {
  return gotoUrlWithAuth(url, mediaType, undefined, callback)
}

function gotoUrlWithAuth(url, mediaType, auth, callback) {
  const request = unirest.get(url)
  if (auth) {
    auth.sendImmediatly = true
    console.log(auth)
    request.auth(auth)
  }
  request
    .followRedirect(false)
    .header("Accept", mediaType)
    .send()
    .end(response => {
      if (response.error) return console.error(response.error, request)
      const requestInfo = _.assign({url: url, method: "GET"}, _.mapKeys(_.pick(response.request.headers, "Accept", "authorization"), (value, key) => key.toLowerCase()))
      printInfo(requestInfo, "request")
      const statusText = httpStatusCodes.getStatusText(response.status)
      const responseInfo = _.assign({status: `${response.status} ${statusText}`}, _.pick(response.headers, "content-type", "etag", "location"))
      printInfo(responseInfo, "response")
      current = response
      redoWithAuth = _.partial(gotoUrlWithAuth, url, mediaType)
      callback(null, response)
    })
}

function doAction(actionNameOrIndex, params, auth, callback) {
  if (typeof auth === "function") {
    callback = auth
    auth = undefined
  }
  if (typeof params === "function") {
    callback = params
    params = undefined
  }
  const action = _.find(current.body.actions, {name: actionNameOrIndex}) || current.body.actions[actionNameOrIndex]
  if (!action) return console.error(`no action named/at index ${actionNameOrIndex}`)
  const url = referenceUrl + action.href
  const request = unirest[action.method.toLowerCase()](url)
  if (auth) {
    auth.sendImmediatly = true
    request.auth(auth)
  }
  request
    .followRedirect(false)
    .header("Accept", referenceMediaType)
    .send(params)
    .end(response => {
      // if (response.error) return console.error(response.error, request)
      const requestInfo = _.assign({url: url, method: "GET"}, _.mapKeys(_.pick(response.request.headers, "Accept", "authorization"), (value, key) => key.toLowerCase()))
      printInfo(requestInfo, "request")
      const statusText = httpStatusCodes.getStatusText(response.status)
      const responseInfo = _.assign({status: `${response.status} ${statusText}`}, _.pick(response.headers, "content-type", "etag", "location", "www-authenticate"))
      printInfo(responseInfo, "response")
      current = response
      redoWithAuth = _.partial(doAction, actionNameOrIndex, params)
      callback(null, response)
    })
}

function gotoLink(index, callback) {
  const link = current.body.links[index]
  if (!link) return console.error(`no link at index ${index}`)
  const url = referenceUrl + link.href
  return gotoUrl(url, referenceMediaType, callback)
}

function follow(callback) {
  return gotoUrl(referenceUrl + current.headers.location, referenceMediaType, callback)
}

function auth(username, password, callback) {
  return redoWithAuth({user: username, pass: password}, callback)
}

function wait(seconds, callback) {
  setTimeout(_.partial(callback, null), seconds * 1000)
}

function body() {
  return console.log(current.body)
  /*const contentType = current.headers["content-type"]
  if (contentType.startsWith("text/place")) console.log(current.body)
  else if (contentType.startsWith("application/json")) console.log(json(current.body))
  else console.log("Unacceptable")*/
}

function json(obj) {
  return JSON.stringify(obj, null, 2).replace(/\s*"\w+"\:/g, match => colors.yellow(match))
}

function yaml(obj) {
  return jsYaml.safeDump(obj, {indent: 2}).replace(/\s*\w+\:/g, match => colors.yellow(match))
}

function printInfo(info, prefix) {
  console.log(colors.cyan(prefix))
  _.each(info, (value, key) => console.log(colors.yellow(`  ${key}:`), value))
  console.log()
}

function silent(obj) {
  return _.mapValues(obj, f => (...args) => {f(...args); return})
}

function obfuscate(url) {
  return url.replace(/\w+$/, shortid.generate())
}
