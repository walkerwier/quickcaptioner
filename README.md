# quickcaptioner

This is a quick and dirty utility for wrapping text into short lines suitable for captioning videos.

Text is wrapped to a user-defined line-length (32 characters by default). But wrapping also obeys customizable rules that can force breaks before or after punctuation and can prefer shorter lines that end in (e.g.) commas or *don’t* end in articles or prepositions.

## Installation

Quickcaptioner is written using Typescript and SCSS instead of Javascript and CSS, so you will need npm and webpack to transmogrify and to install dependencies.

If you have npm, you should only need to run `npm install` to install all dependencies including webpack. (If you have webpack, typescript, etc. installed globally, you may wish to comment some things out in package.json first.)

Once all dependencies are installed, you should be able to run `npm run build` to build the ready-to-serve HTML, JS, and CSS. (This will create a folder called "dist" with the built site.) You can also run `npm run start` to use webpack's development server.