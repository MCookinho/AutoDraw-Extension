let attachedTabs = new Set();

async function attachToTab(tabId) {
  if (attachedTabs.has(tabId)) return true;

  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
    console.log('AutoDraw: Attached to tab', tabId);
    return true;
  } catch (e) {
    console.error('AutoDraw: Failed to attach to tab:', e);
    return false;
  }
}

async function detachFromTab(tabId) {
  if (!attachedTabs.has(tabId)) return;

  try {
    await chrome.debugger.detach({ tabId });
    attachedTabs.delete(tabId);
  } catch (e) {
    attachedTabs.delete(tabId);
  }
}

async function sendCDPCommand(tabId, method, params) {
  try {
    await chrome.debugger.sendCommand({ tabId }, method, params);
    return true;
  } catch (e) {
    console.error('AutoDraw: CDP command failed:', method, e);
    return false;
  }
}

async function cdpMouseEvent(tabId, type, x, y, buttons) {
  const params = {
    type: type,
    x: Math.round(x),
    y: Math.round(y),
    button: type === 'mouseMoved' ? 'none' : 'left',
    buttons: buttons,
    clickCount: (type === 'mousePressed' || type === 'mouseReleased') ? 1 : 0,
  };

  return await sendCDPCommand(tabId, 'Input.dispatchMouseEvent', params);
}

async function cdpMouseSequence(tabId, events) {
  for (const event of events) {
    await cdpMouseEvent(tabId, event.type, event.x, event.y, event.buttons);
    if (event.delay) {
      await new Promise(r => setTimeout(r, event.delay));
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'cdpAttach') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const result = await attachToTab(tabs[0].id);
        sendResponse({ success: result });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (request.action === 'cdpDetach') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        await detachFromTab(tabs[0].id);
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === 'cdpMouse') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const attached = await attachToTab(tabs[0].id);
        if (attached) {
          const result = await cdpMouseEvent(tabs[0].id, request.type, request.x, request.y, request.buttons);
          sendResponse({ success: result });
        } else {
          sendResponse({ success: false });
        }
      }
    });
    return true;
  }

  if (request.action === 'cdpMouseSequence') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const attached = await attachToTab(tabs[0].id);
        if (attached) {
          await cdpMouseSequence(tabs[0].id, request.events);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      }
    });
    return true;
  }

  if (request.action === 'cdpClick') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const attached = await attachToTab(tabs[0].id);
        if (attached) {
          const tabId = tabs[0].id;
          await cdpMouseEvent(tabId, 'mouseMoved', request.x, request.y, 0);
          await new Promise(r => setTimeout(r, 10));
          await cdpMouseEvent(tabId, 'mousePressed', request.x, request.y, 1);
          await new Promise(r => setTimeout(r, 80));
          await cdpMouseEvent(tabId, 'mouseReleased', request.x, request.y, 0);
          await new Promise(r => setTimeout(r, 20));
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      }
    });
    return true;
  }

  if (request.action === 'cdpDrawPixel') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const attached = await attachToTab(tabs[0].id);
        if (attached) {
          const tabId = tabs[0].id;
          const { x, y, delay: d } = request;

          await cdpMouseEvent(tabId, 'mouseMoved', x, y, 0);
          await new Promise(r => setTimeout(r, 2));
          await cdpMouseEvent(tabId, 'mousePressed', x, y, 1);
          await new Promise(r => setTimeout(r, d || 5));
          await cdpMouseEvent(tabId, 'mouseReleased', x, y, 0);
          await new Promise(r => setTimeout(r, d || 5));

          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      }
    });
    return true;
  }

  if (request.action === 'cdpDrawStroke') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const attached = await attachToTab(tabs[0].id);
        if (attached) {
          const tabId = tabs[0].id;
          const { points, delay: d } = request;

          if (points.length === 0) {
            sendResponse({ success: true });
            return;
          }

          const pd = (typeof d === 'number' && d >= 0) ? d : 1;

          await cdpMouseEvent(tabId, 'mouseMoved', points[0].x, points[0].y, 0);
          await new Promise(r => setTimeout(r, pd));
          await cdpMouseEvent(tabId, 'mousePressed', points[0].x, points[0].y, 1);
          await new Promise(r => setTimeout(r, Math.max(pd, 5)));

          for (let i = 1; i < points.length; i++) {
            await cdpMouseEvent(tabId, 'mouseMoved', points[i].x, points[i].y, 1);
            await new Promise(r => setTimeout(r, pd));
          }

          const last = points[points.length - 1];
          await cdpMouseEvent(tabId, 'mouseReleased', last.x, last.y, 0);
          await new Promise(r => setTimeout(r, pd));

          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      }
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AutoDraw extension installed');
});

// ── Keyboard shortcuts (commands only work in service worker) ──

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const actionMap = {
    'toggle-overlay': 'toggleOverlay',
    'start-draw': 'startDraw',
    'stop-draw': 'stopDrawing',
    'toggle-decalque': 'toggleDecalque',
    'toggle-autopress': 'toggleAutopress',
  };

  const action = actionMap[command];
  if (action) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action });
    } catch (e) {
      console.warn('AutoDraw: Could not send command to content script:', command);
    }
  }
});
