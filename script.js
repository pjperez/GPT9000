let apiKey = localStorage.getItem('openai_api_key');
if (!apiKey) {
  apiKey = prompt('Enter your OpenAI API key (kept local only):');
  if (apiKey) localStorage.setItem('openai_api_key', apiKey);
}

const fs = {
  '/': {
    type: 'dir', children: {
      home: {
        type: 'dir', children: {
          'readme.txt': { type: 'file', content: 'Welcome to GPT-9000 Terminal. Use `help` to get started.' }
        }
      },
      sys: {
        type: 'dir', children: {
          motd: { type: 'file', content: 'Stay curious. Stay weird.' }
        }
      }
    }
  }
};

let currentPath = ['/'];
let history = [];
let historyIndex = -1;

function resolvePath(pathArr) {
  let node = fs['/'];
  for (let i = 1; i < pathArr.length; i++) {
    if (!node.children || !node.children[pathArr[i]]) return null;
    node = node.children[pathArr[i]];
  }
  return node;
}

function currentDir() {
  return resolvePath(currentPath);
}

const commands = {
  pwd: () => currentPath.join('/') || '/',
  ls: () => {
    const dir = currentDir();
    return Object.keys(dir.children || {}).join('  ');
  },
  cd: (target) => {
    if (!target) return 'Usage: cd <dir>';
    if (target === '/') currentPath = ['/'];
    else if (target === '..') currentPath.pop();
    else {
      const newPath = [...currentPath, target];
      const node = resolvePath(newPath);
      if (node && node.type === 'dir') currentPath = newPath;
      else return 'No such directory';
    }
    return '';
  },
  cat: (file) => {
    if (!file) return 'Usage: cat <file>';
    const dir = currentDir();
    const f = dir.children?.[file];
    return (f && f.type === 'file') ? f.content : 'No such file';
  },
  help: () => `Available commands:
  help  logout  clear  version  model  fortune  motd
  system info  beep  ascii <text>
  pwd  ls  cd <dir>  cat <file>`,
  logout: () => { localStorage.removeItem('openai_api_key'); location.reload(); return 'Logging out...'; },
  clear: () => { output.innerHTML = ''; ghost.innerHTML = ''; return ''; },
  version: () => 'GPT-9000 v1.0 (model: gpt-4)',
  model: () => 'Currently using OpenAI GPT-4',
  fortune: () => ['You will debug something today.', 'Beware off-by-one errors.', '42 is the answer.'][Math.floor(Math.random()*3)],
  motd: () => 'Welcome to the GPT-9000 terminal. Keep it weird.',
  'system info': () => `GPT-OS v0.9\nRAM: 128MB\nEntropy pool: unstable\nUptime: ${Math.floor(performance.now()/1000)}s`,
  beep: () => { new AudioContext().createOscillator().connect(new AudioContext().destination).start().stop(); return '[beep]'; },
  ascii: (args) => ` ____  ____\n|  _ \\|  _ \\\n| | | | | | |\n| |_| | |_| |\n|____/|____/\n${args}`
};

const bootLines = [
  '*** GPT-9000 AI TERMINAL ***',
  '',
  'Initializing hardware...',
  'Memory check: 131072 KB OK',
  'Loading neural matrix kernel [OK]',
  'Establishing uplink to OpenAI core...',
  'ERROR: Quantum entropy generator detected a duplicate bit!',
  'Press any key to continue...'
];

const output = document.getElementById('output');
const ghost = document.getElementById('ghost');
const inputLine = document.getElementById('input-line');
const userInput = document.getElementById('user-input');

let lineIndex = 0;
let charIndex = 0;
let paused = false;

function typeLine() {
  if (lineIndex >= bootLines.length) return;
  const line = bootLines[lineIndex];
  const span = document.createElement('span');
  output.appendChild(span);
  function typeChar() {
    if (charIndex < line.length) {
      span.textContent += line[charIndex++];
      ghost.textContent = output.textContent;
      setTimeout(typeChar, 20 + Math.random() * 30);
    } else {
      output.appendChild(document.createElement('br'));
      lineIndex++;
      charIndex = 0;
      if (line.includes('Press any key')) {
        paused = true;
        document.addEventListener('keydown', resumeBoot);
        document.addEventListener('touchstart', resumeBoot);
      } else {
        setTimeout(typeLine, 200 + Math.random() * 300);
      }
    }
  }
  typeChar();
}

function resumeBoot() {
  if (!paused) return;
  paused = false;
  document.removeEventListener('keydown', resumeBoot);
  document.removeEventListener('touchstart', resumeBoot);
  output.appendChild(document.createElement('br'));
  output.appendChild(document.createTextNode('Continuing...'));
  output.appendChild(document.createElement('br'));
  ghost.textContent = output.textContent;
  setTimeout(() => {
    output.appendChild(document.createElement('br'));
    output.appendChild(document.createTextNode('System ready. Type your message below:'));
    output.appendChild(document.createElement('br'));
    ghost.textContent = output.textContent;
    inputLine.style.display = 'block';
    userInput.focus();
  }, 1000);
}

typeLine();

userInput.addEventListener('keydown', async function(e) {
  if (e.key === 'ArrowUp') {
    if (history.length > 0 && historyIndex > 0) {
      historyIndex--;
      userInput.value = history[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    if (history.length > 0 && historyIndex < history.length - 1) {
      historyIndex++;
      userInput.value = history[historyIndex];
    } else {
      userInput.value = '';
    }
  } else if (e.key === 'Enter') {
    const msg = userInput.value.trim();
    if (msg !== '') {
      history.push(msg);
      historyIndex = history.length;
    }
    const userMsg = document.createElement('div');
    userMsg.textContent = '> ' + msg;
    output.appendChild(userMsg);
    userInput.value = '';

    const [cmd, ...args] = msg.split(' ');
    const argStr = args.join(' ');

    if (commands[cmd]) {
      const result = commands[cmd](argStr);
      if (result) {
        const reply = document.createElement('div');
        reply.textContent = result;
        output.appendChild(reply);
      }
      ghost.textContent = output.textContent;
      output.scrollTop = output.scrollHeight;
      return;
    }

    const botMsg = document.createElement('div');
    botMsg.textContent = '...';
    output.appendChild(botMsg);
    ghost.textContent = output.textContent;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: msg }
          ]
        })
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '[no reply]';
      botMsg.textContent = reply;
    } catch (err) {
      botMsg.textContent = '[error contacting OpenAI]';
    }

    ghost.textContent = output.textContent;
    output.scrollTop = output.scrollHeight;
  }
});
