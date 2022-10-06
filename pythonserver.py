#!/usr/bin/env python3

import sys
import socketserver
from http.server import SimpleHTTPRequestHandler

class WasmHandler(SimpleHTTPRequestHandler):
	def end_headers(self):
	# Include additional response headers here. CORS for example:
	#self.send_header('Access-Control-Allow-Origin', '*')
		SimpleHTTPRequestHandler.end_headers(self)


WasmHandler.extensions_map['.wasm'] = 'application/wasm'


if __name__ == '__main__':
	PORT = 8000
	with socketserver.TCPServer(("", PORT), WasmHandler) as httpd:
		print("Listening on port {}. Press Ctrl+C to stop.".format(PORT))
		print("Mapping \".wasm\" to \"%s\"" % WasmHandler.extensions_map['.wasm'])
		httpd.serve_forever()
