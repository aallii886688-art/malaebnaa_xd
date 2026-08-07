import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notify } from '@/lib/notify'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { teamId, approve } = await req.json() as { teamId: string; approve: boolean }
  if (!teamId) return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: team } = await admin
    .from('tournament_teams')
    .select('captain_user_id, team_name, tournaments(name, owner_id)')
    .eq('id', teamId)
    .single()

  if (!team) return NextResponse.json({ error: 'الفريق غير موجود' }, { status: 404 })

  const tour = (Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments) as { name: string; owner_id: string } | null
  if (tour?.owner_id !== user.id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const status = approve ? 'approved' : 'rejected'
  await admin.from('tournament_teams').update({ status }).eq('id', teamId)

  await notify(approve ? 'team_approved' : 'team_rejected', team.captain_user_id, {
    tournamentName: tour?.name ?? 'البطولة',
    teamName: team.team_name,
    entityType: 'tournament_team',
    entityId: teamId,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
