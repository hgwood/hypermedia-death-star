"use strict"

const [a, b] = [1, 2]
const {c, d} = {a: 1, b: 2}
// const _ = require("lodash")
const router = require("router")
const expressify = require("expressify")

const app = expressify(router)

app.listen(3000)

