'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, UserPlus, Users, Shuffle,
  LogOut, Menu, X, Trophy, UserCog,
  ShoppingCart, Calendar, BookOpen, Award, Shield, Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/types'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: '/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
    { href: '/inscription', icon: UserPlus,         label: 'Inscription'     },
    { href: '/membres',     icon: Users,            label: 'Membres'         },
    { href: '/commandes',   icon: ShoppingCart,     label: 'Commandes'       },
    { href: '/catalogue',   icon: BookOpen,         label: 'Catalogue lots'  },
    { href: '/recompenses', icon: Award,            label: 'Récompenses'     },
    { href: '/tirages',     icon: Shuffle,          label: 'Tirages'         },
    { href: '/settings',    icon: Settings,         label: 'Paramètres'      },
    { href: '/equipe',      icon: UserCog,          label: 'Équipe'          },
    { href: '/audit',       icon: Shield,           label: 'Audit'           },
  ],
  animateur: [
    { href: '/inscription', icon: UserPlus, label: 'Inscription' },
    { href: '/membres',     icon: Users,    label: 'Membres'     },
    { href: '/tirages',     icon: Shuffle,  label: 'Tirages'     },
  ],
  membre: [
    { href: '/profil', icon: Trophy, label: 'Mon profil' },
  ],
}

interface Props {
  role: Role | null
  userEmail: string
  children: React.ReactNode
}

export default function DashboardShell({ role, userEmail, children }: Props) {
  const [open,        setOpen]              = useState(false)
  const [clickedHref, setClickedHref]       = useState<string | null>(null)
  const [isPending,   startNavTransition]   = useTransition()
  const pathname   = usePathname()
  const router     = useRouter()
  const navItems   = role ? (NAV[role] ?? []) : []

  useEffect(() => { setOpen(false) },       [pathname])
  useEffect(() => { setClickedHref(null) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleNavClick = useCallback((href: string, e: React.MouseEvent) => {
    e.preventDefault()
    setClickedHref(href)
    startNavTransition(() => { router.push(href) })
  }, [router])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const Sidebar = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1.5rem 1rem',
    }}>

      {/* Logo */}
      <div style={{ padding: '0 0.5rem', marginBottom: '0.75rem', flexShrink: 0 }}>
        <Image
          src="/cartin_logo_dark.png"
          alt="Cart'In"
          width={72}
          height={72}
          style={{ objectFit: 'contain', display: 'block' }}
        />
        <div style={{
          marginTop: '0.375rem',
          fontSize: '0.6875rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--accent)',
          fontFamily: 'var(--font-display)',
        }}>
          VHR Privilèges
        </div>
      </div>

      {/* Contexte rallye */}
      <div style={{ padding: '0 0.5rem', marginBottom: '1.25rem', flexShrink: 0 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-4)', lineHeight: 1.5 }}>
          Rallye VHR Madagascar 2026<br />
          15 – 16 – 17 Mai
        </div>
      </div>

      {/* Séparateur */}
      <div className="divider" style={{ marginBottom: '1rem' }} />

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active  = isActive(href)
          const clicked = clickedHref === href && isPending
          return (
            <a
              key={href}
              href={href}
              onClick={(e) => handleNavClick(href, e)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                fontSize: '0.875rem', fontWeight: active ? 700 : 500,
                color: active ? 'white' : clicked ? 'var(--brand)' : 'var(--text-2)',
                background: active
                  ? 'var(--brand)'
                  : clicked
                  ? 'rgba(15,45,53,0.12)'
                  : 'transparent',
                textDecoration: 'none',
                transition: 'background 150ms ease, color 150ms ease, transform 100ms ease',
                position: 'relative', fontFamily: 'var(--font-body)',
                transform: clicked ? 'scale(0.98)' : 'scale(1)',
                cursor: 'pointer',
              }}
            >
              <Icon
                size={17}
                style={{
                  color: active ? 'rgba(255,255,255,0.85)' : clicked ? 'var(--brand)' : 'var(--text-4)',
                  flexShrink: 0,
                  transition: 'color 150ms ease',
                }}
              />
              {label}
              {clicked && (
                <span style={{
                  position: 'absolute', right: '0.75rem',
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--brand)',
                  animation: 'navPulse 0.6s ease-in-out infinite',
                }} />
              )}
            </a>
          )
        })}
      </nav>

      {/* Rôle badge */}
      <div style={{ padding: '0 0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-4)', marginBottom: '0.5rem' }}>
          Rôle
        </div>
        <span className={
          role === 'admin'     ? 'tier-vip'    :
          role === 'animateur' ? 'tier-argent' :
          'tier-membre'
        }>
          {role === 'admin'     ? 'Admin'     :
           role === 'animateur' ? 'Animateur' :
           'Membre'}
        </span>
      </div>

      {/* User + déconnexion */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ padding: '0 0.375rem' }}>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-4)', marginBottom: '0.125rem', fontWeight: 500 }}>
            Connecté
          </div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.875rem', borderRadius: '0.5rem',
            border: 'none', background: 'transparent', color: 'var(--text-3)',
            fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
            width: '100%', fontFamily: 'var(--font-body)', transition: 'all 150ms ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#fef2f2'
            ;(e.currentTarget as HTMLElement).style.color = '#dc2626'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
          }}
        >
          <LogOut size={15} />
          Se déconnecter
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-0)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <style>{`
        @keyframes navPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        a:hover { background: rgba(15,45,53,0.06) !important; }
        a[style*="background: var(--brand)"]:hover { background: var(--brand) !important; }
      `}</style>

      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex"
        style={{ width: '240px', flexShrink: 0, background: 'white', borderRight: '1px solid var(--border)', flexDirection: 'column', overflowY: 'auto' }}
      >
        <Sidebar />
      </aside>

      {/* Sidebar mobile overlay */}
      {open && (
        <>
          <div
            className="lg:hidden"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(15,45,53,0.45)', backdropFilter: 'blur(4px)' }}
          />
          <aside
            className="lg:hidden"
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '240px', zIndex: 50, background: 'white', borderRight: '1px solid var(--border)', overflowY: 'auto', animation: 'fadeIn 0.2s ease both' }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-1)', border: 'none', borderRadius: '0.5rem', padding: '0.375rem', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}
            >
              <X size={15} />
            </button>
            <Sidebar />
          </aside>
        </>
      )}

      {/* Zone principale */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar mobile */}
        <header
          className="flex lg:hidden"
          style={{ height: '56px', background: 'white', borderBottom: '1px solid var(--border)', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', flexShrink: 0 }}
        >
          <button
            onClick={() => setOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <Menu size={22} />
          </button>

          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--brand)', letterSpacing: '-0.02em' }}>
            VHR Privilèges
          </span>

          <div style={{ width: 32 }} />
        </header>

        {/* Contenu scrollable */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(1.25rem, 3vw, 2rem)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}