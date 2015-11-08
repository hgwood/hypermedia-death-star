# Hypermedia in the Shadow of the Death Star

The code for my talk *Hypermedia in the Shadow of the Death Star*.

## How to play

- Install dependencies by running `npm install` from both the `server` and `client` folders
- Start the server by running `npm start` in the `server` folder
- Start the Node.js REPL from the `client` folder
- Run `var g = require("./").silent`
- Now `g` is a object with functions to manipulate the game
  - `to(url, mediaType)`: makes a GET to `url` with an `Accept` header (both the URL and media types are then re-used for further requests made to relative URL)
  - `body()`, `json()`, `yaml()`: prints the body of the last received response
  - `look()`: prints the description of the current location (if the last received response if of type `vnd.siren` or `x.star` only)
  - `links()`, `actions()`, `controls()`: respectively prints the links, actions, both links and actions available at the current location (if the last received response if of type `vnd.siren` or `x.star` only)
  - `go(linkIndex)`: makes a GET request to the `href` of the link at the index `linkIndex` (if the last received response if of type `vnd.siren` or `x.star` only)
  - `do(actionName, params)`: makes a request as described by the action which `name` is `actionNameOrIndex` (if the last received response if of type `vnd.siren` or `x.star` only)
  - `follow()`: makes a GET request to the URL given by the `Location` header
  - `auth(userid, password)`: re-makes the last request with basic authentication
  - `options()`: makes an OPTIONS request to the last URL used
  - `get(mediaType)`: makes a GET request at the last URL used with an `Accept` header (the media type will then be re-used for further requests)
  - `delete()`: makes a DELETE request the last URL used
  - `prev()`, `next()`: navigates partial resources

As of yet, the server is stateful and can only handle one game at a time. You must restart the server everytime you want to start a new game.

## Acknowledgment

The original idea for the talk was imagined by Einar W. Høst. With his permission, my talk re-uses the mechanics and topics of his, but the code was written from scratch without any knowlegde of the original, and the theme and scenario are completely different.

## Warning

This code was written for me to learn how to implement Hypermedia APIs, which is something that I had never done before. It is exploratory code. There was also a very hard deadline for it to be working for the date of the presentation. Therefore, I would not qualify it as being of quality, or even good. It work well enough for the purpose of the talk, but it is not well-designed, robust, duplication-free.

*It can not be a reference on how to implement Hypermedia APIs.*

## What could make the implementation much much better

- Immutable ressources. Still have to explore that idea but the mutability in the current version makes it horrendously complex.
- Stateless server. No-brainer. Was traded off for development speed.

## Features that could be added 

- deploy it!
- links to images and sounds
- support for `Accept-Language`
- 405 instead of 404 when the resource exists but the method is not allowed (this is an issue with Express, but it can be worked around)