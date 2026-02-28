
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { NextResponse } from "next/server"

const REMOTE_API_BASE = "https://starhubv2.onrender.com/api/instances"

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  
  try {
    const body = await request.json()
    const res = await fetch(`${REMOTE_API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to update instance on remote API: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    const res = await fetch(`${REMOTE_API_BASE}/${id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to delete instance on remote API: ${res.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
