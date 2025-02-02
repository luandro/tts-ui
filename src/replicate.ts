import fs from "node:fs";
import path from "node:path";
import Replicate from "replicate";
import { writeFile } from "node:fs/promises";
import removeMd from "remove-markdown";
const replicate = new Replicate();

export async function callReplicate(text: string, audioDir: string): Promise<string> {
	console.log("Starting callReplicate with text:", text);

	const processedText = removeMd(text);
	console.log("Processed text:", processedText);
	const input = {
		text: processedText,
		voice: "af_jessica",
		speed: 1.2,
	};
	console.log("Calling Replicate with input:", input);

	const output = await replicate.run(
		"jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13",
		{ input },
	);
	console.log("Received output from Replicate");

	// Generate unique filename using timestamp
	const timestamp = Date.now();
	const filename = `output-${timestamp}.wav`;
	console.log("Generated filename:", filename);
	console.log("Audio directory path:", audioDir);
	const audioFilePath = path.join(audioDir, filename);
	console.log("Full audio file path:", audioFilePath);

	// Type assertion to handle the output type
	const outputUrl = output as unknown as string;
	await writeFile(
		audioFilePath,
		Buffer.from(await fetch(outputUrl).then((res) => res.arrayBuffer())),
	);
	console.log("Successfully wrote audio file");

	return audioFilePath;
}
