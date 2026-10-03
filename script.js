const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const tabsContainer = document.getElementById('tabs-container');
const previewTitle = document.getElementById('preview-title');

let fileStorage = {};
let activeId = null;
let currentUrl = null;

// Kararlı Başlangıç Şablonu
const testTemplate = `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; text-align: center; padding: 30px; background: #fafafa; color: #333; }\n    .btn { display: inline-block; padding: 10px 20px; color: white; background: #0078d7; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 5px; }\n  </style>\n</head>\n<body>\n  <h2>Her Şey Kusursuz Çalışıyor!</h2>\n  <p>Çoklu dosya okuma, yeni alan oluşturma (+) ve önizleme aktif.</p>\n  <a href="https://google.com" target="_blank" class="btn">Yönlendirme Testi</a>\n  <a href="data:text/plain;charset=utf-8,Test%20Basarili" download="test.txt" class="btn" style="background:#28a745;">İndirme Testi</a>\n</body>\n</html>`;

// Sayfa / Alan Oluşturma
function createPage(name, content = "") {
    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    fileStorage[id] = { name: name, content: content };
    renderTabs();
    selectPage(id);
}

// Oluştur Buton Dinleyicisi
document.getElementById('add-page-btn').addEventListener('click', () => {
    const input = document.getElementById('new-file-name');
    const name = input.value.trim();
    if (name !== "") {
        createPage(name, "");
        input.value = "";
    }
});

// Sekmeleri Arayüze Çizme
function renderTabs() {
    tabsContainer.innerHTML = "";
    Object.keys(fileStorage).forEach(id => {
        const tab = document.createElement('div');
        tab.className = `tab ${id === activeId ? 'active' : ''}`;
        tab.innerHTML = `${fileStorage[id].name} <span class="close-btn">×</span>`;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('close-btn')) selectPage(id);
        });
        
        tab.querySelector('.close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            closePage(id);
        });
        tabsContainer.appendChild(tab);
    });
}

// Sayfa Seçme
function selectPage(id) {
    if (activeId && fileStorage[activeId]) {
        fileStorage[activeId].content = editor.value;
    }
    activeId = id;
    editor.value = fileStorage[id].content;
    renderTabs();
    updateMeta();
    updatePreview();
}

// Sayfa Kapatma
function closePage(id) {
    delete fileStorage[id];
    const remaining = Object.keys(fileStorage);
    if (remaining.length > 0) {
        selectPage(activeId === id ? remaining : activeId);
    } else {
        activeId = null;
        editor.value = "";
        renderTabs();
        updateMeta();
        preview.srcdoc = "";
    }
}

// 📂 BİLGİSAYARDAN ÇOKLU DOSYA SEÇME VE OKUMA SİSTEMİ
document.getElementById('file-chooser').addEventListener('change', (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            createPage(file.name, event.target.result);
        };
        reader.readAsText(file, 'UTF-8');
    });
    e.target.value = ""; 
});

// Güvenli Ham Kod Görüntüleme Mantığı (Hatalı parça temizlendi)
function parseBackendConsole(code) {
    let lines = code.split('\n');
    let outputLog = [];
    lines.forEach(line => {
        let t = line.trim();
        if (t.includes('print') || t.includes('cout') || t.includes('System.out') || t.includes('Console.Write') || t.includes('echo')) {
            outputLog.push(t);
        }
    });
    return outputLog.join('\n') || "[Okuma Modu]: Dosya başarıyla görüntülendi.\nKod bloğu hatasız yüklendi.";
}

// Kilitlenmeyen Önizleme Motoru (İndirme ve Yönlendirme Destekli Blob URL)
function updatePreview() {
    if (activeId && fileStorage[activeId]) fileStorage[activeId].content = editor.value;
    if (!activeId) { preview.srcdoc = ""; return; }

    const currentFile = fileStorage[activeId];
    const ext = currentFile.name.toLowerCase().split('.').pop();
    const isWebFormat = ['html', 'css', 'js', 'txt'].includes(ext);

    if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
    }

    if (isWebFormat) {
        previewTitle.textContent = "👁️ CANLI ÖNİZLEME";
        let html = "", css = "", js = "";
        
        Object.values(fileStorage).forEach(f => {
            if (f.name.toLowerCase().endsWith('.html')) html += f.content + "\n";
            if (f.name.toLowerCase().endsWith('.css')) css += f.content + "\n";
            if (f.name.toLowerCase().endsWith('.js')) js += f.content + "\n";
        });
        
        if (!html) html = editor.value;
        
        const blob = new Blob([html + `<style>${css}</style><script>${js}<\/script>`], { type: 'text/html;charset=utf-8' });
        currentUrl = window.URL.createObjectURL(blob);
        preview.src = currentUrl;
    } else {
        previewTitle.textContent = "👁️ KOD GÖRÜNTÜLEYİCİ MODU";
        let consoleOutput = parseBackendConsole(editor.value);
        const blob = new Blob([`<html><body style="background:#0c0c0c;color:#00ff00;font-family:monospace;padding:15px;font-size:15px;white-space:pre-wrap;">${consoleOutput}</body></html>`], { type: 'text/html;charset=utf-8' });
        currentUrl = window.URL.createObjectURL(blob);
        preview.src = currentUrl;
    }
}

// Yazma Dinleyicisi
editor.addEventListener('input', () => {
    if (activeId && fileStorage[activeId]) fileStorage[activeId].content = editor.value;
    document.getElementById('char-text').textContent = `Karakter: ${editor.value.length}`;
    updatePreview();
});

document.getElementById('run-btn').addEventListener('click', updatePreview);

function updateMeta() {
    if (!activeId) { document.getElementById('mode-text').textContent = "Mod: Boş"; return; }
    const ext = fileStorage[activeId].name.split('.').pop().toUpperCase();
    document.getElementById('mode-text').textContent = `Mod: ${ext}`;
    document.getElementById('char-text').textContent = `Karakter: ${editor.value.length}`;
}

// Dosya İndirme Sistemleri
function downloadFile(name, text) {
    const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = name; a.href = url; a.click();
    window.URL.revokeObjectURL(url);
}

document.getElementById('save-active-btn').addEventListener('click', () => {
    if (activeId) downloadFile(fileStorage[activeId].name, editor.value);
});

document.getElementById('save-all-btn').addEventListener('click', () => {
    if (activeId) fileStorage[activeId].content = editor.value;
    Object.keys(fileStorage).forEach((id, index) => {
        setTimeout(() => downloadFile(fileStorage[id].name, fileStorage[id].content), index * 300);
    });
});

document.getElementById('clear-btn').addEventListener('click', () => {
    fileStorage = {}; activeId = null; editor.value = ""; renderTabs(); preview.srcdoc = ""; updateMeta();
});

window.onload = () => { createPage("index.html", testTemplate); };
