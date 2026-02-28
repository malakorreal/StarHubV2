
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
    allowed_players: body.allowed_players || null,
    maintenance: body.maintenance,
    maintenance_message: body.maintenance_message || body.maintenanceMessage,
    modpack_version: body.modpack_version || body.modpackVersion,
    ignore_files: body.ignore_files || body.ignoreFiles,
    forge_version: body.forge_version || body.forgeVersion,
    server_ip: body.server_ip || body.serverIp,
    loader_version: body.loader_version || body.loaderVersion,
    announcement: body.announcement,
    announcement_image: body.announcement_image || body.announcementImage,
    background_image: body.background_image || body.backgroundImage
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
    allowed_players: r.allowed_players || [],
    maintenance: r.maintenance || false,
    maintenance_message: r.maintenance_message || "",
    modpackVersion: r.modpack_version || "",
    ignoreFiles: r.ignore_files || [],
    forgeVersion: r.forge_version || "",
    serverIp: r.server_ip || "",
    loaderVersion: r.loader_version || "",
    announcement: r.announcement || "",
    announcementImage: r.announcement_image || "",
    backgroundImage: r.background_image || ""
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
