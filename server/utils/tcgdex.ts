import TCGdex from '@tcgdex/sdk'

export const tcgdex = new TCGdex('fr')

// Fallback for cards that have no French scan
export const tcgdexEn = new TCGdex('en')
