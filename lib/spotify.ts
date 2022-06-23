import fetch from 'isomorphic-unfetch'

import {
	TOKEN_ENDPOINT,
	NOW_PLAYING_ENDPOINT,
	REFRESH_TOKEN,
	CLIENT_ID,
	CLIENT_SECRET,
} from '../consts'

export type PlaybackState = {
	progress: number
	duration: number
	isPlaying: boolean
}

type Track = {
	name: string
	url: string
	album: string
	artist: string
	coverUrl: string
}

type NowPlaying = {
	state: PlaybackState
	track: Track | null
}

export const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

async function getAccessToken() {
	const payload = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: REFRESH_TOKEN,
	})
	const res = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: payload.toString(),
	})

	const { access_token } = await res.json()

	return access_token
}

function formatTrack({ name, album, artists, external_urls }: SpotifyApi.TrackObjectFull): Track {
	return {
		name,
		album: album.name,
		artist: artists.map((a) => a.name).join(', '),
		coverUrl: album.images[album.images.length - 1]?.url,
		url: external_urls.spotify,
	}
}

function formatPlaybackState(data: SpotifyApi.CurrentlyPlayingResponse): PlaybackState {
	const { progress_ms, is_playing, item } = data

	return {
		duration: item?.duration_ms ?? 0,
		progress: progress_ms ?? 0,
		isPlaying: is_playing,
	}
}

function formatNowPlaying(data: SpotifyApi.CurrentlyPlayingResponse): NowPlaying {
	return {
		state: formatPlaybackState(data),
		track:
			data.item !== null || data.currently_playing_type === 'track'
				? formatTrack(data.item as SpotifyApi.TrackObjectFull)
				: null,
	}
}

function formatTopTracks({ items }: SpotifyApi.UsersTopTracksResponse): Track[] {
	return items.slice(0, 10).map(formatTrack)
}

async function getCoverBase64(url: string) {
	const res = await fetch(url)
	const buff = await res.arrayBuffer()

	return Buffer.from(buff).toString('base64')
}

export async function getNowPlaying(
	{ coverFormat }: { coverFormat: 'url' | 'base64' } = { coverFormat: 'url' }
): Promise<NowPlaying | null> {
	const token = await getAccessToken()
	const res = await fetch(NOW_PLAYING_ENDPOINT, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})

	if (res.status !== 200) {
		return null
	}

	const data: SpotifyApi.CurrentlyPlayingResponse = await res.json()
	const nowPlaying = formatNowPlaying(data)

	if (coverFormat === 'base64' && nowPlaying.track !== null) {
		const coverBase64 = await getCoverBase64(nowPlaying.track.coverUrl)

		nowPlaying.track.coverUrl = `data:image/jpeg;base64,${coverBase64}`
	}

	return nowPlaying
}

export async function getTopTracks() {
	const accessToken = await getAccessToken()
	const res = await fetch('https://api.spotify.com/v1/me/top/tracks', {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
	const data: SpotifyApi.UsersTopTracksResponse = await res.json()

	return formatTopTracks(data)
}
