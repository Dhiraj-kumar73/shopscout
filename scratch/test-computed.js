const { spawn } = require('child_process');
const http = require('http');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function main() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--window-size=360,800',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000/pages/product-details.html?id=prod-1790215346792'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const tabs = await getJson('http://127.0.0.1:9226/json/list');
    const target = tabs.find(t => t.url.includes('product-details')) || tabs[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function send(method, params = {}) {
      ws.send(JSON.stringify({ id: msgId++, method, params }));
    }

    ws.addEventListener('open', () => {
      send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 800,
        deviceScaleFactor: 2,
        mobile: true
      });

      setTimeout(() => {
        send('Runtime.evaluate', {
          expression: `
            (() => {
              const timer = document.getElementById('ss-deal-timer-bar');
              const layout = document.querySelector('.product-detail-layout');
              const panel = document.querySelector('.product-info-panel');
              const gallery = document.querySelector('.product-gallery');
              const mainImg = document.querySelector('.main-image-viewport');
              const actionBtns = document.querySelector('.detail-action-buttons');
              const header = document.querySelector('.site-header .container');

              return JSON.stringify({
                timer: timer ? {
                  flexDirection: window.getComputedStyle(timer).flexDirection,
                  width: timer.offsetWidth,
                  scrollWidth: timer.scrollWidth,
                  leftWidth: timer.querySelector('.ss-timer-left')?.offsetWidth,
                  rightWidth: timer.querySelector('.ss-timer-right')?.offsetWidth
                } : null,
                layout: layout ? {
                  gridTemplateColumns: window.getComputedStyle(layout).gridTemplateColumns,
                  width: layout.offsetWidth
                } : null,
                gallery: gallery ? {
                  width: gallery.offsetWidth,
                  maxWidth: window.getComputedStyle(gallery).maxWidth
                } : null,
                mainImg: mainImg ? {
                  width: mainImg.offsetWidth,
                  maxWidth: window.getComputedStyle(mainImg).maxWidth
                } : null,
                panel: panel ? {
                  width: panel.offsetWidth,
                  minWidth: window.getComputedStyle(panel).minWidth
                } : null,
                actionBtns: actionBtns ? {
                  width: actionBtns.offsetWidth,
                  scrollWidth: actionBtns.scrollWidth
                } : null,
                header: header ? {
                  width: header.offsetWidth,
                  scrollWidth: header.scrollWidth
                } : null
              }, null, 2);
            })()
          `,
          returnByValue: true
        });
      }, 2500);
    });

    ws.addEventListener('message', event => {
      const res = JSON.parse(event.data);
      if (res.result && res.result.result && res.result.result.value) {
        console.log('=== COMPUTED STYLES AT 360px ===');
        console.log(res.result.result.value);
        chrome.kill();
        process.exit(0);
      }
    });

  } catch (e) {
    console.error(e);
    chrome.kill();
  }
}

main();
