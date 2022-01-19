'use strict'

const fp = require('fastify-plugin')
const path = require('path')
const fs = require('fs')
const HTMLParser = require('node-html-parser')

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
    allowedHeaders: ['Content-Type', 'Authorization', 'HX-Boosted', 'HX-Current-URL', 'HX-History-Restore-Request', 'HX-Prompt', 'HX-Request', 'HX-Target', 'HX-Trigger', 'HX-Trigger-Name', 'HX-Init'],
    exposedHeaders: ['HX-Push', 'HX-Redirect', 'HX-Refresh', 'HX-Retarget', 'HX-Trigger', 'HX-Trigger-After-Swap', 'HX-Trigger-After-Settle'],
    credentials: true
  })

  // serve the dist as the root
  fastify.register(require('fastify-static'), {
    // FIXME: option for mount point
    // BUT: it'd clash with the /assets/ links in index.html
    root: options.dist,
    send: {
      index: false
    }
  })

  function hxInit (request) {
    return request.headers['hx-init']
  }

  function htmx (request) {
    const hxRequest = request.headers['hx-request']
    const hxHistoryRestoreRequest = request.headers['hx-history-restore-request']
    const htmx = (hxRequest && !hxHistoryRestoreRequest) && !hxInit(request)
    return htmx
  }

  fastify.decorateRequest('htmx', false)

  fastify.addHook('onRequest', async (request, reply) => {
    request.htmx = htmx(request)
  })

  function index () {
    const root = HTMLParser.parse(
      fs.readFileSync(path.join(options.dist, 'index.html'))
        .toString('utf8')
    )
    const div = root.querySelector('#app')
    const marker = '{{htmx-payload-6f87luuh8g879gsedaffjsj98hu098j}}'
    div.textContent = marker
    return root.toString().split(marker)
  }
  const INDEX = index()

  fastify.addHook('onSend', async (request, reply, payload) => {
    const { method, url } = request
    if (method === 'GET' && !htmx(request) && !hxInit(request) && !url.startsWith('/assets/') && !url.startsWith('/favicon')) {
      reply.header('Content-Type', 'text/html')
      payload = `${INDEX[0]}${payload}${INDEX[1]}`
    }
    return payload
  })

  fastify.get('/push/*', function push (request, reply) {
    const star = request.params['*']
    reply.header('HX-Push', '/' + star)
    reply.send()
  })

  fastify.decorateReply('hxRedirect', function hxRedirect (request, path) {
    if (request.htmx) {
      this.header('HX-Redirect', path)
      this.send()
    } else {
      this.redirect(path)
    }
  })
}

module.exports = fp(plugin, { name: 'fastify-htmx' })
