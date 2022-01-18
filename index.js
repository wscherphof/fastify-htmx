'use strict'

const fp = require('fastify-plugin')
const path = require('path')
const fs = require('fs')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

async function plugin(fastify, options = {}) {
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
  // FIXME: option for mount point
  fastify.register(require('fastify-static'), {
    root: options.dist,
    send: {
      index: false
    }
  })

  function htmx(request) {
    const hxRequest = request.headers['hx-request']
    const hxHistoryRestoreRequest = request.headers['hx-history-restore-request']
    const htmx = hxRequest && !hxHistoryRestoreRequest
    return htmx
  }

  fastify.register(fp(async function (fastify) {
    fastify.decorateRequest('htmx', function () {
      return htmx(this)
    })
  }))

  const INDEX = fs.readFileSync(path.join(options.dist, 'index.html')).toString('utf8')

  fastify.addHook('onSend', async (request, reply, payload) => {
    const { method, url } = request
    if (method === 'GET' && !htmx(request) && !url.startsWith('/assets/') && !url.startsWith('/favicon')) {
      payload = INDEX.replace('{app}', payload)
    }
    return payload
  })

  fastify.get('/push/*', function push(request, reply) {
    const star = request.params['*']
    reply.header('HX-Push', '/' + star)
    reply.send()
  })

  fastify.decorateReply('hxRedirect', function hxRedirect(path) {
    this.header('HX-Redirect', path)
    this.send()
  })
}

module.exports = fp(plugin, { name: 'fastify-htmx' })
