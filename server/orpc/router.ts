import { ORPCError, os } from '@orpc/server'
import { Query } from '@tcgdex/sdk'
import type { CardModel, CardResumeModel, Quality } from '@tcgdex/sdk'
import * as z from 'zod'
import { tcgdex, tcgdexEn } from '../utils/tcgdex'

export interface Context {
  headers: Headers
}

const base = os.$context<Context>()

// Many cards have no French scan, the English one is often available
const imageOf = async (card: CardResumeModel, quality: Quality) => {
  const source = card.image ? card : await tcgdexEn.card.get(card.id).catch(() => null)
  return source?.image ? source.getImageURL(quality, 'webp') : null
}

// SDK models hold a reference to the client, so only plain fields go over the wire
const toCardResume = async (card: CardResumeModel, quality: Quality) => ({
  id: card.id,
  localId: card.localId,
  name: card.name,
  image: await imageOf(card, quality)
})

const toCard = async (card: CardModel) => ({
  ...(await toCardResume(card, 'high')),
  category: card.category,
  rarity: card.rarity,
  illustrator: card.illustrator ?? null,
  hp: card.hp ?? null,
  types: card.types ?? [],
  stage: card.stage ?? null,
  description: card.description ?? null,
  set: { id: card.set.id, name: card.set.name }
})

export const router = {
  health: base.handler(() => ({ ok: true })),

  cards: {
    filters: base.handler(async () => {
      const [types, rarities, categories] = await Promise.all([
        tcgdex.type.list(),
        tcgdex.rarity.list(),
        tcgdex.categorie.list()
      ])
      return {
        types: types.map(String),
        rarities: rarities.map(String),
        categories: categories.map(String)
      }
    }),

    search: base
      .input(z.object({
        name: z.string().trim().default(''),
        type: z.string().optional(),
        rarity: z.string().optional(),
        category: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(24)
      }))
      .handler(async ({ input }) => {
        const query = Query.create()
        if (input.name) query.contains('name', input.name)
        if (input.type) query.contains('types', input.type)
        if (input.rarity) query.equal('rarity', input.rarity)
        if (input.category) query.equal('category', input.category)
        // No criteria would list the whole catalogue
        if (!query.params.length) return []

        const cards = await tcgdex.card.list(query.paginate(input.page, input.perPage))
        return Promise.all(cards.map(card => toCardResume(card, 'low')))
      }),

    get: base
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ input }) => {
        const card = await tcgdex.card.get(input.id)
        if (!card) throw new ORPCError('NOT_FOUND', { message: `Card ${input.id} not found` })
        return toCard(card)
      })
  }
}

export type Router = typeof router
