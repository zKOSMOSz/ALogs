// This file contains the JavaScript code for the application. It handles the functionality of the logs viewer, including file uploads, theme toggling, and log processing.

function processLogContent(content) {
  const lines = content.split("\n");
  const blocks = [];
  let current = [];
  const tsRegex = /^\[(?:\d{2}:\d{2}:\d{2}|\d{2}[A-Za-z]{3}\d{4}\s+\d{2}:\d{2}:\d{2}\.\d{3})\]/;
  lines.forEach(line => {
    if (tsRegex.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  });
  if (current.length) blocks.push(current);
  return blocks.map(block => {
    const hdr = block[0];
    let cls = null;
    if (hdr.includes("/ERROR]"))      cls = "hljs-logerror";
    else if (hdr.includes("/WARN]"))  cls = "hljs-logwarning";
    return cls
      ? block.map(l => `<span class="${cls}">${l}</span>`).join("\n")
      : block.join("\n");
  }).join("\n");
}

const allowedExtensions = [
  ".log", ".txt", ".php", ".cs", ".css", ".sql", ".md", ".markdown", ".mkd",
  ".js", ".jsx", ".mjs", ".json", ".py", ".rb", ".rs", ".sh", ".bash", ".zsh",
  ".yaml", ".yml", ".xml", ".conf", ".ts", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
  ".go", ".swift", ".kt", ".kts", ".ini", ".bat", ".cmd", ".ps1", ".psm1", ".toml",
  ".properties", ".env", ".dockerfile", ".gradle", ".make", ".mk", ".pl", ".pm", ".vb",
  ".asp", ".aspx", ".jsp", ".vue", ".scss", ".sass", ".less", ".coffee", ".dart",
  ".erl", ".ex", ".exs", ".groovy", ".hs", ".jl", ".lua", ".m", ".matlab", ".pas",
  ".pp", ".r", ".scala", ".sql", ".tsx", ".vb", ".vbs", ".wsf", ".xhtml", ".xsl",
  ".yml", ".cfg", ".conf", ".ini", ".lst", ".out", ".dat", ".csv", ".tsv", ".ts"
];
let logs = JSON.parse(localStorage.getItem('logs')||'[]');
const MAX_STORAGE = 5, RETENTION_DAYS = 1;
let currentLogId = null;

function setThemeIconRotation(theme) {
  const icon = document.getElementById('themeIcon');
  if (theme === 'dark') {
    icon.classList.add('rotated');
  } else {
    icon.classList.remove('rotated');
  }
}

setThemeIconRotation(document.documentElement.getAttribute('data-theme'));

hljs.configure({
  languages:[
    'minecraft','java','csharp','css','sql','dockerfile','markdown',
    'javascript','json','python','ruby','rust','shell',
    'yaml','xml','nginx','php','typescript'
  ]
});

function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const nxt = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('theme', nxt);
  setThemeIconRotation(nxt);
}

function calculateTotalSize(){
  return logs.reduce((acc,l)=>
    acc + (l.fileSize||(l.content.length*2))
  ,0);
}
function updateStorageDisplay(){
  const usedBytes = calculateTotalSize();
  let used;
  if (usedBytes >= 1024 * 1024) {
    used = (usedBytes / (1024 * 1024)).toFixed(2) + 'MB';
  } else if (usedBytes >= 1024) {
    used = (usedBytes / 1024).toFixed(2) + 'KB';
  } else {
    used = usedBytes + 'B';
  }
  document.getElementById('storageInfo').textContent=
    `Storage: ${used} / ${MAX_STORAGE}MB • Retention: ${RETENTION_DAYS} day${RETENTION_DAYS!==1?'s':''}`;
  document.getElementById('storageWarning').textContent=
    parseFloat(usedBytes)/(1024*1024)>=MAX_STORAGE
      ? "History storage is full. New logs may overwrite older entries."
      : "";
}
function updateStorage(){
  const now=Date.now();
  logs=logs.filter(l=>now-l.timestamp<RETENTION_DAYS*86400000);
  while(calculateTotalSize()>MAX_STORAGE*1024*1024) logs.shift();
  localStorage.setItem('logs',JSON.stringify(logs));
  updateStorageDisplay();
}

function uploadLog(){
  const file=document.getElementById('logFile').files[0];
  if(!file)return;
  const ext=file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if(!allowedExtensions.includes(ext)){
    document.getElementById('uploadNotice').textContent=
      `File format ${ext} is not supported.`;
    return;
  }
  document.getElementById('uploadNotice').textContent='';
  const reader=new FileReader();
  reader.onload=e=>{
    let content=e.target.result.replace(/\r\n|\r/g,"\n");
    const fmt=detectFormat(content);
    logs.push({
      id:Date.now(),
      name:file.name,
      content,
      fileSize:file.size,
      format:fmt,
      timestamp:Date.now()
    });
    updateStorage();
    showList();
  };
  reader.readAsText(file);
}

