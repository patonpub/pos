export const PRODUCT_CATEGORIES = [
  "Soft drinks",
  "Whiskey",
  "Vodka",
  "Rum",
  "Liquor",
  "Wines",
  "Shots",
  "Tecquilla",
  "Cocktails",
  "Beer",
  "Cognac",
  "Gin",
  "Brandy"
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]
