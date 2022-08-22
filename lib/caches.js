
const caches = {
    default: {
        put: async (request, response) => { await response.body.cancel(); return undefined; },
        match: async (request, options) => undefined,
        delete: async (request, options) => false
    }
};

export default caches;
