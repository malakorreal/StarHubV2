
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { NextResponse } from "next/server"
import crypto from "node:crypto"

export async function GET(request) {
  const { data, error } = await supabase
    .from('instances')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data || []).map(r => ({
    id: r.id,
    name: r.name || "",
    icon: r.icon || "",
    logo: r.logo || "",
    loader: r.loader || "",
    version: r.version || "",
    modpackUrl: r.modpack_url || r.modpackUrl || r.fileUrl || "",
    discord: r.discord || "",
    website: r.website || "",
    description: r.description || ""
  }))

  // Caching strategy
  const strategy = (process.env.API_CACHE_STRATEGY || 'etag').toLowerCase()
  const body = JSON.stringify(normalized)
  const commonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Accept, If-None-Match',
    'Last-Modified': new Date().toUTCString(),
  }

  if (strategy === 'no-store') {
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  }

  // ETag / If-None-Match
  const etag = `"${crypto.createHash('sha1').update(body).digest('hex')}"`
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ...commonHeaders,
        ETag: etag,
        'Cache-Control': 'public, max-age=0, must-revalidate',
      }
    })
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      ...commonHeaders,
      ETag: etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    }
  })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
     return NextResponse.json({ error: 'Server misconfiguration: Missing Service Role Key' }, { status: 500 })
  }

  const body = await request.json()
  const payload = {
    id: (body.id || "").toString(),
    name: (body.name || "").toString(),
    icon: body.icon || "",
    logo: body.logo || "",
    loader: body.loader || "",
    version: body.version || "",
    modpack_url: body.modpack_url || body.modpackUrl || body.fileUrl || "",
    discord: body.discord || "",
    website: body.website || "",
    description: body.description || ""
  }
  
  if (!payload.id || !payload.name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('instances')
    .insert([payload])
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
    description: r.description || ""
  })
}
