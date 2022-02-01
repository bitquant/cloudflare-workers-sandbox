#!/usr/bin/env node

import { FormData, Headers, Request, Response } from 'node-fetch';
import * as fs from 'fs';
import process from 'process';
import { Buffer } from 'buffer';
import { TextEncoder, TextDecoder } from 'util';
import btoa from 'btoa';
import atob from 'atob';
import caches from '../lib/caches.js';
import KV from '../lib/kv.js';
import fetchLog from '../lib/fetch.js';
import { webcrypto } from 'crypto';
import vm from 'vm';
import http from 'http';
import morgan from 'morgan';
import colors from 'colors'; // extends String.prototype

let kvConfig = null;

try {
    let kvConfigFile = './kv-config.json';

    if (fs.existsSync(kvConfigFile)) {
        console.log('KV bindings found');
        let fileContent = fs.readFileSync(kvConfigFile, 'utf8');
        kvConfig = JSON.parse(fileContent);
    }
    else {
        console.log('KV bindings not detected');
    }
}
catch (err) {
    console.log(err);
}



class Context {

    constructor() {
        this.cloudflareWorkersSandbox = true;
        this.addEventListener = (event, listener) => { eventListener = listener; };
        this.moduleWorker = null;
        this.setTimeout = setTimeout;
        this.clearTimeout = clearTimeout;
        this.setInterval = setInterval;
        this.clearInterval = clearInterval;
        this.fetch = fetchLog;
        this.FormData = FormData;
        this.Request = Request;
        this.Response = Response;
        this.Headers = Headers;
        this.URL = URL;
        this.URLSearchParams = URLSearchParams;
        //this.ReadableStream = ReadableStream
        //this.WritableStream = WritableStream
        //this.TransformStream = TransformStream
        //this.FetchEvent = FetchEvent
        this.caches = caches; // dummy cache
        this.crypto = webcrypto;
        this.CryptoKey = webcrypto.CryptoKey;
        this.TextDecoder = TextDecoder;
        this.TextEncoder = TextEncoder;
        this.atob = atob;
        this.btoa = btoa;

        // These are necessary to use "instanceof" within a vm
        this.Array = Array;
        this.ArrayBuffer = ArrayBuffer;
        this.Atomics = Atomics;
        this.BigInt = BigInt;
        this.BigInt64Array = BigInt64Array;
        this.BigUint64Array = BigUint64Array;
        this.Boolean = Boolean;
        this.DataView = DataView;
        this.Date = Date;
        this.Error = Error;
        this.EvalError = EvalError;
        this.Float32Array = Float32Array;
        this.Float64Array = Float64Array;
        this.Function = Function;
        this.Int8Array = Int8Array;
        this.Int16Array = Int16Array;
        this.Int32Array = Int32Array;
        this.Intl = Intl;
        this.JSON = JSON;
        this.Map = Map;
        this.Math = Math;
        this.NaN = NaN;
        this.Number = Number;
        this.Object = Object;
        this.Promise = Promise;
        this.Proxy = Proxy;
        this.RangeError = RangeError;
        this.ReferenceError = ReferenceError;
        this.Reflect = Reflect;
        this.RegExp = RegExp;
        this.Set = Set;
        this.SharedArrayBuffer = SharedArrayBuffer;
        this.String = String;
        this.Symbol = Symbol;
        this.SyntaxError = SyntaxError;
        this.TypeError = TypeError;
        this.URIError = URIError;
        this.Uint8Array = Uint8Array;
        this.Uint8ClampedArray = Uint8ClampedArray;
        this.Uint16Array = Uint16Array;
        this.Uint32Array = Uint32Array;
        this.WeakMap = WeakMap;
        this.WebAssembly = WebAssembly;
        this.console = console;
        this.constructor = constructor;
        this.decodeURI = decodeURI;
        this.decodeURIComponent = decodeURIComponent;
        this.encodeURI = encodeURI;
        this.encodeURIComponent = encodeURIComponent;
        this.escape = escape;
        this.globalThis = this;
        this.isFinite = isFinite;
        this.isNaN = isNaN;
        this.parseFloat = parseFloat;
        this.parseInt = parseInt;
        //this.self = this
        this.undefined = undefined;
        this.unescape = unescape;
    }
}

if (process.argv.length <= 2) {
    throw new Error('worker script path missing');
}

var worker = fs.readFileSync(process.argv[2], 'utf8');
var eventListener;
var sandbox = new Context();
vm.createContext(sandbox);
vm.runInContext(worker, sandbox);

var logger = morgan('dev');
var port = 3000;
var server = http.createServer(function(req, res) {
    // req.url is a binary string so convert to a utf8 string
    req.url = Buffer.from(req.url, 'binary').toString('utf8');
    logger(req, res, function() {
        handler(req, res);
    });
});
server.on('listening', () => console.log(`Cloudflare Workers Sandbox: ready on port ${port}`));
server.listen(port);

async function handler(req, res) {

    let headers = { 'cf-ray': '56c7d7628d82c564' };
    Object.assign(headers, req.headers);

    let request = new Request(
        `http://${req.headers.host}${req.url}`, {
            headers: headers,
            method: req.method,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req : null
        }
    );

    request.cf = { colo: 'MIA', country: 'US' };

    async function respondWith(responsePromise) {
        const workerResponse = await responsePromise;
        await sendResponse(workerResponse);
    }

    async function sendResponse(workerResponse) {
        res.statusCode = workerResponse.status;
        res.statusMessage = workerResponse.statusText;
        for (const header of workerResponse.headers) {
            res.setHeader(header[0], header[1]);
        }
        res.removeHeader('content-encoding');
        res.removeHeader('content-length');
        res.end(Buffer.from(await workerResponse.arrayBuffer()));
    }

    async function waitUntil(somePromise) {
        await somePromise;
    }

    async function passThroughOnException() {
        // do nothing
    }

    const event = { request, respondWith, waitUntil, passThroughOnException, type: 'fetch' };

    if (sandbox.moduleWorker !== null) {
        const environment = { };
        addKvBindings(environment);
        const context = { waitUntil, passThroughOnException };
        const workerResponse = await sandbox.moduleWorker.fetch(request, environment, context);
        await sendResponse(workerResponse);
    }
    else {
        addKvBindings(sandbox);
        eventListener(event);
    }
}

function addKvBindings(environment) {

    if (kvConfig === null) {
        return;
    }

    let { accountId, apiToken } = kvConfig;

    for (let binding of kvConfig.bindings) {
        let { name, namespaceId } = binding;
        environment[name] = new KV(accountId, apiToken, name, namespaceId);
    }
}
