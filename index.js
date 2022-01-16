'use strict'

const fp = require('fastify-plugin')
const path = require('path')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

async function plugin (fastify, options = {}) {
  const defaults = {
    dist: path.resolve('vite', 'dist'),
    origin: 'http://localhost:3001'
  }
  options = Object.assign(defaults, options)

  // allow requests from the app dev server
  fastify.register(require('fastify-cors'), {
    origin: options.origin,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'HX-Boosted', 'HX-Current-URL', 'HX-History-Restore-Request', 'HX-Prompt', 'HX-Request', 'HX-Target', 'HX-Trigger', 'HX-Trigger-Name'],
    exposedHeaders: ['HX-Push', 'HX-Redirect', 'HX-Refresh', 'HX-Retarget', 'HX-Trigger', 'HX-Trigger-After-Swap', 'HX-Trigger-After-Settle'],
    credentials: true
  })

  // serve the dist as the root
  fastify.register(require('fastify-static'), {
    root: options.dist,
    send: {
      index: false
    }
  })

  fastify.addHook('onRequest', function fullPageHook (request, reply, done) {
    const { url, headers } = request
    const isFileName = url.match(/\.\w+$/) // .js, .css, ...
    const hxRequest = headers['hx-request']
    const hxHistoryRestoreRequest = headers['hx-history-restore-request']
    if (!isFileName && (!hxRequest || hxHistoryRestoreRequest)) {
      reply.sendFile('index.html', options.dist)
    }
    done()
  })

  // this can probably be fastify.get('/push*') or something
  fastify.addHook('onRequest', function push (request, reply, done) {
    const PUSH = '/push'
    const { url } = request
    if (url === PUSH || url.startsWith(`${PUSH}/`)) {
      // push to the rest of the url
      const destination = url.replace(new RegExp(`^\\${PUSH}`), '')
      reply.header('HX-Push', destination)
      reply.send()
    }
    done()
  })

  fastify.decorateReply('hxRedirect', function hxRedirect (path) {
    this.header('HX-Redirect', path)
    this.send()
  })
}

module.exports = fp(plugin, { name: 'fastify-htmx' })
