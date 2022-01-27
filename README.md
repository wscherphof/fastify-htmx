# fastify-htmx

A [Fastify](https://www.fastify.io) plugin supporting [HTMX](https://htmx.org)
hypermedia applications.

## Install

```shell
npm install fastify-htmx
```

## Register

In your app.js, register the plugin:

```js
fastify.register(require('fastify-htmx'));
```

Optional options:

- `dist`: The path, possibly containing the build output of a "bundler" (e.g.
  Vite, Snowpack, Webpack, Rollup, or Parcel), with an `index.html` file. The
  index.html must contain an empty element with `id="app"`. Default:
  `path.resolve('vite', 'dist')`.
- `origin`: The base address of any bundler's development server, so that the
  Fastify server can explicitly allow Ajax requests from there, in the context
  of [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). Default:
  `http://localhost:3001`.

## Features

- The `options.dist` directory's file content is statically served under `/`, to
  make the assets accessible that the bundler links to from the `index.html`.
- Fastify's `request` object is decorated with a boolean property `htmx`,
  indicating whether the request is an Ajax request for partial content, or an
  initial browser request for a complete HTML document.
- In case of a full document request, the payload rendered by your Fastify
  [route](https://www.fastify.io/docs/latest/Reference/Routes/) is injected as
  the `innerHTML` of the `id="app"` element in the `index.html`.
- Fastify's `reply` object is decorated with an `hxRedirect` function, which
  will either set the `HX-Redirect`
  [header](https://htmx.org/reference/#response_headers) in case of
  `request.htmx`, or call `reply.redirect` otherwise.
- A GET request to `/push` sends the `HX-Push` header. Its value is the rest of
  the url; e.g. `/push/path` yields `/path`. HTMX will then use the Push API to
  set the browser's location to that URL.

## Example

An example setup, using [Vite](https://vitejs.dev/) as the bundler, and
[pug](https://pugjs.org) as the template engine, can be found here:
https://github.com/wscherphof/fastify-htmxample.

## dev-htmx

The frontend complement of fastify-htmx is
[dev-htmx](https://github.com/wscherphof/dev-htmx), which is applied in the
mentioned example setup as well.
