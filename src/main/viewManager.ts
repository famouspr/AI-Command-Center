import { WebContentsView, shell, type BrowserWindow, type WebContents } from 'electron'
import {
  IPC,
  VIEW_HOME,
  type InsertResult,
  type Rect,
  type ViewId,
  type ViewStatusEvent
} from '../shared/types'

// Build a real, consistent Chrome user-agent from the ACTUAL Chromium version
// this Electron build ships. A UA string whose version disagrees with the
// engine — and with the Sec-CH-UA client hints Chromium sends automatically —
// is a classic bot-detection trigger and can make Cloudflare-fronted sites like
// ChatGPT / Claude loop on a challenge page. We also omit the "Electron" and
// app-name tokens that some sites reject.
const CHROME_VERSION = process.versions.chrome || '126.0.0.0'
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  `(KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`

// Reload circuit breaker (settle detection). We count main-frame loads and
// reset the count once a page has been quiet for SETTLE_MS or the user types
// into it. Only *sustained* reloading — a page that never settles — trips the
// breaker, so a normal redirect burst (a few loads then quiet) is ignored while
// both fast and slow runaway loops are stopped after a bounded number of loads.
// This protects the user's account from endless refreshes / rate-limits.
const RELOAD_LIMIT = 9
const SETTLE_MS = 6000

interface LoadGuard {
  count: number
  settleTimer: ReturnType<typeof setTimeout> | null
  tripped: boolean
}

/**
 * Owns the two native WebContentsViews. Each gets an isolated persistent
 * session partition so logins survive restarts and the two sites stay separate.
 *
 * Native views always paint above the HTML, so visibility is toggled by the
 * renderer whenever an overlay (Settings) covers the panel area.
 */
export class ViewManager {
  private views = new Map<ViewId, WebContentsView>()
  private bounds = new Map<ViewId, Rect>()
  private guards = new Map<ViewId, LoadGuard>()
  private allVisible = true

  constructor(private win: BrowserWindow) {}

  createAll(): void {
    // Idempotent: never create the views more than once, even if the caller
    // (ready-to-show) fires again. Re-creating would reload both panels in a loop.
    if (this.views.size > 0) return
    this.create('chatgpt')
    this.create('claude')
  }

