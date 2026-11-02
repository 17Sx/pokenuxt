import { ORPCError, os } from '@orpc/server'
import { Query } from '@tcgdex/sdk'
import type { CardModel, CardResumeModel } from '@tcgdex/sdk'
import * as z from 'zod'
import { tcgdex } from '../utils/tcgdex'

export interface Context {
  headers: Headers
}

const base = os.$context<Context>()

// SDK models hold a reference to the client, so only plain fields go over the wire
const toCardResume = (card: CardResumeModel) => ({
  id: card.id,
  localId: card.localId,
  name: card.name,
  image: card.image ? card.getImageURL('high', 'webp') : null
})

const toCard = (card: CardModel) => ({
  ...toCardResume(card),
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
    search: base
      .input(z.object({
        name: z.string().trim().min(1),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(24)
      }))
      .handler(async ({ input }) => {
        const cards = await tcgdex.card.list(
          Query.create().contains('name', input.name).paginate(input.page, input.perPage)
        )
        return cards.map(toCardResume)
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
