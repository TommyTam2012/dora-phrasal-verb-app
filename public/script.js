console.log("🟣 Dora Phrasal Verb script.js loaded successfully");

const responseBox = document.getElementById("responseBox");
const questionInput = document.getElementById("questionInput");
const historyList = document.getElementById("historyList");
const micBtn = document.getElementById("micBtn");

// 🈶 Chinese translation box under the response
const translationBox = document.createElement("div");
translationBox.id = "chineseTranslation";
translationBox.style.marginTop = "10px";
translationBox.style.fontSize = "0.95em";
translationBox.style.color = "#333";
responseBox.insertAdjacentElement("afterend", translationBox);

let currentExamId = "";

// ================================================================
// Step 1: Open the selected phrasal verb PDF
// ================================================================
function setExam(examId) {
  currentExamId = examId;

  const pdfMap = {
    phrasal01: "https://github.com/TommyTam2012/dora-phrasal-verb-app/raw/main/public/exam/Phrasal1_2.pdf",
    phrasal02: "https://github.com/TommyTam2012/dora-phrasal-verb-app/raw/main/public/exam/Phrasal3_4.pdf",
    phrasal03: "https://github.com/TommyTam2012/dora-phrasal-verb-app/raw/main/public/exam/Phrasal5-6.pdf",
    phrasal04: "https://github.com/TommyTam2012/dora-phrasal-verb-app/raw/main/public/exam/Phrasal7_8.pdf"
  };

  const pdfUrl = pdfMap[examId];
  if (!pdfUrl) {
    alert("⚠️ 該單元的 PDF 尚未上傳。");
    return;
  }

  const newTab = window.open("about:blank", "_blank");
  if (newTab) {
    newTab.location.href = pdfUrl;
    console.log(`📘 Opening: ${pdfUrl}`);
  } else {
    alert("⚠️ 請允許瀏覽器開啟新分頁。");
  }
}

// ================================================================
// Step 2: Clear conversation history
// ================================================================
function clearHistory() {
  historyList.innerHTML = "";
  console.log("🧹 History cleared");
}

// ================================================================
// Step 3: Submit question to GPT
// ================================================================
async function submitQuestion() {
  const question = questionInput.value.trim();
  if (!question) {
    alert("⚠️ 請輸入要查詢的片語動詞");
    return;
  }

  responseBox.textContent = "正在分析中，請稍候...";
  translationBox.textContent = "";

  const userPrompt = [
    { type: "text", text: question }
  ];

  fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: userPrompt })
  })
    .then(res => res.json())
    .then(data => {
      const answer = data.response || "❌ 無法獲取英文回答。";
      const translated = data.translated || "❌ 無法翻譯為中文。";
      const didStream = data.didStreamUrl;

      responseBox.textContent = answer;
      translationBox.textContent = `🇨🇳 中文翻譯：${translated}`;

      speakWithMyVoice(answer);
      if (didStream) switchToDIDStream(didStream);

      addToHistory(question, `${answer}<br><em>🇨🇳 中文翻譯：</em>${translated}`);
    })
    .catch(err => {
      responseBox.textContent = "❌ 發生錯誤，請稍後重試。";
      console.error("GPT error:", err);
    });

  questionInput.value = "";
}

// ================================================================
// Step 4: Add Q&A to history
// ================================================================
function addToHistory(question, answer) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>問：</strong>${question}<br/><strong>答：</strong>${answer}`;
  historyList.prepend(li);
}

// ================================================================
// Step 5: ElevenLabs Voice Output
// ================================================================
async function speakWithMyVoice(text) {
  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (data.didStreamUrl) {
      switchToDIDStream(data.didStreamUrl);
    }

    if (data.audioBase64) {
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audio.play();
    }
  } catch (err) {
    console.error("🎤 Voice error:", err);
  }
}

// ================================================================
// Step 6: Avatar Stream Handling
// ================================================================
function switchToDIDStream(streamUrl) {
  const iframe = document.getElementById("didVideo");
  const staticAvatar = document.getElementById("avatarImage");
  iframe.src = streamUrl;
  iframe.style.display = "block";
  staticAvatar.style.display = "none";
  console.log("🎥 D-ID stream activated:", streamUrl);
}

// ================================================================
// Step 7: Mic Input (Hold-to-Speak)
// ================================================================
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US"; // allow Dora to say phrasal verbs in English
  recognition.continuous = false;
  recognition.interimResults = false;

  let finalTranscript = "";
  let isHoldingMic = false;
  let restartCount = 0;
  const maxRestarts = 3;

  recognition.onstart = () => {
    micBtn.textContent = "🎤 正在錄音... (松開後提交)";
    console.log("🎙️ Mic started");
  };

  recognition.onresult = (event) => {
    finalTranscript = event.results[0][0].transcript;
    console.log("📥 Captured:", finalTranscript);
  };

  recognition.onend = () => {
    if (isHoldingMic && restartCount < maxRestarts) {
      console.log("🔁 Restarting mic");
      restartCount++;
      recognition.start();
    } else {
      micBtn.textContent = "🎤 語音提問";
      if (finalTranscript.trim()) {
        questionInput.value = finalTranscript;
        submitQuestion();
      } else {
        console.log("⚠️ 沒有檢測到語音內容");
      }
    }
  };

  recognition.onerror = (event) => {
    console.error("🎤 Speech error:", event.error);
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

// ================================================================
// Step 8: Bind global functions
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
  window.submitQuestion = submitQuestion;
  window.setExam = setExam;
  window.clearHistory = clearHistory;
});

