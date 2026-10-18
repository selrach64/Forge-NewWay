export type PageId =
  | 'dashboard'
  | 'projects'
  | 'search'
  | 'catalog'
  | 'compare'
  | 'editor'
  | 'dependencies'
  | 'mergePlan'
  | 'validation'
  | 'history'
  | 'settings'

export const PAGES: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'projects', label: 'Projets Unreal' },
  { id: 'search', label: 'Recherche' },
  { id: 'catalog', label: 'Catalogue' },
  { id: 'compare', label: 'Comparaison' },
  { id: 'editor', label: 'Éditeur de fiche' },
  { id: 'dependencies', label: 'Dépendances' },
  { id: 'mergePlan', label: 'Plan de fusion' },
  { id: 'validation', label: 'Validation' },
  { id: 'history', label: 'Historique et tests' },
  { id: 'settings', label: 'Réglages' }
]
