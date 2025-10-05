console.log("🟣 Dora Phrasal Verb script.js loaded");

const responseBox = document.getElementById("responseBox");
const questionInput = document.getElementById("questionInput");
const historyList = document.getElementById("historyList");
const micBtn = document.getElementById("micBtn");

// Chinese translation box
const translationBox = document.createElement("div");
translationBox.id = "chineseTranslation";
translationBox.style.marginTop = "10px";
translationBox.style.fontSize = "0.95em";
translationBox.style.color = "#333";
responseBox.insertAdjacentElement("afterend", translationBox);

// ---- TTS: single global audio player to prevent overlap ----
let ttsAudio = new Audio();
ttsAudio.preload = "auto";
let isPlayingTTS = false;

function stopTTS() {
  try {
    if (window.speechSynthesis && window.speechSynthesis.cancel) {
      window.speechSynthesis.cancel(); // stop any browser TTS just in case
    }
  } catch (_) {}
  if (ttsAudio) {
    ttsAudio.pause();
    ttsAudio.currentTime = 0;
  }
  isPlayingTTS = false;
}

async function speakWithMyVoice(text) {
  const clean = (text || "").toString().trim();
  if (!clean) return;

  // hard-stop anything already speaking (browser or audio)
  stopTTS();

  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean })
    });

    const data = await res.json();
    if (!res.ok || !data.audioBase64) {
      console.error("🎤 TTS error:", data);
      return;
    }

    // Load the new audio into the single player and play
    ttsAudio.src = `data:audio/mpeg;base64,${data.audioBase64}`;
    const playPromise = ttsAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    isPlayingTTS = true;
    ttsAudio.onended = () => { isPlayingTTS = false; };
  } catch (err) {
    console.error("🎤 Voice error:", err);
  }
}

// ---- PDFs (local) ----
let currentExamId = "";
function setExam(examId) {
  currentExamId = examId;
  const pdfMap = {
    phrasal01: "/exam/Phrasal1_2.pdf",
    phrasal02: "/exam/Phrasal3_4.pdf",
    phrasal03: "/exam/Phrasal5-6.pdf",
    phrasal04: "/exam/Phrasal7_8.pdf"
  };
  const pdfUrl = pdfMap[examId];
  if (!pdfUrl) {
    alert("⚠️ 該單元的 PDF 尚未上傳。");
    return;
  }
  const newTab = window.open("about:blank", "_blank");
  if (newTab) newTab.location.href = pdfUrl;
  else alert("⚠️ 請允許瀏覽器開啟新分頁。");
}

// ---- History ----
function clearHistory() {
  historyList.innerHTML = "";
  console.log("🧹 History cleared");
}

function addToHistory(question, answerHtml) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>問：</strong>${question}<br/><strong>答：</strong>${answerHtml}`;
  historyList.prepend(li);
}

// ---- Submit to GPT (NO auto-speak here) ----
async function submitQuestion() {
  const question = questionInput.value.trim();
  if (!question) {
    alert("⚠️ 請輸入要查詢的片語動詞");
    return;
  }

  // Stop any current speech when a new query starts
  stopTTS();

  responseBox.textContent = "正在分析中，請稍候...";
  translationBox.textContent = "";

  const userPrompt = [{ type: "text", text: question }];

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: userPrompt })
    });
    const data = await res.json();

    const answer = data.response || "❌ 無法獲取英文回答。";
    const translated = data.translated || "❌ 無法翻譯為中文。";

    responseBox.textContent = answer;
    translationBox.textContent = `🇨🇳 中文翻譯：${translated}`;

    // 🚫 Do NOT auto-speak here (prevents double voice).
    // User will press the Talk button explicitly.

    addToHistory(question, `${answer}<br><em>🇨🇳 中文翻譯：</em>${translated}`);
  } catch (err) {
    console.error("GPT error:", err);
    responseBox.textContent = "❌ 發生錯誤，請稍後重試。";
  }

  questionInput.value = "";
}

// ---- Avatar stream (unchanged) ----
function switchToDIDStream(streamUrl) {
  const iframe = document.getElementById("didVideo");
  const staticAvatar = document.getElementById("avatarImage");
  iframe.src = streamUrl;
  iframe.style.display = "block";
  staticAvatar.style.display = "none";
  console.log("🎥 D-ID stream activated:", streamUrl);
}

// ---- Mic input (hold-to-speak) ----
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  let finalTranscript = "";
  let isHoldingMic = false;
  let restartCount = 0;
  const maxRestarts = 3;

  recognition.onstart = () => {
    micBtn.textContent = "🎤 正在錄音... (松開後提交)";
  };

  recognition.onresult = (event) => {
    finalTranscript = event.results[0][0].transcript;
  };

  recognition.onend = () => {
    micBtn.textContent = "🎤 語音提問";
    if (isHoldingMic && restartCount < maxRestarts) {
      restartCount++;
      recognition.start();
    } else {
      if (finalTranscript.trim()) {
        questionInput.value = finalTranscript;
        submitQuestion();
      }
    }
  };

  recognition.onerror = () => {
    micBtn.textContent = "🎤 語音提問";
  };

  micBtn.addEventListener("mousedown", () => {
    isHoldingMic = true;
    restartCount = 0;
    finalTranscript = "";
    recognition.start();
  });
  micBtn.addEventListener("mouseup", () => {
    isHoldingMic = false;
    recognition.stop();
  });
  micBtn.addEventListener("touchstart", () => {
    isHoldingMic = true;
    restartCount = 0;
    finalTranscript = "";
    recognition.start();
  });
  micBtn.addEventListener("touchend", () => {
    isHoldingMic = false;
    recognition.stop();
  });
}

// ---- Bind buttons after DOM ready ----
document.addEventListener("DOMContentLoaded", () => {
  window.submitQuestion = submitQuestion;
  window.setExam = setExam;
  window.clearHistory = clearHistory;

  // Wire TTS buttons explicitly
  const ttsBtn = document.getElementById("ttsBtn");
  const stopBtn = document.getElementById("stopTTSBtn");
  if (ttsBtn) {
    ttsBtn.onclick = () => {
      const txt = `${responseBox.textContent}\n\n${document.getElementById("chineseTranslation")?.textContent || ""}`;
      speakWithMyVoice(txt);
    };
  }
  if (stopBtn) stopBtn.onclick = stopTTS;
});
