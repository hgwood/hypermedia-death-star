# x.star Version 2 Media Type Specification

The `x.star` media type is a superset of the `vnd.siren` media type. It simply is more strict about the content of `properties`.

## Properties

The value of `properties` MUST be an object with the following fields.

- `title` (required): a header for the resource; MUST be a string
- `description` (required): a free text description of the resource; MUST be a string
- `clue` (optional): any relevent piece of information about the resource that the client should hold on to; typically extracted information from the `description` for easier machine processing; MUST be an array; items can be of any type
