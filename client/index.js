require("babel/register")({
  only: /src\/client\/src/,
  ignore: false
})
module.exports = require("./src")
