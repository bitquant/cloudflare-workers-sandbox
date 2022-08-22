# cloudflare-workers-sandbox

Test your Cloudflare Workers application with your local machine.  This package configures a sandbox Cloudflare environment suitable for running and testing your worker code locally.

## Install
```sh
$ npm install -D cloudflare-workers-sandbox
```

## Usage
```sh
# Node.js 18 is now required to support fetch() and web streams.

npx sbox /path/to/cloudflare/workers/app.js

curl http://localhost:3000
```

## Change Log
Starting with version 1.4.0 the [CHANGELOG](./CHANGELOG.md) contains the details of recent package changes.

## Module Worker Setup

Example module worker stored in a file: `example-module-worker.js`

```javascript
export default {
  async fetch(request, environment, context) {
    return new Response("response from module worker");
  }
}
```

To use the above worker create a javascript file to import the module
worker and set `global.moduleWorker`.

```javascript
import moduleWorker from './example-module-worker';

global.moduleWorker = moduleWorker;
```

Webpack can be used to bundle the files into a single file for use by the sandbox.

## Request Tracing
The sandbox logs all requests received and all fetch() dependencies made during request processing.

## Workers KV Usage
There are two options to access KV from the sandbox

### Option 1: cloudflare-workers-kv package
Use the [Cloudflare Workers KV](https://www.npmjs.com/package/cloudflare-workers-kv) library to access the live KV store when running in the local sandbox.  The global dependencies required by the KV library are provided by the sandbox and do not need to be set like the example code shows.

### Option 2: kv-config.json
Create a config file called kv-config.json. The Cloudflare Workers KV Rest API will be used to
get and save data.
```json
{
    "accountId": "<cloudflare-account-id>",
    "apiToken": "<cloudflare-api-token>",
    "bindings": [
        {
            "name": "<kv-name-1>",
            "namespaceId": "<kv-namespace-id-1>"
        },
        {
            "name": "<kv-name-2>",
            "namespaceId": "<kv-namespace-id-2>"
        }
    ]
}
```

## Service Bindings
### service-binding.json
Create a config file called service-binding.json. External API calls
will be made to the configured hostname while running in the sandbox.
```json
{
    "bindings": [
        {
            "name": "exampleService",
            "hostname": "service.example.com"
        }
    ]
}
```

## License
MIT license; see [LICENSE](./LICENSE).
