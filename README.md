# quickcaptioner

This is a quick and dirty utility for wrapping text into short lines suitable for captioning videos.

Text is wrapped to a user-defined line-length (32 characters by default). But wrapping also obeys customizable rules that can force breaks before or after punctuation and can prefer shorter lines that end in (e.g.) commas or *don’t* end in articles or prepositions.

## Installation

Quickcaptioner is written using Typescript and SCSS instead of Javascript and CSS, so you will need npm and webpack to transmogrify and to install dependencies.
