# x.star Media Type Specification

The `x.star` media type is a superset of the `vnd.siren` media type. It simply is more strict about the content of `properties`.

## Properties

The value of `properties` MUST be an object with the following fields.

- `title` (required): a header for the resource; MUST be a string
- `description` (required): a free text description of the resource; MUST be a string
