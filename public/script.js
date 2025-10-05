console.log("🟣 Dora Phrasal Verb script.js (browser TTS) loaded");

const responseBox = document.getElementById("responseBox");
const questionInput = document.getElementById("questionInput");
const historyList = document.getElementById("historyList");
const micBtn = document.getElementById("micBtn");

// Chinese translation box under the response
const translationBox = document.createElement("div");
translationBox.id = "chineseTranslation";
translationBox.style.marginTop = "10px";
translationBox.style.fontSize = "0.95em";
translationBox.style.color = "#333";
responseBox.insertAdjacentElement("afterend", translationBox);

// ========= Browser TTS (bilingual EN -> ZH), no ElevenLabs =========
function stopTTS() {
  try { window.speechSynthesis.cancel(); } catch (_) {}
}

function buildBilingualUtterances(englishText, chineseText) {
  const parts = [];

  const english = (englishText || "").trim();
  const chinese = (chineseText || "").trim();

  if (english) {
    const en = new SpeechSynthesisUtterance(english);
    en.lang = "en-US";   // or "en-GB" if you prefer
    en.rate = 1.0;
    en.pitch = 1.0;
    parts.push(en);
  }

  if (chinese) {
    const zh = new SpeechSynthesisUtterance(chinese);
    // "zh-CN" for Simplified; "zh-TW"/"zh-HK" are also valid if your system has them
    zh.lang = "zh-CN";
    zh.rate = 1.0;
    zh.pitch = 1.0;
    parts.push(zh);
  }

  return parts;
}

function speakBilingual(englishText, chineseText) {
  stopTTS(); // cancel anything already speaking

  const queue = buildBilingualUtterances(englishText, chineseText);
  if (queue.length === 0) return;

  let i = 0;
  const playNext = () => {
    if (i >= queue.length) return;
    const u = queue[i++];
    u.onend = playNext;
    window.speechSynthesis.speak(u);
  };
  playNext();
}

// ========= History =========
function clearHistory() {
  historyList.innerHTML = "";
  console.log("🧹 History cleared");
}

function addToHistory(question, answerHtml) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>問：</strong>${question}<br/><strong>答：</strong>${answerHtml}`;
  historyList.prepend(li);
}

// ========= Submit to GPT (uses /api/analyze only) =========
async function submitQuestion() {
  const question = questionInput.value.trim();
  if (!question) {
    alert("⚠️ 請輸入要查詢的片語動詞");
    return;
  }

  stopTTS(); // ensure no TTS while fetching

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

    // Do NOT auto-speak. User presses the Talk button.
    addToHistory(question, `${answer}<br><em>🇨🇳 中文翻譯：</em>${translated}`);
  } catch (err) {
    console.error("GPT error:", err);
    responseBox.textContent = "❌ 發生錯誤，請稍後重試。";
  }

  questionInput.value = "";
}

// ========= Mic input (hold-to-speak) =========
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US"; // Dora will say phrasal verbs in English
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

// ========= Bind UI buttons after DOM ready =========
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById("submitBtn");
  const ttsBtn = document.getElementById("ttsBtn");
  const stopBtn = document.getElementById("stopTTSBtn");
  const clearBtn = document.getElementById("clearBtn");

  if (submitBtn) submitBtn.onclick = submitQuestion;

  if (ttsBtn) {
    ttsBtn.onclick = () => {
      const en = document.getElementById("responseBox")?.textContent || "";
      const zh = document.getElementById("chineseTranslation")?.textContent || "";
      // Strip the "🇨🇳 中文翻譯：" prefix for cleaner TTS
      const zhClean = zh.replace(/^🇨🇳\s*中文翻譯：/u, "").trim();
      speakBilingual(en, zhClean);
    };
  }
  if (stopBtn) stopBtn.onclick = stopTTS;
  if (clearBtn) clearBtn.onclick = clearHistory;
});

// ========= (Optional) Avatar stream hook stays as-is =========
function switchToDIDStream(streamUrl) {
  const iframe = document.getElementById("didVideo");
  const staticAvatar = document.getElementById("avatarImage");
  iframe.src = streamUrl;
  iframe.style.display = "block";
  staticAvatar.style.display = "none";
  console.log("🎥 D-ID stream activated:", streamUrl);
}
