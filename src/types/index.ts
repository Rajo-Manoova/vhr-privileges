export type Role           = 'admin' | 'animateur' | 'membre'
export type Etape          = '15_akoor_depart' | '15_faratsiho' | '16_ampefy' | '17_sakay' | '17_akoor_arrivee'
export type Palier         = 'membre' | 'argent' | 'or' | 'vip'
export type LotCategorie   = 'decouverte' | 'premium' | 'prestige' | 'grand_prix'
export type LotPalier      = 'tirage' | 'argent' | 'or' | 'vip'
export type TirageType     = 'ponctuel' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'
export type TirageStatus   = 'pending' | 'active' | 'completed'
export type LotStatus      = 'pending' | 'active' | 'confirmed' | 'redrawn'
export type CommandeStatut = 'active' | 'annulee' | 'remboursee'

export const ETAPE_LABELS: Record<Etape, string> = {
  '15_akoor_depart':  'Akoor — Départ (15 Mai)',
  '15_faratsiho':     'Faratsiho (15 Mai)',
  '16_ampefy':        'Ampefy (16 Mai)',
  '17_sakay':         'Sakay (17 Mai)',
  '17_akoor_arrivee': 'Akoor — Arrivée (17 Mai)',
}

// ─── Paliers ────────────────────────────────────────────────────────────────

export const PALIER_LABELS: Record<Palier, string> = {
  membre: 'Membre',
  argent: 'Argent',
  or:     'Or',
  vip:    'VIP',
}

export const PALIER_COLORS: Record<Palier, { bg: string; color: string; border: string }> = {
  membre: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  argent: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  or:     { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  vip:    { bg: '#f3e8ff', color: '#6d28d9', border: '#ddd6fe' },
}

export const PALIER_EMOJI: Record<Palier, string> = {
  membre: '⚪',
  argent: '🥈',
  or:     '🥇',
  vip:    '💎',
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

// Palier minimum requis pour accéder à chaque catégorie de lot
export const CATEGORIE_PALIER_MIN: Record<LotCategorie, Palier> = {
  decouverte: 'membre',
  premium:    'argent',
  prestige:   'or',
  grand_prix: 'vip',
}

// Ordre des paliers (pour comparaisons)
export const PALIER_ORDER: Record<Palier, number> = {
  membre: 0,
  argent: 1,
  or:     2,
  vip:    3,
}

// ─── Lots ────────────────────────────────────────────────────────────────────

export const CATEGORIE_LABELS: Record<LotCategorie, string> = {
  decouverte: 'Découverte',
  premium:    'Premium',
  prestige:   'Prestige',
  grand_prix: 'Grand Prix',
}

export const CATEGORIE_COLORS: Record<LotCategorie, { bg: string; color: string }> = {
  decouverte: { bg: '#f0f7f8', color: '#2c6976' },
  premium:    { bg: '#f0fdf4', color: '#166534' },
  prestige:   { bg: '#fef3c7', color: '#92400e' },
  grand_prix: { bg: '#ede9fe', color: '#5b21b6' },
}

export const PALIER_LOT_LABELS: Record<LotPalier, string> = {
  tirage: 'Tirage',
  argent: 'Argent',
  or:     'Or',
  vip:    'VIP',
}

// ─── Tirages ─────────────────────────────────────────────────────────────────

export const TIRAGE_TYPE_LABELS: Record<TirageType, string> = {
  ponctuel:     'Ponctuel',
  hebdomadaire: 'Hebdomadaire',
  mensuel:      'Mensuel',
  trimestriel:  'Trimestriel',
  semestriel:   'Semestriel',
  annuel:       'Annuel',
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Member {
  id: string
  prenom: string
  nom?: string | null
  email: string
  whatsapp: string
  etape: Etape
  niveau: Palier          // ← nouveau
  cumul_ar: number        // ← nouveau (0 par défaut, mis à jour par Odoo)
  actif: boolean
  notes?: string | null
  pin?: string | null
  pin_temp?: string | null
  created_at: string
  created_by?: string | null
}

export interface Lot {
  id: string
  code?: string | null
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
  type: TirageType | string
  label?: string | null
  status: TirageStatus
  scheduled_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_by?: string | null
  created_at: string
  eligibilite_override: boolean   // ← nouveau
}

export interface TirageTypeConfig {
  id: string
  type: string
  label: string
  lot_rules: Array<{ categorie: LotCategorie; qty: number }>
  budget_max_ar: number | null
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
  nb_commandes: number
  nb_wins: number
}