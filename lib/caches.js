
const caches = {
    default: {
        put: async (request, response) => undefined,
        match: async (request, options) => undefined,
        delete: async (request, options) => false
    }
}

export default caches;
