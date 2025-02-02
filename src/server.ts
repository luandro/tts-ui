import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { callReplicate } from "./replicate";

require("dotenv").config();
type GenerateBody = {
	text: string;
	auth: string;
};

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "password";
const AUDIO_DIR = process.env.AUDIO_DIR || "/tmp/audio";

try {
	if (!existsSync(AUDIO_DIR)) {
		mkdirSync(AUDIO_DIR, { recursive: true, mode: 0o755 });
	}
} catch (error) {
	console.error(`Failed to create audio directory: ${error}`);
	// Throw error since we need the audio directory to function
	throw new Error(
		"Could not create required audio directory. Please check permissions.",
	);
}
const app = new Elysia()
	// Serve static files from audio directory
	.use(
		staticPlugin({
			prefix: "/audio",
			assets: AUDIO_DIR,
		}),
	)
	.use(
		staticPlugin({
			prefix: "",
			assets: "public",
		}),
	)
	// Auth endpoint
	.post("/auth", ({ body }) => {
		const { password } = body as { password: string };
		if (password !== AUTH_PASSWORD) {
			return new Response(JSON.stringify({ error: "Invalid password" }), {
				status: 401,
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer invalid",
				},
			});
		}
		return new Response(JSON.stringify({ success: true }), {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${AUTH_PASSWORD}`,
			},
		});
	})
	// Get list of audio files endpoint
	.get("/audios", async ({ headers }) => {
		const auth = headers.authorization?.split(" ")[1];
		if (auth !== AUTH_PASSWORD) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		try {
			const files = readdirSync(AUDIO_DIR);
			const audioFiles = [];
			console.log("Files in audio directory:", files);
			for (const file of files) {
				if (file.endsWith(".mp3") || file.endsWith(".wav")) {
					const filePath = path.join(AUDIO_DIR, file);
					const stats = statSync(filePath);

					audioFiles.push({
						filename: file,
						date: stats.mtime.toISOString(),
					});
				}
			}

			return new Response(JSON.stringify(audioFiles), {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${AUTH_PASSWORD}`,
				},
			});
		} catch (error) {
			console.error("Error getting audio files:", error);
			return new Response(
				JSON.stringify({ error: "Failed to get audio files" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	})

	// Generate audio endpoint
	.post("/generate", async ({ body, headers }) => {
		const { text } = body as GenerateBody;
		const auth = headers.authorization?.split(" ")[1];
		if (auth !== AUTH_PASSWORD) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		console.log("Generating audio for text:", text);
		const audioFilePath = await callReplicate(text, AUDIO_DIR);
		console.log("Generated audio file at:", audioFilePath);
		const audioFileName = audioFilePath.split("/").pop();
		console.log("Audio filename:", audioFileName);

		return new Response(JSON.stringify({ audioFileName }), {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${AUTH_PASSWORD}`,
			},
		});
	})
	.listen(3001);
export default app;
