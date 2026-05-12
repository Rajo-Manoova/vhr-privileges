export type Role         = 'admin' | 'animateur' | 'membre'
export type Etape        = '15_akoor_depart' | '15_faratsiho' | '16_ampefy' | '17_sakay' | '17_akoor_arrivee'
export type Palier       = 'membre' | 'argent' | 'or' | 'vip'
export type LotCategorie = 'petit' | 'gros' | 'tres_gros'
export type LotPalier    = 'soiree' | 'tirage_27mai' | 'argent' | 'or' | 'vip'
export type TirageType   = 'soiree_16mai' | 'tirage_27mai' | 'mensuel' | 'trimestriel' | 'semestriel'
export type TirageStatus = 'pending' | 'active' | 'completed'
export type LotStatus    = 'pending' | 'active' | 'confirmed' | 'redrawn'
export type CommandeStatut = 'active' | 'annulee' | 'remboursee'

export const ETAPE_LABELS: Record<Etape, string> = {
  '15_akoor_depart':  'Akoor — Départ (15 Mai)',
  '15_faratsiho':     'Faratsiho (15 Mai)',
  '16_ampefy':        'Ampefy (16 Mai)',
  '17_sakay':         'Sakay (17 Mai)',
  '17_akoor_arrivee': 'Akoor — Arrivée (17 Mai)',
}

export const PALIER_SEUILS: Record<Palier, number> = {
  membre:  0,
  argent:  2_000_000,
  or:      5_000_000,
  vip:    12_000_000,
}

export const PALIER_CHANCES: Record<Palier, number> = {
  membre:  1,
  argent:  2,
  or:      3,
  vip:     5,
}

// Noms d'affichage world-class pour les catégories de lots
export const CATEGORIE_LABELS: Record<LotCategorie, string> = {
  petit:     'Découverte',
  gros:      'Prestige',
  tres_gros: 'Grand Prix',
}

export const CATEGORIE_COLORS: Record<LotCategorie, { bg: string; color: string }> = {
  petit:     { bg: '#f0f7f8', color: '#2c6976' },
  gros:      { bg: '#fef3c7', color: '#92400e' },
  tres_gros: { bg: '#ede9fe', color: '#5b21b6' },
}

export interface Member {
  id: string
  prenom: string
  nom?: string | null
  email: string
  whatsapp: string
  etape: Etape
  created_at: string
  created_by?: string | null
}

export interface Lot {
  id: string
  nom: string
  description?: string | null
  categorie: LotCategorie
  palier: LotPalier
  stock: number
  disponible: boolean
  mis_en_avant: boolean
  valeur_ar?: number | null
  photo_url?: string | null
  created_at: string
}

export interface TirageSession {
  id: string
  type: TirageType
  status: TirageStatus
  started_at?: string | null
  completed_at?: string | null
  created_by?: string | null
  created_at: string
}

export interface SessionLot {
  id: string
  session_id: string
  lot_id: string
  ordre: number
  status: LotStatus
  lot?: Lot
}

export interface TirageWin {
  id: string
  session_id: string
  session_lot_id: string
  member_id: string
  confirmed_at: string
  member?: Member
  lot?: Lot
}

export interface Commande {
  id: string
  member_id: string
  montant_ar: number
  statut: CommandeStatut
  commande_date: string
  odoo_order_id?: string | null
  created_at: string
}

export interface MemberWithStats extends Member {
  cumul_ar: number
  palier: Palier
  nb_commandes: number
  nb_wins: number
}