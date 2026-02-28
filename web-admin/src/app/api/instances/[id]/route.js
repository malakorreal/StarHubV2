
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
     return NextResponse.json({ error: 'Server misconfiguration: Missing Service Role Key' }, { status: 500 })
  }

  const { id } = params
  const body = await request.json()
  const payload = {
    name: body.name,
    icon: body.icon,
    logo: body.logo,
    loader: body.loader,
    version: body.version,
    modpack_url: body.modpack_url || body.modpackUrl || body.fileUrl,
    discord: body.discord,
    website: body.website,
    description: body.description,
    allowed_players: body.allowed_players || null
  }

  const { data, error } = await supabaseAdmin
    .from('instances')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const r = data[0]
  return NextResponse.json({
    id: r.id,
    name: r.name || "",
    icon: r.icon || "",
    logo: r.logo || "",
    loader: r.loader || "",
    version: r.version || "",
    modpackUrl: r.modpack_url || r.modpackUrl || r.fileUrl || "",
    discord: r.discord || "",
    website: r.website || "",
    description: r.description || "",
    allowed_players: r.allowed_players || []
  })
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
     return NextResponse.json({ error: 'Server misconfiguration: Missing Service Role Key' }, { status: 500 })
  }

  const { id } = params

  const { error } = await supabaseAdmin
    .from('instances')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
