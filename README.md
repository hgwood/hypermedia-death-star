# Hypermedia in the Shadow of the Death Star

The code for my talk *Hypermedia in the Shadow of the Death Star*.

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