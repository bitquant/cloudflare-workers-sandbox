#!/usr/bin/env node

var fetch = require('node-fetch');
var Request = fetch.Request;
var Response = fetch.Response;
var Headers = fetch.Headers;
var util = require('util');
var TextEncoder = util.TextEncoder;
var TextDecoder = util.TextDecoder;
var btoa = require('btoa');
var atob = require('atob');
var Crypto = require('node-webcrypto-ossl');
var caches = require('../lib/caches');

var colors = require('colors');

var fetchLog = function(...args) {

    const startTime = new Date();

    return fetch(...args).then(function(result) {

        const endTime = new Date();
        const responseTime = endTime - startTime;

        var status = '' + result.status;

        status = status >= 500 ? status.red
            : status >= 400 ? status.yellow
            : status >= 300 ? status.cyan
            : status >= 200 ? status.green
            : status.blue;


        let method = 'GET'
        let options = args[1];
        if (options && options.method) {
            method = options.method;
        }

        console.log(`${'<fetch>'.magenta} ${method.cyan} ${args[0]} ${status} ${responseTime} ms`);

        return result;
    })
}

var sandbox = {
    fetch: fetchLog, Request, Response, Headers, URL,
    TextEncoder, TextDecoder, btoa, atob,
    crypto: new Crypto(),
    caches, // dummy cache
    console, // share console with sandbox
    addEventListener: (event, listener) => { eventListener = listener }
}


if (process.argv.length <= 2) {
    throw new Error('worker script path missing');
}
var fs = require('fs');
var worker = fs.readFileSync(process.argv[2], 'utf8');
var eventListener;
var vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(worker, sandbox);

var http = require('http');
var morgan = require('morgan');
var logger = morgan('dev');
var port = 3000;
var server = http.createServer(function(req, res) {
    // req.url is a binary string so convert to a utf8 string
    req.url = Buffer.from(req.url, 'binary').toString('utf8');
    logger(req, res, function() {
        handler(req, res);
    })
});
server.on('listening', () => console.log(`Cloudflare Workers Sandbox: ready on port ${port}`));
server.listen(port);

function handler(req, res) {

    let headers = { 'cf-ray': '56c7d7628d82c564' };
    Object.assign(headers, req.headers);

    let request = new fetch.Request(
        `http://${req.headers.host}${req.url}`, {
            headers: headers,
            method: req.method,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req : null
        }
    );

    request.cf = { colo: 'SFO', country: 'US' };

    async function respondWith(responsePromise) {
        const workerResponse = await responsePromise;
        res.statusCode = workerResponse.status;
        res.statusMessage = workerResponse.statusText;
        for (const header of workerResponse.headers) {
            res.setHeader(header[0], header[1]);
        }
        res.removeHeader('content-encoding');
        res.removeHeader('content-length');
        res.end(await workerResponse.buffer());
    }

    async function waitUntil(somePromise) {
        await somePromise;
    }

    async function passThroughOnException() {
        // do nothing
    }

    const event = { request, respondWith, waitUntil, passThroughOnException };

    eventListener(event);
}
