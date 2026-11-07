# AI provider configuration

Set these values in the backend's private environment (`config.env` locally or a deployment secret store). Do not use `VITE_` variables for provider secrets.

```env
VLLM_BASE_URL=https://your-vllm-host/v1
VLLM_API_KEY=<rotated-key>
VLLM_MODEL=<deployed-model-name>
VLLM_TIMEOUT_S=120
```

The backend calls the OpenAI-compatible chat completions endpoint. Production rejects HTTP provider URLs, so configure HTTPS before deployment. The assistant and exam paper generator show a service error when the provider is not configured or unavailable. Rotate any credential shared in a chat or screenshot before deployment.

`ALLOWED_ORIGINS` must list the deployed frontend origins, separated by commas. Timetable publishing uses MongoDB transactions and needs a replica set or MongoDB Atlas.