  private create(id: ViewId): void {
    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:${id}`,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: true
      }
    })
    const wc = view.webContents
    wc.setUserAgent(CHROME_UA)

    // Allow login / OAuth popups (e.g. Google SSO) to open as child windows so
    // sign-in flows complete. They inherit this view's session partition.
    wc.setWindowOpenHandler(() => ({ action: 'allow' }))

    this.wireEvents(id, wc)
    this.win.contentView.addChildView(view)
    view.setVisible(true)
    this.views.set(id, view)

    // If the renderer already reported a target rect before this view existed,
    // adopt it immediately so the panel never paints at zero size.
    const stored = this.bounds.get(id)
    if (stored) view.setBounds(round(stored))

    this.resetGuard(id)
    this.emit({ id, status: 'loading', url: VIEW_HOME[id] })
    wc.loadURL(VIEW_HOME[id], { userAgent: CHROME_UA }).catch((err) => {
      this.emit({ id, status: 'failed', detail: String(err?.message ?? err) })
    })
  }

  private wireEvents(id: ViewId, wc: WebContents): void {
    const isTripped = (): boolean => this.guards.get(id)?.tripped === true

    const onLoadEnd = (): void => {
      if (isTripped()) return
      this.emit({
        id,
        status: 'ready',
        url: safe(() => wc.getURL()),
        title: safe(() => wc.getTitle()),
        canGoBack: this.canGoBack(wc)
      })
      this.scheduleSettle(id)
    }

    wc.on('did-start-loading', () => {
      // Trip the breaker before announcing another load if the site is looping.
      if (this.noteLoad(id, wc)) return
      this.emit({ id, status: 'loading' })
    })
    wc.on('did-stop-loading', onLoadEnd)
    wc.on('did-finish-load', onLoadEnd)
    wc.on('page-title-updated', (_e, title) => {
      if (isTripped()) return
      this.emit({ id, status: 'ready', title, url: safe(() => wc.getURL()), canGoBack: this.canGoBack(wc) })
    })
    wc.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || errorCode === -3 /* ERR_ABORTED */) return
      if (isTripped()) return
      this.emit({ id, status: 'failed', detail: `${errorDescription} (${errorCode})`, url: validatedURL })
    })
    // Any keyboard input means a real user is interacting — never a loop.
    wc.on('before-input-event', () => this.resetGuard(id))
    wc.on('render-process-gone', (_e, details) =>
      this.emit({ id, status: 'failed', detail: `Renderer stopped: ${details.reason}` })
    )
  }

  /**
   * Count a main-frame load. Cancels any pending "settled" reset (a new load
   * means the page has not settled). If loads keep coming without the page ever
   * going quiet, trip the breaker: stop the view and report 'blocked'.
   * Returns true when the breaker trips on this load.
   */
  private noteLoad(id: ViewId, wc: WebContents): boolean {
    const g = this.guards.get(id)
    if (!g || g.tripped) return g?.tripped === true
    if (g.settleTimer) {
      clearTimeout(g.settleTimer)
      g.settleTimer = null
    }
    g.count += 1
    if (g.count > RELOAD_LIMIT) {
      g.tripped = true
      try {
        wc.stop()
        // Replace the looping page with a blank one so its own JS timers / meta
        // refresh cannot keep reloading in the background. The renderer hides
        // this view and shows the fallback card, so about:blank is never seen.
        void wc.loadURL('about:blank').catch(() => undefined)
      } catch {
        /* ignore */
      }
      this.emit({
        id,
        status: 'blocked',
        detail:
          'Stopped automatic reloading after repeated refreshes, to protect your account. Open it in your browser, or press reload to try again.'
      })
      return true
    }
    return false
  }

  /** Once a page stays quiet for SETTLE_MS, treat it as settled and reset. */
  private scheduleSettle(id: ViewId): void {
    const g = this.guards.get(id)
    if (!g || g.tripped) return
    if (g.settleTimer) clearTimeout(g.settleTimer)
    g.settleTimer = setTimeout(() => {
      g.count = 0
      g.settleTimer = null
    }, SETTLE_MS)
  }

  private resetGuard(id: ViewId): void {
    const existing = this.guards.get(id)
    if (existing?.settleTimer) clearTimeout(existing.settleTimer)
    this.guards.set(id, { count: 0, settleTimer: null, tripped: false })
  }

  private canGoBack(wc: WebContents): boolean {
    try {
      return wc.canGoBack()
    } catch {
      return false
    }
  }

  setBounds(id: ViewId, rect: Rect): void {
    this.bounds.set(id, rect)
    const view = this.views.get(id)
    if (view && this.allVisible) view.setBounds(round(rect))
  }

  setVisible(id: ViewId, visible: boolean): void {
    const view = this.views.get(id)
    if (!view) return
    view.setVisible(visible)
    if (visible) {
      const b = this.bounds.get(id)
      if (b) view.setBounds(round(b))
    }
  }

  setAllVisible(visible: boolean): void {
    this.allVisible = visible
    for (const [id, view] of this.views) {
      view.setVisible(visible)
      if (visible) {
        const b = this.bounds.get(id)
        if (b) view.setBounds(round(b))
      }
    }
  }

  reload(id: ViewId): void {
    this.resetGuard(id)
    this.views.get(id)?.webContents.reload()
  }

  goBack(id: ViewId): void {
    const wc = this.views.get(id)?.webContents
    try {
      if (wc?.canGoBack()) wc.goBack()
    } catch {
      /* no history */
    }
  }

  loadHome(id: ViewId): void {
    this.resetGuard(id)
    this.views
      .get(id)
      ?.webContents.loadURL(VIEW_HOME[id], { userAgent: CHROME_UA })
      .catch(() => undefined)
  }

  focus(id: ViewId): void {
    this.views.get(id)?.webContents.focus()
  }

  /**
   * Insert text into the embedded site's message composer by running a small,
   * resilient script in the page (privileged executeJavaScript, so the page CSP
   * does not block it). Tries several selectors and insertion techniques and
   * NEVER submits. Returns a structured result for logging / fallback.
   */
  async insertComposerText(id: ViewId, text: string): Promise<InsertResult> {
    const view = this.views.get(id)
    if (!view) return { ok: false, reason: 'panel is not available' }
    const wc = view.webContents
    try {
      wc.focus()
      const result = await wc.executeJavaScript(buildInsertScript(text), true)
      return result && typeof result === 'object'
        ? (result as InsertResult)
        : { ok: false, reason: 'no result returned from page' }
    } catch (err) {
      return { ok: false, reason: String((err as Error)?.message ?? err) }
    }
  }

  /** Submit the composer (auto-send only). Prefers clicking the send button. */
  async submitComposer(id: ViewId): Promise<InsertResult> {
    const view = this.views.get(id)
    if (!view) return { ok: false, reason: 'panel is not available' }
    try {
      const result = await view.webContents.executeJavaScript(buildSubmitScript(), true)
      return result && typeof result === 'object'
        ? (result as InsertResult)
        : { ok: false, reason: 'no result returned from page' }
    } catch (err) {
      return { ok: false, reason: String((err as Error)?.message ?? err) }
    }
  }

  openExternal(id: ViewId): void {
    const wc = this.views.get(id)?.webContents
    const url = safe(() => wc?.getURL()) || VIEW_HOME[id]
    void shell.openExternal(url)
    this.emit({ id, status: 'external', url })
  }

  private emit(event: ViewStatusEvent): void {
    if (!this.win.isDestroyed()) this.win.webContents.send(IPC.viewStatus, event)
  }
}

function round(r: Rect): Rect {
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.max(0, Math.round(r.width)),
    height: Math.max(0, Math.round(r.height))
  }
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn()
  } catch {
    return undefined
  }
}

/**
 * Builds the page script that finds the composer and inserts `text` into it.
 * Returned as a string because it runs in the page (DOM) context, not Node.
 * The text is embedded via JSON.stringify so any quotes/newlines are safe.
 */
function buildInsertScript(text: string): string {
  return `(function(text){
  function vis(el){try{var r=el.getBoundingClientRect();var s=getComputedStyle(el);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none'&&el.getAttribute('aria-hidden')!=='true';}catch(e){return false;}}
  var selectors=['#prompt-textarea','div.ProseMirror[contenteditable="true"]','div[contenteditable="true"][translate="no"]','[data-testid="composer"] [contenteditable="true"]','form [contenteditable="true"]','div[role="textbox"][contenteditable="true"]','main textarea','form textarea','textarea[placeholder]','textarea','div[contenteditable="true"]','div[role="textbox"]'];
  var el=null,used=null;
  for(var i=0;i<selectors.length;i++){var list=Array.prototype.slice.call(document.querySelectorAll(selectors[i])).filter(vis);if(list.length){el=list[list.length-1];used=selectors[i];break;}}
  if(!el){return {ok:false,reason:'composer element not found'};}
  try{el.scrollIntoView({block:'center'});}catch(e){}
  el.focus();
  var method=null;var tag=el.tagName;
  try{
    if(tag==='TEXTAREA'||tag==='INPUT'){
      var proto=tag==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;
      var desc=Object.getOwnPropertyDescriptor(proto,'value');
      if(desc&&desc.set){desc.set.call(el,text);}else{el.value=text;}
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      method='textarea-native-setter';
    }else{
      var selection=window.getSelection();var range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);
      var inserted=false;try{inserted=document.execCommand('insertText',false,text);}catch(e){inserted=false;}
      if(inserted){method='execCommand-insertText';}
      else{
        try{el.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:text}));}catch(e){}
        el.textContent=text;
        try{el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}catch(e){el.dispatchEvent(new Event('input',{bubbles:true}));}
        method='contenteditable-textContent-fallback';
      }
    }
  }catch(e){return {ok:false,reason:String((e&&e.message)||e),selector:used};}
  return {ok:true,selector:used,method:method,tag:tag};
})(${JSON.stringify(text)})`
}

/** Builds the page script that submits the composer (auto-send only). */
function buildSubmitScript(): string {
  return `(function(){
  var sels=['button[data-testid="send-button"]','button[data-testid="composer-send-button"]','button[aria-label*="Send" i]','button[aria-label*="send" i]','form button[type="submit"]'];
  for(var i=0;i<sels.length;i++){var b=document.querySelector(sels[i]);if(b&&!b.disabled){b.click();return {ok:true,method:'click-button',selector:sels[i]};}}
  var el=document.activeElement;
  if(el){
    function fire(t){try{el.dispatchEvent(new KeyboardEvent(t,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));}catch(e){}}
    fire('keydown');fire('keypress');fire('keyup');
    return {ok:true,method:'enter-key'};
  }
  return {ok:false,reason:'no send button or focused composer'};
})()`
}
