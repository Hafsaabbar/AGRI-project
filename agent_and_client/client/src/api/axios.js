import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    // Check if it's an agent request
    const isAgentRequest = config.url?.includes('/agent');

    // Get tokens
    const clientToken = localStorage.getItem('token');
    const agentToken = localStorage.getItem('agentToken');

    // Use agent token for agent requests, otherwise client token
    // If no specific token found for the type, fall back to the other just in case (optional)
    const token = isAgentRequest ? (agentToken || clientToken) : (clientToken || agentToken);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
