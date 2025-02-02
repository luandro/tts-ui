async function authenticate() {
	const pwd = document.getElementById("password").value;

	try {
		const res = await fetch("/auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: pwd }),
		});

		if (res.ok) {
			localStorage.setItem("auth", pwd);
			document.getElementById("auth").style.display = "none";
			document.getElementById("generator").style.display = "flex";
			loadAudios();
		} else {
			const data = await res.json();
			alert(data.error || "Authentication failed");
		}
	} catch (error) {
		alert(`Error authenticating: ${error.message}`);
	}
}

window.onload = async () => {
	const stored = localStorage.getItem("auth");
	if (!stored) return;

	try {
		const res = await fetch("/auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: stored }),
		});

		if (res.ok) {
			document.getElementById("auth").style.display = "none";
			document.getElementById("generator").style.display = "flex";
			loadAudios();
			return;
		}

		const data = await res.json();
		showAuthError(data.error || "Authentication failed");
		localStorage.removeItem("auth");
	} catch (error) {
		console.error("Error checking auth:", error);
		showAuthError(`Error checking authentication: ${error.message}`);
		localStorage.removeItem("auth");
	}
};

function showAuthError(message) {
	const authError = document.getElementById("auth-error");
	authError.textContent = message;
	authError.style.display = "block";
}

async function generate() {
	const text = document.getElementById("textArea").value;
	const auth = localStorage.getItem("auth");

	try {
		const res = await fetch("/generate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${auth}`,
			},
			body: JSON.stringify({ text, auth }),
		});

		if (res.ok) {
			const data = await res.json();
			const audio = document.getElementById("audio");
			audio.src = `/audio/${data.audioFileName}`;
			audio.style.display = "block";
			audio.play();
			loadAudios(); // Refresh the audio list
		} else {
			alert("Failed to generate audio");
		}
	} catch (error) {
		alert(`Error generating audio: ${error.message}`);
	}
}

async function loadAudios(page = 1) {
	console.log("Loading audios...");
	const auth = localStorage.getItem("auth");
	const itemsPerPage = 3;
	console.log("Auth token:", auth);
	try {
		const audios = await fetchAudios(auth);
		const contentDiv = document.getElementById("content");
		if (!audios) return;

		if (audios.length === 0) {
			console.log("No audios found");
			contentDiv.innerHTML = "<p>No audios found.</p>";
			return;
		}

		contentDiv.innerHTML = ""; // Clear existing content

		// Sort audios by date, most recent first
		const sortedAudios = sortAudiosByDate(audios);
		console.log("Sorted audios:", sortedAudios);

		// Calculate pagination
		const { paginatedAudios, totalPages } = getPaginatedAudios(
			sortedAudios,
			page,
			itemsPerPage,
		);

		// Create and append audio items
		createAudioItems(paginatedAudios, contentDiv);

		// Add pagination controls
		createPaginationControls(page, totalPages, contentDiv);
	} catch (error) {
		console.error("Error loading audios:", error);
		document.getElementById("content").innerHTML =
			'<p class="error">Error loading audios.</p>';
	}
}

async function fetchAudios(auth) {
	const response = await fetch("/audios", {
		headers: {
			Authorization: `Bearer ${auth}`,
		},
	});
	console.log("Response status:", response.status);

	if (!response.ok) {
		const err = await response.json();
		console.error("Error response:", err);
		const contentDiv = document.getElementById("content");
		contentDiv.innerHTML = `<p class="error">${err.error || "Unknown error"}</p>`;
		return null;
	}

	return await response.json();
}

function sortAudiosByDate(audios) {
	return audios.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPaginatedAudios(audios, page, itemsPerPage) {
	const totalPages = Math.ceil(audios.length / itemsPerPage);
	const startIndex = (page - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	return {
		paginatedAudios: audios.slice(startIndex, endIndex),
		totalPages,
	};
}

function createAudioItems(audios, container) {
	for (const audio of audios) {
		const div = document.createElement("div");
		div.className = "audio-item";
		const filename = audio.filename;
		console.log("Creating audio item:", { date: audio.date, filename });

		div.innerHTML = `
        <span>Date: ${new Date(audio.date).toLocaleString()}</span>
        <button onclick="playAudio('${filename}')" class="play-button">Play</button>
      `;
		container.appendChild(div);
	}
}

function createPaginationControls(currentPage, totalPages, container) {
	const paginationDiv = document.createElement("div");
	paginationDiv.className = "pagination";

	const prevButton =
		currentPage === 1
			? ""
			: `<button onclick="loadAudios(${currentPage - 1})">Previous</button>`;

	paginationDiv.innerHTML = `
		${prevButton}
		<span>Page ${currentPage} of ${totalPages}</span>
		<button onclick="loadAudios(${Math.min(totalPages, currentPage + 1)})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
	`;
	container.appendChild(paginationDiv);
}

function playAudio(filename) {
	const audioUrl = `/audio/${filename}`;
	console.log("Playing audio:", audioUrl);
	const audio = document.getElementById("audio");
	audio.src = audioUrl;
	audio.style.display = "block";
	audio.play();
}
