const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

let history = [];

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  history.push({ role: 'user', content: message });

  const loadingMsg = addMessage("<span class='typing'></span>", "ai");

  try {
    const res = await fetch('https://ai-chatbot-s5k7.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    loadingMsg.remove();

    addMessage(data.reply, 'ai');
    history.push({ role: 'assistant', content: data.reply });

  } catch (err) {
    loadingMsg.remove();
    addMessage('Error: ' + err.message, 'error');
    history.pop();
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerHTML = formatMessage(text);

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return div;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}