
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { NextResponse } from "next/server"

const REMOTE_API_URL = "https://starhubv2.onrender.com/api/instances"

export async function GET(request) {
  try {
    const res = await fetch(REMOTE_API_URL, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch from remote API: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const res = await fetch(REMOTE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers for the remote API here
        // 'Authorization': `Bearer ${process.env.REMOTE_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to create instance on remote API: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
