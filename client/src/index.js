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
let redoWithRange
let autoLook
let autoControls
let lastUrl
let backUrl
const cache = {}

module.exports = {
  to: bluebird.promisify(gotoAndSet),
  do: bluebird.promisify(doAction),
  go: bluebird.promisify(gotoLink),
  follow: bluebird.promisify(follow),
  auth: bluebird.promisify(auth),
  delete: bluebird.promisify(_delete),
  get: bluebird.promisify(get),
  options: bluebird.promisify(options),
  back: bluebird.promisify(back),
  prev: bluebird.promisify(prev),
  next: bluebird.promisify(next),
  wait: bluebird.promisify(wait),
  body: body,
  json: () => console.log(json(current.body)),
  yaml: () => console.log(yaml(current.body)),
  look: () => current.body && current.body.properties ? console.log(current.body.properties.description) : console.error("cannot read body.properties.description"),
  autoLook: () => autoLook = !autoLook,
  autoControls: () => autoControls = !autoControls,
  links: _.partial(yamlArray, "links"),
  actions: _.partial(yamlArray, "actions"),
  // controls: () => module.exports.links() || module.exports.actions()
  controls: controls
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

function gotoUrlWithAuth(url, mediaType, auth, range, callback) {
  if (typeof range === "function") {
    callback = range
    range = undefined
  }
  const request = unirest.get(url)
  if (auth) {
    auth.sendImmediatly = true
    console.log(auth)
    request.auth(auth)
  }
  if (cache[url]) request.header("If-None-Match", cache[url].headers.etag)
  if (range) request.header("Range", range)
  request
    .followRedirect(false)
    .header("Accept", mediaType)
    .send()
    .end(response => {
      if (!response.request) return console.error("invalid request: ", url)
      const requestInfo = _.assign(
        {url: url, method: response.request.method.toUpperCase()},
        _.mapKeys(
          _.pick(response.request.headers, "Accept", "authorization", "If-None-Match", "Range"),
          (value, key) => key.toLowerCase()))
      printInfo(requestInfo, "request")
      const statusText = response.status !== 740 ? httpStatusCodes.getStatusText(response.status) : "Computer says no"
      const responseInfo = _.assign(
        {status: `${response.status} ${statusText}`},
        _.pick(response.headers, "content-type", "etag", "location", "link", "content-language", "content-range"))
      printInfo(responseInfo, "response")
      if (response.status === 304) {
        current = cache[url]
      } else if (response.status === 206) {
        current = response
      } else {
        current = response
        cache[url] = response
      }
      redoWithAuth = _.partial(gotoUrlWithAuth, url, mediaType)
      redoWithRange = _.partial(gotoUrlWithAuth, url, mediaType, undefined)
      backUrl = lastUrl
      lastUrl = url
      if (autoLook && response.body) module.exports.look()
      if (autoControls && response.body) module.exports.controls()
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
  if (!current.body.actions) return console.error("no actions available")
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
      if (!response.request) return console.error("invalid request: ", url)
      const requestInfo = _.assign(
        {url: url, method: response.request.method.toUpperCase()},
        _.mapKeys(
          _.pick(response.request.headers, "Accept", "authorization", "Content-Type"),
          (value, key) => key.toLowerCase()))
      printInfo(requestInfo, "request")
      const statusText = response.status !== 302 ? httpStatusCodes.getStatusText(response.status) : "Found"
      const responseInfo = _.assign(
        {status: `${response.status} ${statusText}`},
        _.pick(response.headers, "content-type", "etag", "location", "www-authenticate", "link", "content-language"))
      printInfo(responseInfo, "response")
      current = response
      redoWithAuth = _.partial(doAction, actionNameOrIndex, params)
      backUrl = lastUrl
      lastUrl = url
      if (autoLook) module.exports.look()
      if (autoControls) module.exports.controls()
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

function _delete(callback) {
  const url = lastUrl
  unirest.delete(url)
    .followRedirect(false)
    .header("Accept", referenceMediaType)
    .end(response => {
      const requestInfo = _.assign(
        {url: url, method: response.request.method.toUpperCase()},
        _.mapKeys(
          _.pick(response.request.headers, "Accept", "authorization"),
          (value, key) => key.toLowerCase()))
      printInfo(requestInfo, "request")
      const statusText = httpStatusCodes.getStatusText(response.status)
      const responseInfo = _.assign(
        {status: `${response.status} ${statusText}`},
        _.pick(response.headers, "content-type", "etag", "location", "www-authenticate", "link", "content-language"))
      printInfo(responseInfo, "response")
      current = response
      callback(null, response)
    })
}

function get(mediaType, callback) {
  if (typeof mediaType === "function") {
    callback = mediaType
    mediaType = undefined
  }
  gotoUrl(lastUrl, mediaType || referenceMediaType, callback)
}

function options(callback) {
  const url = lastUrl
  unirest.options(url).end(function(response) {
    const requestInfo = _.assign(
      {url: url, method: response.request.method.toUpperCase()},
      _.mapKeys(
        _.pick(response.request.headers, "Accept", "authorization"),
        (value, key) => key.toLowerCase()))
    printInfo(requestInfo, "request")
    const statusText = httpStatusCodes.getStatusText(response.status)
    const responseInfo = _.assign(
      {status: `${response.status} ${statusText}`},
      _.pick(response.headers, "allow"))
    printInfo(responseInfo, "response")
    callback(null, response)
  })
}

function back(callback) {
  gotoUrl(backUrl, referenceMediaType, callback)
}

function prev(callback) {
  const rangeMatch = current.headers["content-range"].match(/^(\w+) (\d)\-\d\/\d/)
  const rangeType = rangeMatch[1]
  const currentPageNumber = Number(rangeMatch[2])
  const prevPageNumber = currentPageNumber === 0 ? 0 : currentPageNumber - 1
  redoWithRange(`${rangeType}=${prevPageNumber}-${prevPageNumber}`, callback)
}

function next(callback) {
  const rangeMatch = current.headers["content-range"].match(/^(\w+) (\d)\-\d\/\d/)
  const rangeType = rangeMatch[1]
  const currentPageNumber = Number(rangeMatch[2])
  const nextPageNumber = currentPageNumber === 0 ? 0 : currentPageNumber + 1
  redoWithRange(`${rangeType}=${nextPageNumber}-${nextPageNumber}`, callback)
}

function wait(seconds, callback) {
  setTimeout(_.partial(callback, null), seconds * 1000)
}

function body() {
  return console.log(current.body)
}

function json(obj) {
  return JSON.stringify(obj, null, 2).replace(/\s*"\w+"\:/g, match => colors.yellow(match))
}

function yaml(obj) {
  return jsYaml.safeDump(obj, {indent: 2}).replace(/\s*\w+\:/g, match => colors.yellow(match))
}

function printInfo(info, prefix) {
  console.log(colors.cyan(prefix))
  _.each(info, (value, key) => console.log(coloredKey(key, value), value))
  console.log()
}

function coloredKey(key, value) {
  const template = `  ${key}:`
  if (key !== "status") return colors.yellow(template)
  if (value[0] === "2") return colors.green(template)
  if (value[0] === "3") return colors.blue(template)
  if (value[0] === "4") return colors.red(template)
}

function silent(obj) {
  return _.mapValues(obj, f => (...args) => {f(...args); return})
}

function obfuscate(url) {
  return url.replace(/\w+$/, shortid.generate())
}

function yamlArray(prop) {
  if (!current.body) return console.error("no body")
  if (!current.body[prop]) return console.error(`no body["${prop}"]`)
  if (current.body[prop].length) return console.log(yaml(current.body[prop]))
}

function controls() {
  if (!current.body) return console.error("no body")
  const lightLinks = _(current.body.links)
    // .map(({title, href, rel}, index) => ({title, href, index, rel}))
    // .reject(({rel}) => _.contains(rel, "self"))
    .map(({title, href}, index) => ({title, href, index}))
    .value()
  console.log(yaml({links: lightLinks || null, actions: current.body.actions || null}))
}
