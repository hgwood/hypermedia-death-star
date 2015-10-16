require("babel/register")({
  only: /src\/server\/src/,
  ignore: false
})
require("./src")
