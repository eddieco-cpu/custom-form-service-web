// F1 local artifact probe only; no runtime config injection, proxy or API routes.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const root = resolve('.output/public')
/** @type {Record<string, string>} */
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost:3000').pathname)
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end()
      return
    }
    response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
    response.end(await readFile(file))
  }
  catch {
    response.writeHead(404).end()
  }
}).listen(3000, 'localhost', () => console.log('F1 static artifact probe http://localhost:3000'))