function detectFormat(content){
  const pats = {
    minecraft: /(\[Server(?:\s*thread|Main).*?\/(?:INFO|WARN|ERROR|DEBUG)\]|Minecraft)/,
    dockerfile: /^\s*(FROM|RUN|COPY|EXPOSE)\b/m,
    sql: /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE)\b/mi,
    yaml: /^(\s*---|[\w-]+:\s)/m,
    json: /^\s*[\{\[][\s\S]*[\}\]]\s*$/,
    python: /^\s*(def |import |print\(|# )/m,
    javascript: /^\s*(function|const |let |console\.log|var )/m,
    csharp: /^\s*(using |namespace |public class )/m,
    java: /^\s*(package\s+|import\s+java\.|public\s+class\s+)/m,
    rust: /^\s*(fn |let |mod |unsafe )/m,
    shell: /^\s*(#!\/bin\/(bash|sh)|echo |export |cd |if )/m,
    nginx: /^\s*(server\s*\{|location\s+|nginx)/mi,
    php: /<\?php|^\s*\$[a-z_]+\s*=/mi,
    xml: /^\s*<\?xml|<\/[a-z]+>/mi,
    typescript: /^\s*(interface |type |const [a-z]+:|import )/m,
    properties: /^\s*[\w\.\-]+\s*=/m,
    ini: /^\s*\[.*\]\s*$/m,
    markdown: /^(\s*#|\* |\d+\. )/m,
    css: /^\s*[.#]?[\w\-]+\s*\{/m,
    jsonl: /^\s*\{.*\}\s*$/m,
    log: /^\[\d{2}:\d{2}:\d{2}\]/m
  };
  const order = [
    'minecraft','json','yaml','xml','ini','properties','dockerfile','sql','python','javascript','typescript','csharp','java','rust','shell','nginx','php','markdown','css','jsonl','log'
  ];
  for(const k of order) if(pats[k].test(content)) return k;
  return 'autodetect';
}

function customHighlight(content, lang) {
  if (lang === 'log') {
    return content.replace(/(\[.*?\/ERROR])/g, '<span class="hljs-logerror">$1</span>')
                  .replace(/(\[.*?\/WARN])/g, '<span class="hljs-logwarning">$1</span>')
                  .replace(/(\[.*?\/INFO])/g, '<span class="hljs-loginfo">$1</span>');
  }
  if (lang === 'properties') {
    return content.replace(/^([\w\.\-]+)(\s*=\s*)(.*)$/gm, '<span style="color:#fc8d3a;font-weight:bold;">$1</span>$2<span style="color:#fdba72;">$3</span>');
  }
  if (lang === 'ini') {
    return content
      .replace(/^\s*\[(.*?)\]\s*$/gm, '<span style="color:#fc8d3a;font-weight:bold;">[$1]</span>')
      .replace(/^([\w\.\-]+)(\s*=\s*)(.*)$/gm, '<span style="color:#fdba72;">$1</span>$2<span style="color:#fff;">$3</span>');
  }
  if (lang === 'jsonl') {
    return content.replace(/^(\{.*\})$/gm, '<span style="color:#fc8d3a;">$1</span>');
  }
  return null;
}

function showLog(id){
  currentLogId=id;
  const log=logs.find(l=>l.id===id);
  document.getElementById('uploadSection').classList.add('d-none');
  document.getElementById('logList').classList.add('d-none');
  document.getElementById('logViewer').classList.remove('d-none');
  document.getElementById('logTitle').textContent=log.name;
  document.getElementById('languageSelect').value=log.format;
  updateHighlight(log.format);
}

function updateHighlight(lang){
  const log=logs.find(l=>l.id===currentLogId);
  log.format=lang;
  localStorage.setItem('logs',JSON.stringify(logs));
  const pre=document.getElementById('logContent');
  if(lang==='minecraft'){
    pre.innerHTML=processLogContent(log.content);
  } else if(lang==='plaintext'){
    pre.textContent=log.content;
  } else if(lang==='autodetect'){
    const detected = detectFormat(log.content);
    if (detected === 'minecraft') {
      pre.innerHTML = processLogContent(log.content);
    } else {
      const custom = customHighlight(log.content, detected);
      if (custom) {
        pre.innerHTML = custom;
      } else {
        pre.innerHTML = hljs.highlightAuto(log.content).value;
      }
    }
  } else {
    const custom = customHighlight(log.content, lang);
    if (custom) {
      pre.innerHTML = custom;
    } else {
      pre.innerHTML = hljs.highlight(log.content,{language:lang}).value;
    }
  }
}

function showList(){
  document.getElementById('uploadSection').classList.add('d-none');
  document.getElementById('logViewer').classList.add('d-none');
  document.getElementById('logList').classList.remove('d-none');
  const out=document.querySelector('.log-list');
  out.innerHTML=logs.map(l=>`
    <div class="card mb-2"><div class="card-body py-2 d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">${l.name}</h6>
        <small class="text-muted">${new Date(l.timestamp).toLocaleString()} • ${formatSize(l.fileSize||(l.content.length*2))} • ${l.format}</small>
      </div>
      <button class="btn btn-sm btn-primary" onclick="showLog(${l.id})">View</button>
    </div></div>`).join('');
}

function showUpload(){
  document.getElementById('uploadSection').classList.remove('d-none');
  document.getElementById('logList').classList.add('d-none');
  document.getElementById('logViewer').classList.add('d-none');
  document.getElementById('logFile').value='';
}

function scrollToTop(){
  document.getElementById('logContent').scrollTo({top:0,behavior:'smooth'});
}
function scrollToBottom(){
  const el=document.getElementById('logContent');
  el.scrollTo({top:el.scrollHeight,behavior:'smooth'});
}

// init
updateStorage();
showUpload();

// Function to format file size
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return bytes + ' B';
  }
}