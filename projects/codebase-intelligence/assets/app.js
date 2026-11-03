/* Codebase Intelligence: progressive-enhancement UI.
 * Demo data is intentionally labeled; real questions require the local Python API.
 */
(() => {
  'use strict';
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const DEMO_FILES = [
    {file:'ingest/parser.py',name:'CodebaseParser',type:'class',start_line:5,code:`class CodebaseParser:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir

    def _extract_calls(self, node: ast.AST):
        calls = []
        for n in ast.walk(node):
            if isinstance(n, ast.Call):
                if isinstance(n.func, ast.Name):
                    calls.append(n.func.id)
                elif isinstance(n.func, ast.Attribute):
                    calls.append(n.func.attr)
        return list(set(calls))`},
    {file:'retrieval/retriever.py',name:'Retriever',type:'class',start_line:11,code:`class Retriever:
    def search(self, query: str, top_k: int = 5):
        query_emb = np.array(
            self.embedder.get_embeddings([query]),
            dtype=np.float32
        )
        distances, indices = self.index.search(
            query_emb, top_k * 2
        )
        bm25_scores = self.bm25.get_scores(
            query.lower().split()
        )
        # Fuse ranks, then expand graph neighbors
        return expanded_results`},
    {file:'retrieval/reranker.py',name:'Reranker',type:'class',start_line:6,code:`class Reranker:
    def rerank(self, query: str, results):
        if not results:
            return results

        prompt = "Evaluate code chunk relevance"
        response = self.model.generate_content(
            prompt, generation_config={"temperature": 0.1}
        )
        scores = json.loads(response.text.strip())
        return sorted(
            results, key=lambda x: x["score"],
            reverse=True
        )`},
    {file:'llm/prompt.py',name:'CodebaseAgent',type:'class',start_line:5,code:`class CodebaseAgent:
    def __init__(self, search_tool):
        self.model = genai.GenerativeModel(
            model_name=Config.LLM_MODEL,
            system_instruction=self.system_prompt,
            tools=[search_tool]
        )
        self.chat = self.model.start_chat(
            enable_automatic_function_calling=True
        )

    def generate_response(self, query: str):
        response = self.chat.send_message(query)
        return response.text`}
  ];
  const DEMO_ANSWERS = {
    'How does the retrieval pipeline work?': {
      body: `The retrieval process starts with an embedding of your question. The Retriever searches the FAISS vector index and independently ranks terms using BM25.\n\nThe two result rankings are combined through reciprocal rank fusion (RRF). For each high-ranked code chunk, the retriever looks up its outgoing call-graph neighbors and adds nearby code as context. Finally, Reranker asks Gemini to judge the relevance of the selected chunks.\n\nThis example describes the repository's implementation; it is a guided explanation, not a live model response.`,
      sources: [DEMO_FILES[1],DEMO_FILES[2]]
    },
    'How does the AST parser find functions?': {
      body: `CodebaseParser parses Python source with ast.parse(), then walks the syntax tree to identify FunctionDef, AsyncFunctionDef, and ClassDef nodes.\n\nIt uses ast.get_source_segment() to capture each component's code and records imports, calls, file path, and start/end line numbers. CodeChunker subsequently skips short functions under its configured minimum line count.\n\nThis is a guided explanation based on ingest/parser.py and ingest/chunker.py.`,
      sources: [DEMO_FILES[0]]
    },
    'How does the agent search the codebase?': {
      body: `CodebaseAgent initializes a Gemini generative model with a search_codebase tool. Its chat session has automatic function calling enabled.\n\nThe model can request code searches as it works through a question, and the Python tool retrieves and reranks real code chunks. The agent then composes a response using that returned context.\n\nThis is a guided explanation based on llm/prompt.py and app.py, not a live call to Gemini.`,
      sources: [DEMO_FILES[3], DEMO_FILES[1]]
    }
  };

  const state = {mode:'demo', backend:false, configured:false, sessionId:null, repo:'RAG-Codebase (demo)', files:DEMO_FILES, selected:DEMO_FILES[1], sources:[DEMO_FILES[1],DEMO_FILES[2]], busy:false, panel:'code', zip:null};
  const toast = $('#toast');
  let toastTimer;
  function notify(message) {toast.textContent = message;toast.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('shown'),3700);}
  function setStatus(text, details, active=false){$('#api-status').textContent=text;$('#api-status-info').textContent=details;$('#api-light').classList.toggle('online',active);}
  function setMode(mode){state.mode=mode;$('#mode-label').textContent=mode==='live'?'LIVE PYTHON ENGINE':'GUIDED DEMO';$('.mode-led').classList.toggle('online',mode==='live');$('#context-pill').textContent=mode==='live'?`${state.files.length} SOURCES INDEXED`:'DEMO / 04 FILES';}
  async function checkBackend(){
    if (location.hostname.endsWith('.github.io')) { state.backend=false;setStatus('Guided demo','Sample answers and source exploration',false);return; }
    const ctrl = new AbortController();const t=setTimeout(()=>ctrl.abort(),2000);
    try{
      const r=await fetch('/api/status',{signal:ctrl.signal,headers:{'Accept':'application/json'}});
      if(!r.ok)throw Error('unavailable');
      const s=await r.json();state.backend=true;state.configured=!!s.configured && !!s.engine_present;
      if(!s.engine_present)setStatus('Engine modules missing','Set RAG_CODEBASE_ROOT to the cloned repository',false);
      else if(s.configured)setStatus('Engine online','Gemini key configured · ready to index',true);
      else setStatus('Engine ready · key missing','Set GEMINI_API_KEY in the Python server',false);
    }catch{state.backend=false;setStatus('Preview mode','Start the Python server for live indexing',false);}finally{clearTimeout(t);}
  }
  function cssHighlight(str){
    const frag=document.createDocumentFragment();let i=0;
    const pattern=/(\b(?:class|def|return|if|elif|else|for|while|in|import|from|as|with|try|except|True|False|None)\b|#[^\n]*|\b[A-Za-z_]\w*(?=\()|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    for(const m of str.matchAll(pattern)){const start=m.index;if(start>i)frag.append(document.createTextNode(str.slice(i,start)));const el=document.createElement('span');el.className=m[0].startsWith('#')?'comment':/^['"]/.test(m[0])?'str':/^(class|def|return|if|elif|else|for|while|in|import|from|as|with|try|except|True|False|None)$/.test(m[0])?'kw':'fn';el.textContent=m[0];frag.append(el);i=start+m[0].length;}if(i<str.length)frag.append(document.createTextNode(str.slice(i)));return frag;
  }
  function renderCode(){const current=state.selected;$('#snippet-file').textContent=current?current.file:'No file selected';const pane=$('#code-pane');pane.replaceChildren();if(!current){pane.textContent='Select an indexed source to inspect its code.';return;}const lines=String(current.code||'# Code snippet not available').split('\n');const start=Math.max(1,Number(current.start_line)||1);for(let i=0;i<lines.length;i++){const row=document.createElement('div');row.className='code-line';const ln=document.createElement('span');ln.className='line-number';ln.textContent=String(start+i).padStart(2,'0');const code=document.createElement('span');code.className='code-content';code.append(cssHighlight(lines[i]));row.append(ln,code);pane.append(row);}}
  function renderGraph(){const pane=$('#context-main');pane.replaceChildren();const shell=document.createElement('div');shell.className='graph-inspector';const nodes=state.files.slice(0,7),n=Math.max(nodes.length,1);let paths='';let circles='';let labels='';nodes.forEach((f,i)=>{const angle=(i/n)*Math.PI*2-Math.PI/2;const x=170+104*Math.cos(angle),y=145+99*Math.sin(angle);paths+=`<path d="M170 145L${x.toFixed(1)} ${y.toFixed(1)}"/>`;circles+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8"/>`;labels+=`<text x="${x.toFixed(1)}" y="${(y+23).toFixed(1)}" text-anchor="middle">${String(i+1).padStart(2,'0')}</text>`;});
    // SVG only contains generated numeric geometry and sequence numbers, never user code.
    shell.innerHTML=`<svg viewBox="0 0 340 310" aria-label="Illustrative radial code graph"><g>${paths}</g><g>${circles}</g><circle class="center" cx="170" cy="145" r="29"/><text x="170" y="151" text-anchor="middle" style="font-size:23px;fill:#bff477">✳</text>${labels}</svg>`;
    const hint=document.createElement('div');hint.className='graph-hint';hint.textContent='Illustrative connectivity view · the full graph is maintained by the Python engine.';shell.append(hint);pane.append(shell);
  }
  function renderSources(){const pane=$('#context-main');pane.replaceChildren();const div=document.createElement('div');div.className='source-list';const sources=state.sources||[];if(!sources.length){div.textContent='No sources retrieved yet. Ask a question first.';}sources.forEach(src=>{const b=document.createElement('button');b.className='source-entry';b.type='button';const name=document.createElement('strong');name.textContent=src.name||src.file;const detail=document.createElement('span');detail.textContent=(src.file||'unknown')+(src.start_line?` : ${src.start_line}`:'');b.append(name,detail);b.addEventListener('click',()=>{state.selected=src;selectPanel('code');renderFiles();});div.append(b);});pane.append(div);}
  function selectPanel(panel){state.panel=panel;$$('.context-tab').forEach(b=>{const active=b.dataset.panel===panel;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});if(panel==='code'){$('#context-main').replaceChildren();const head=document.createElement('div');head.className='snippet-header';const label=document.createElement('span');label.id='snippet-file';const copy=document.createElement('button');copy.type='button';copy.id='copy-snippet';copy.textContent='COPY ↗';head.append(label,copy);const pane=document.createElement('div');pane.id='code-pane';pane.className='code-pane';$('#context-main').append(head,pane);copy.addEventListener('click',copySnippet);renderCode();}else if(panel==='graph')renderGraph();else renderSources();}
  function renderFiles(){const list=$('#file-list');list.replaceChildren();$('#file-count').textContent=String(state.files.length).padStart(2,'0');state.files.forEach(f=>{const button=document.createElement('button');button.type='button';button.className='file-entry'+(state.selected===f?' active':'');button.setAttribute('role','listitem');const icon=document.createElement('span');icon.textContent='⌘';const name=document.createElement('span');name.textContent=f.file;button.append(icon,name);button.addEventListener('click',()=>{state.selected=f;selectPanel('code');renderFiles();});list.append(button);});$('#context-pill').textContent=state.mode==='demo'?'DEMO / 04 FILES':`${state.files.length} SOURCES INDEXED`;}
  function copySnippet(){const s=state.selected?.code;if(!s){notify('Nothing to copy');return;}navigator.clipboard?.writeText(s).then(()=>notify('Code copied to clipboard')).catch(()=>notify('Clipboard unavailable'));}
  function appendMessage(kind,message,sources){const scroll=$('#chat-scroll');const box=document.createElement('div');box.className=`message ${kind}`;const head=document.createElement('div');head.className='message-head';const dot=document.createElement('i');dot.className='msg-dot';const label=document.createElement('span');label.textContent=kind==='user'?'YOU':state.mode==='demo'?'GUIDED EXPLANATION · DEMO':'INTELLIGENCE AGENT';head.append(dot,label);const body=document.createElement('div');body.className='message-body';body.textContent=message;box.append(head,body);if(sources?.length){const hint=document.createElement('button');hint.type='button';hint.className='message-source';hint.textContent=`↗ Inspect ${sources.length} related source${sources.length===1?'':'s'}`;hint.addEventListener('click',()=>{state.sources=sources;state.selected=sources[0];selectPanel('sources');renderFiles();});box.append(hint);}scroll.append(box);scroll.scrollTop=scroll.scrollHeight;return box;}
  function resetChat(){const scroll=$('#chat-scroll');scroll.replaceChildren();const card=document.createElement('div');card.className='welcome-card';card.innerHTML='<span class="welcome-spark">✳</span><small>NEW CONVERSATION.</small><h3>Ask about<br><em>your code.</em></h3><p>Choose a sample question or connect the local engine for live answers.</p>';scroll.append(card);const suggestions=document.createElement('div');suggestions.className='suggestions';suggestions.id='suggestions';Object.keys(DEMO_ANSWERS).forEach(q=>{const b=document.createElement('button');b.type='button';b.className='suggestion';b.textContent=q+' ↗';b.addEventListener('click',()=>ask(q));suggestions.append(b);});scroll.append(suggestions);state.sources=[];if(state.panel==='sources')renderSources();}
  async function ask(raw){const question=String(raw||'').trim();if(!question||state.busy)return;$('#chat-input').value='';$('#chat-input').style.height='auto';const welcome=$('.welcome-card');if(welcome)welcome.remove();const suggested=$('#suggestions');if(suggested)suggested.remove();appendMessage('user',question);if(state.mode==='demo'){
      const example=DEMO_ANSWERS[question];if(example){state.sources=example.sources;state.selected=example.sources[0];appendMessage('assistant',example.body,example.sources);renderFiles();selectPanel('code');}else{appendMessage('assistant','This is the guided demo, so I won’t invent an AI answer to that question. Choose one of the three example questions, or run the local Python backend, index a repository, and ask anything about its code.');}return;
    }
    state.busy=true;$('#send-query').disabled=true;const loading=appendMessage('assistant','Searching FAISS + BM25, expanding context, and asking the agent…');
    try{const r=await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:state.sessionId,question})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'Query failed');loading.remove();state.sources=d.sources||[];if(state.sources[0])state.selected=state.sources[0];appendMessage('assistant',String(d.answer||'No answer returned.'),state.sources);renderFiles();selectPanel('sources');}
    catch(e){loading.remove();appendMessage('assistant','The local engine could not complete this request: '+e.message);}finally{state.busy=false;$('#send-query').disabled=false;}
  }
  function showIndexBusy(busy,text='Indexing…'){state.busy=busy;$('#connect-repo').disabled=busy;$('#connect-zip').disabled=busy||!state.zip;$('#load-demo').disabled=busy;$('#connect-repo').firstChild.textContent=busy?text+' ':'Index repository ';$('#connect-zip').firstChild.textContent=busy?text+' ':'Index ZIP ';}
  async function indexSource(kind){if(state.busy)return;if(!state.backend){await checkBackend();if(!state.backend){notify('Start the local Python server to index a real repository.');return;}}if(!state.configured){notify('Set GEMINI_API_KEY in your local Python environment first.');return;}let url,options;if(kind==='github'){const repo=$('#repo-url').value.trim();if(!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repo)){notify('Enter a public GitHub URL: https://github.com/owner/repo');return;}url='/api/index/github';options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:repo})};}else{if(!state.zip){notify('Choose a ZIP file first');return;}if(state.zip.size>12*1024*1024){notify('ZIP file exceeds the 12 MB limit');return;}const form=new FormData();form.append('file',state.zip);url='/api/index/zip';options={method:'POST',body:form};}showIndexBusy(true,'Indexing');notify('Indexing started · Gemini embedding may take some time');try{const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'Indexing failed');state.sessionId=d.session_id;state.files=Array.isArray(d.files)?d.files:[];state.selected=state.files[0]||null;state.sources=[];state.repo=d.repo||'Indexed repository';setMode('live');renderFiles();selectPanel('code');resetChat();notify(`Indexed ${d.stats?.chunks||state.files.length} chunks from ${state.repo}`);appendMessage('assistant',`Repository ready: ${state.repo}\n\nIndexed ${d.stats?.chunks||state.files.length} code chunks. Ask me a question about its implementation.`);}catch(e){notify('Indexing failed: '+e.message);appendMessage('assistant','Could not index this repository: '+e.message);}finally{showIndexBusy(false);}}
  function loadDemo(){if(state.busy)return;state.sessionId=null;state.files=DEMO_FILES;state.selected=DEMO_FILES[1];state.sources=[DEMO_FILES[1],DEMO_FILES[2]];setMode('demo');renderFiles();selectPanel('code');resetChat();notify('Guided demo loaded · sample answers only');}
  // Setup
  $('#year').textContent=String(new Date().getFullYear());
  $('#jump-to-connect')?.addEventListener('click',()=>{const sidebar=$('.workspace-sidebar');if(sidebar)sidebar.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  const navToggle=$('#nav-toggle'),mobile=$('#mobile-nav');navToggle.addEventListener('click',()=>{const opened=mobile.hidden;mobile.hidden=!opened;navToggle.setAttribute('aria-expanded',String(opened));});$$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{mobile.hidden=true;navToggle.setAttribute('aria-expanded','false');}));
  $$('.source-tab').forEach(b=>b.addEventListener('click',()=>{$$('.source-tab').forEach(x=>x.classList.toggle('active',x===b));$('#github-connect').hidden=b.dataset.source!=='github';$('#zip-connect').hidden=b.dataset.source!=='zip';}));
  $('#connect-repo').addEventListener('click',()=>indexSource('github'));$('#connect-zip').addEventListener('click',()=>indexSource('zip'));$('#load-demo').addEventListener('click',loadDemo);$('#reset-chat').addEventListener('click',resetChat);$$('.context-tab').forEach(b=>b.addEventListener('click',()=>selectPanel(b.dataset.panel)));$('#copy-snippet').addEventListener('click',copySnippet);
  $$('.suggestion').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.demoQuestion)));$('#chat-form').addEventListener('submit',e=>{e.preventDefault();ask($('#chat-input').value);});
  $('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#chat-form').requestSubmit();}});$('#chat-input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(105,e.target.scrollHeight)+'px';});
  const zipInput=$('#zip-input'),zone=$('#upload-zone');function chooseZip(file){if(!file)return;if(!file.name.toLowerCase().endsWith('.zip')){notify('Please choose a .zip file');return;}state.zip=file;zone.querySelector('strong').textContent=file.name;zone.querySelector('span:last-child').textContent=(file.size/(1024*1024)).toFixed(2)+' MB · ready to index';$('#connect-zip').disabled=false;}
  zipInput.addEventListener('change',()=>chooseZip(zipInput.files?.[0]));['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragging');}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragging');}));zone.addEventListener('drop',e=>chooseZip(e.dataTransfer?.files?.[0]));
  if(window.matchMedia('(pointer:fine)').matches&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches){let t=0;window.addEventListener('pointermove',e=>{if(t)return;t=requestAnimationFrame(()=>{$('.cursor-glow').style.transform=`translate(${e.clientX-240}px,${e.clientY-240}px)`;t=0;});},{passive:true});}
  setMode('demo');renderFiles();selectPanel('code');checkBackend();
})();
