# PokéNuxt

[![Deploy](https://github.com/17Sx/pokenuxt/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/17Sx/pokenuxt/actions/workflows/deploy.yml)
[![Front](https://github.com/17Sx/pokenuxt/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/17Sx/pokenuxt/actions/workflows/ci.yml)
[![API](https://github.com/17Sx/pokenuxt/actions/workflows/api.yml/badge.svg?branch=dev)](https://github.com/17Sx/pokenuxt/actions/workflows/api.yml)
[![Coverage front](https://img.shields.io/endpoint?url=https%3A%2F%2Fd1jjigkssadg5n.cloudfront.net%2Fcoverage%2Ffront%2Fbadge.json)](https://d1jjigkssadg5n.cloudfront.net/coverage/front/)
[![Coverage API](https://img.shields.io/endpoint?url=https%3A%2F%2Fd1jjigkssadg5n.cloudfront.net%2Fcoverage%2Fapi%2Fbadge.json)](https://d1jjigkssadg5n.cloudfront.net/coverage/api/)

Nuxt 4 · Tailwind CSS v4 · Hono · données [PokéAPI](https://pokeapi.co)

| Live                               |                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Front, generated (S3 + CloudFront) | https://d1jjigkssadg5n.cloudfront.net                                                                       |
| Front, server-rendered (Vercel)    | https://pokenuxt-mauve.vercel.app                                                                           |
| API (API Gateway + Lambda)         | https://p03y7ni65h.execute-api.eu-north-1.amazonaws.com/health                                              |

## Setup

```bash
bun install
bun run dev:api
bun run dev
```

## API

| Route                    |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /health`            | `{ ok: true }`                                                   |
| `GET /pokeapi/<path>`    | Proxies `https://pokeapi.co/api/v2/<path>` (`limit`, `offset`)   |
| `GET /sprite/<id>?s=&c=` | The artwork dithered to dots, `s` = 96, 128 or 256, `c=1` colour |
| `GET /wishlist`          | `{ items: [{ id, name, url }] }`                                 |
| `POST /wishlist`         | Body `{ name, url }`: 201, or 409 when it's already there        |
| `DELETE /wishlist/<id>`  | `id` is the Pokémon's number: 204, or 404 when it isn't there    |
| `GET /likes`             | `{ items: [{ id, name, url }] }`                                 |
| `POST /likes`            | Body `{ name, url }`: 201, or 409 when it's already liked        |
| `DELETE /likes/<id>`     | `id` is the Pokémon's number: 204, or 404 when it isn't liked    |

