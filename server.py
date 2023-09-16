#!/usr/bin/python3
# taken from http://www.piware.de/2011/01/creating-an-https-server-in-python/
# generate server.xml with the following command:
#    openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes
# run as follows:
#    python simple-https-server.py
# then in your browser, visit:
#    https://localhost:4443
#
# openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes

from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl, os

if not os.path.exists("key.pem") or not os.path.exists("cert.pem"):
    os.system(
        "openssl req -nodes -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -subj '/CN=mylocalhost'"
    )
port = 443
httpd = HTTPServer(("0.0.0.0", port), SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(
    httpd.socket, keyfile="key.pem", certfile="cert.pem", server_side=True
)
print(f"Server running on https://0.0.0.0:{port}")
httpd.serve_forever()
