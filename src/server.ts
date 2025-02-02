import { mkdirSync, existsSync } from "node:fs";
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
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
	throw new Error("Could not create required audio directory. Please check permissions.");
}
const app = new Elysia()
	// Serve static files from audio directory
	.use(
		staticPlugin({
			prefix: "/audio",
			assets: AUDIO_DIR,
		}),
	)
	// Serve UI HTML
	.get("/", () => {
		return new Response(
			`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Audio Generator</title>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      font-family: Arial, sans-serif;
    }
    #auth, #content {
      display: flex;
      height: 100%;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    textarea {
      width: 80%;
      height: 60%;
      font-size: 16px;
      padding: 10px;
    }
    button {
      margin-top: 20px;
      padding: 10px 20px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div id="auth">
    <input type="password" id="password" placeholder="Enter password" />
    <button onclick="authenticate()">Login</button>
  </div>
  <div id="content" style="display: none;">
    <textarea id="textArea" placeholder="Enter text or markdown"></textarea>
    <button onclick="generate()">Generate Audio</button>
    <audio id="audio" controls style="display: none; margin-top: 20px;"></audio>
  </div>
  <script>
    function authenticate() {
      const pwd = document.getElementById('password').value;
      if(pwd === '${AUTH_PASSWORD}') {
        localStorage.setItem('auth', pwd);
        document.getElementById('auth').style.display = 'none';
        document.getElementById('content').style.display = 'flex';
      } else {
        alert('Incorrect password');
      }
    }
    window.onload = function(){
      const stored = localStorage.getItem('auth');
      if(stored === '${AUTH_PASSWORD}') {
        document.getElementById('auth').style.display = 'none';
        document.getElementById('content').style.display = 'flex';
      }
    };
    async function generate() {
      const text = document.getElementById('textArea').value;
      const auth = localStorage.getItem('auth');
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, auth })
      });
      if(res.ok) {
        console.log('Audio generated successfully');
        const data = await res.json();
        const audio = document.getElementById('audio');
        audio.src = '/audio/' + data.audioFileName;
        audio.style.display = 'block';
        audio.play();
      } else {
        alert('Failed to generate audio');
      }
    }
  </script>
</body>
</html>
    `,
			{
				headers: {
					"Content-Type": "text/html",
				},
			},
		);
	})

	// Generate audio endpoint
	.post("/generate", async ({ body }) => {
		const { text, auth } = body as GenerateBody;
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
			headers: { "Content-Type": "application/json" },
		});
	})
	.listen(3001);

export default app;
