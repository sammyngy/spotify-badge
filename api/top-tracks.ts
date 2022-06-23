import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTopTracks } from 'lib/spotify'

export async function topTracks(_: VercelRequest, res: VercelResponse) {
	const topTracks = await getTopTracks()

	res.setHeader('Content-Type', 'application/json')
	res.status(200).send(topTracks)
}
