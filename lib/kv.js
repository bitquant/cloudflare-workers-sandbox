const fetch = require('./fetch');

const basePath = 'https://api.cloudflare.com/client/v4/accounts';


class KV {

    constructor(accountId, apiToken, name, namespaceId) {
        this.accountId = accountId;
        this.apiToken = apiToken;
        this.name = name;
        this.namespaceId = namespaceId;
    }

    async get(key, options) {

        const response = await fetch(`${basePath}/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${key}`, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`
            }
        });

        if (!response.ok) {
            return null;
        }

        const type = options !== undefined ? options.type : undefined;

        if (type === 'text' || type === undefined) {
            return response.text();
        }
        else if (type === 'json') {
            return response.json();
        }
        else if (type === 'arrayBuffer') {
            return response.arrayBuffer();
        }
        else if (type === 'stream') {
            return response.body;
        }
        else {
            throw new Error(`error getting value for key ${key}, unsupported type: ${type}`);
        }
    }

    async put(key, value, params) {

        let query = '';

        if (params !== undefined) {
            if (params.expiration !== undefined) {
                query += `?expiration=${params.expiration}`;
            }
            if (params.expirationTtl !== undefined) {
                query += `${query.length > 0 ? '&' : '?'}expiration_ttl=${params.expirationTtl}`;
            }
        }

        const response = await fetch(`${basePath}/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${key}${query}`, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`
            },
            method: 'PUT',
            body: value
        });

        if (!response.ok) {
            throw new Error(`${this.namespaceId}:${key} not set to ${value} status: ${response.status}`);
        }

        let body = await response.json();

        if (body.success !== true) {
            throw new Error(`${this.namespaceId}:${key} not set to ${value} success: ${body.success}`);
        }

        return undefined;
    }

    async delete(key) {
        const response = await fetch(`${basePath}/${this.accountId}/storage/kv/namespaces/${this.namespaceId}/values/${key}`, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`
            },
            method: 'DELETE'
        });

        // Check if key not found
        if (response.status === 404) {
            return false; // key does not exist
        }

        if (!response.ok) {
            throw new Error(`${this.namespaceId}:${key} not deleted, status: ${response.status}`);
        }

        let body = await response.json();

        if (body.success !== true) {
            throw new Error(`${this.namespaceId}:${key} not deleted, success: ${body.success}`);
        }

        return true; // key deleted
    }
}

module.exports = KV;
