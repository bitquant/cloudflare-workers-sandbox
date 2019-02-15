# cloudflare-workers-sandbox

Test your Cloudflare Workers application with your local machine.  This package configures a sandbox Cloudflare environment suitable for running and testing your worker code locally.

## Install
```
$ npm install -D cloudflare-workers-sandbox
```

## Usage
```
npx cloudflare-workers-sandbox /path/to/cloudflare/workers/app.js

curl http://localhost:3000
```

## Request Tracing
The sandbox logs all requests received and all fetch() dependencies made during request processing.

## License
MIT license; see [LICENSE](./LICENSE).
