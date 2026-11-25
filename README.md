# Basic Auth Header Generator

Generate HTTP Basic Authorization header values — and ready-to-paste cURL, fetch and axios snippets — from a username and password. Decode existing `Basic` headers too. 100% client-side.

**Live:** [basic-auth-header-generator.itsjust.tools](https://basic-auth-header-generator.itsjust.tools)

## Features

- Enter a username and password; the `Basic <token>` header value updates live
- Copy the header value, or the full cURL / fetch() / axios snippet, to the clipboard
- Password masking toggle and one-click cryptographically random password generation
- URL credential variant (`https://user:pass@host`) with URL encoding and a security note
- Decode mode: paste any `Basic …` header (or bare token) to reveal the credentials
- Validation hints for empty fields, `:` in usernames and non-ASCII characters
- Client-side only, no network calls; credentials never leave your browser
- Shareable state via URL and `.itsjust.json` import/export

## How it works

```text
header = "Basic " + base64(username + ":" + password)
```

Basic auth is not encryption — always use it over HTTPS.

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-basic-auth-header-generator .
docker run -p 3000:3000 itsjust-basic-auth-header-generator
```

## License

MIT
