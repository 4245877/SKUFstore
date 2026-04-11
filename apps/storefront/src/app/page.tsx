import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'

export const metadata: Metadata = {
  title: 'Skufnya — Аниме-фигурки премиум-класса',
  description:
    'Магазин эксклюзивных аниме-фигурок. Scale, Nendoroid, Figma и коллекционные статуэтки от ведущих японских производителей.',
}

export default function HomePage() {
  return <HomePageClient />
}