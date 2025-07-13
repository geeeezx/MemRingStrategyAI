# AI Provider Configuration

The backend now supports multiple AI providers. You can configure which providers to use via environment variables.

## Supported Providers

### OpenAI
- **Provider ID**: `openai`
- **Default Model**: `gpt-4o-mini`
- **Required Environment Variables**:
  - `OPENAI_API_KEY`: Your OpenAI API key
  - `OPENAI_MODEL`: (Optional) Model to use (default: gpt-4o-mini)

### Google AI (Gemini)
- **Provider ID**: `gemini`
- **Default Model**: `gemini-2.0-flash`
- **Required Environment Variables**:
  - `GOOGLE_AI_API_KEY`: Your Google AI API key
  - `GOOGLE_AI_MODEL`: (Optional) Model to use (default: gemini-2.0-flash)

## Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# AI Provider Configuration
# Set which AI provider to use by default (openai or gemini)
DEFAULT_AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GOOGLE_AI_MODEL=gemini-2.0-flash

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Provider Selection

1. **Default Provider**: Set via `DEFAULT_AI_PROVIDER` environment variable
2. **Runtime Selection**: Pass `provider` parameter in API requests
3. **Fallback**: If default provider is not available, the first configured provider will be used

## API Endpoints

### Get Available Providers
```
GET /api/rabbitholes/providers
```

Response:
```json
{
  "defaultProvider": "openai",
  "availableProviders": ["openai", "gemini"],
  "providerConfigs": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "available": true
    },
    {
      "provider": "gemini",
      "model": "gemini-2.0-flash",
      "available": true
    }
  ]
}
```

### Search with Provider Selection
```
POST /api/rabbitholes/search
```

Request body:
```json
{
  "query": "your search query",
  "provider": "openai",
  "followUpMode": "expansive",
  "concept": "optional concept"
}
```

## Notes

- At least one provider must be configured (either OpenAI or Google AI)
- If no provider is specified in the request, the default provider will be used
- The system will warn if the default provider is not available and will use the first available provider instead 