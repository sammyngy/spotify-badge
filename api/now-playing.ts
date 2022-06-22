import { VercelRequest, VercelResponse } from "@vercel/node";
import { getNowPlaying } from "../lib/spotify";

export default async function nowPlaying(req: VercelRequest, res: VercelResponse) {
	const track = await getNowPlaying();

	res.setHeader("Content-Type", "application/json");
	res.setHeader("Cache-Control", "s-maxage=1");
	res.status(200).send(track);
}
