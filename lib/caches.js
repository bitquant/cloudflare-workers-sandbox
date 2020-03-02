
var caches = {
    default: {
        put: async (request, response) => undefined,
        match: async (request, options) => undefined,
        delete: async (request, options) => false
    }
}

module.exports = caches;
