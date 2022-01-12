'use strict'

const fp = require('fastify-plugin')
const path = require('path')
const fs = require('fs')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

async function plugin(fastify, options = {}) {
  const defaults = {
    dist: path.resolve(process.cwd(), 'vite', 'dist'),
    origin: {
      protocol: 'http',
      address: 'localhost',
      port: '3001'
    }
  }
  options = Object.assign(defaults, options)
  const { dist, origin } = options

  // allow requests from the app dev server
  fastify.register(require('fastify-cors'), {
    origin: `${origin.protocol}://${origin.address}:${origin.port}`,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'HX-Boosted', 'HX-Current-URL', 'HX-History-Restore-Request', 'HX-Prompt', 'HX-Request', 'HX-Target', 'HX-Trigger', 'HX-Trigger-Name'],
    exposedHeaders: ['HX-Push', 'HX-Redirect', 'HX-Refresh', 'HX-Retarget', 'HX-Trigger', 'HX-Trigger-After-Swap', 'HX-Trigger-After-Settle'],
    credentials: true
  })

  // serve the dist as the root
  fastify.register(require('fastify-static'), {
    root: dist
  })

  // serve the full page HTML when not Ajax
  fastify.addHook('onRequest', (request, reply, done) => {
    const { url, headers } = request
    const isFileName = url.match(/\.\w+$/) // .js, .css, ...
    const hxRequest = headers['hx-request']
    const hxHistoryRestoreRequest = headers['hx-history-restore-request']
    if (!isFileName && (!hxRequest || hxHistoryRestoreRequest)) {
      const indexHtml = path.join(options.dist, 'index.html')
      reply.header('Content-Type', 'text/html')
      reply.send(fs.createReadStream(indexHtml, 'utf8'))
    }
    done()
  })

  fastify.decorateReply('hxRedirect', function hxRedirect(path) {
    this.header('HX-Redirect', path)
    return 'redirect'
  })
}

module.exports = fp(plugin, { name: 'fastify-htmx' })
