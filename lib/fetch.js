var fetch = require('node-fetch');

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

        let method = 'GET';
        let options = args[1];
        if (options && options.method) {
            method = options.method;
        }

        let url = (typeof args[0] === 'string') ? args[0] : args[0].url;
        console.log(`${'<fetch>'.magenta} ${method.cyan} ${url} ${status} ${responseTime} ms`);

        return result;
    }).catch(function(err) {

        const endTime = new Date();
        const responseTime = endTime - startTime;

        var status = 'ERROR'.red;

        let method = 'GET';
        let options = args[1];
        if (options && options.method) {
            method = options.method;
        }

        let url = (typeof args[0] === 'string') ? args[0] : args[0].url;
        let msg = `${err}`;
        console.log(`${'<fetch>'.magenta} ${method.cyan} ${url} ${status} ${responseTime} ms ${msg.brightMagenta}`);

        throw err;
    });
};

module.exports = fetchLog;
