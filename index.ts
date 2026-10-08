import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-admin-token'};
export const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,'Content-Type':'application/json'}});
export const db=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
export const secret=(n:string)=>Deno.env.get(n)||'';
export const keys=()=>['GEMINI_API_KEY','GEMINI_API_KEY_2','GEMINI_API_KEY_3','GEMINI_AI_KEY_1','GEMINI_AI_KEY_2','GEMINI_AI_KEY_3'].map(secret).filter(Boolean);
export async function geminiText(prompt:string,grounded=false){
  let last='';
  const models=[secret('GEMINI_MODEL')||'gemini-3.8-flash','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash'].filter((v,i,a)=>v&&a.indexOf(v)===i);
  for(const key of keys()){
    if(grounded){
      for(const model of models){
        try{
          const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model,input:prompt,tools:[{type:'google_search'}]})});
          const raw=await r.text(); if(!r.ok){last=raw.slice(0,500);continue}
          const j=JSON.parse(raw); const out=j.output_text||j.outputText||j.steps?.flatMap((s:any)=>s.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text||'').join('')||'';
          if(out)return out;
        }catch(e){last=String(e)}
      }
    }
    for(const model of models){
      try{
        const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:.3}})});
        const raw=await r.text(); if(!r.ok){last=raw.slice(0,500);continue}
        const j=JSON.parse(raw); const out=(j.candidates?.[0]?.content?.parts||[]).map((p:any)=>p.text||'').join('');
        if(out)return out;
      }catch(e){last=String(e)}
    }
  }
  throw Error('AI text service unavailable: '+last);
}
export function b64bytes(v:string){return Uint8Array.from(atob(v.replace(/^data:[^,]+,/,'').replace(/\s/g,'')),c=>c.charCodeAt(0))}
export function findAudio(body:any){const out:any[]=[];const walk=(o:any)=>{if(!o)return;if(Array.isArray(o))return o.forEach(walk);if(typeof o==='object'){if(o.audio_url?.url)out.push(o.audio_url.url);if(typeof o.url==='string'&&(o.url.startsWith('data:audio/')||o.url.startsWith('http')))out.push(o.url);if(typeof o.data==='string'&&o.data.length>1000)out.push(o.data);Object.values(o).forEach(walk)}};walk(body);return out[0]||''}
export async function uploadAsset(audio:Uint8Array,mime:string,kind:string){const d=db(),id=crypto.randomUUID(),path=`${kind}/${id}.${mime.includes('wav')?'wav':'mp3'}`;const {error}=await d.storage.from('generated-audio').upload(path,audio,{contentType:mime,upsert:false});if(error)throw error;const {data,error:se}=await d.storage.from('generated-audio').createSignedUrl(path,3600);if(se)throw se;return {id,path,url:data.signedUrl}}

Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{const {type,input,language='English'}=await req.json();const prompts:any={solve:`Solve/explain this clearly with steps for a learner: ${input}`,science:`Explain this science question accurately with examples: ${input}`,translate:`Translate the following into ${language}. Preserve meaning and formatting:\n${input}`,lyrics:`Write completely original song lyrics in ${language} for this topic. Use verse, memorable chorus and bridge. Do not imitate a named artist and do not reproduce copyrighted lyrics. Topic: ${input}`,ringtone_idea:`Turn this customer idea into a concise original ringtone concept in ${language}, with melody/mood/instrument cues and optional original hook. Do not imitate a named artist: ${input}`,creator:`Create polished, engaging content for this platform/topic. Include hook, structure, CTA and useful hashtags.\n${input}`,current_affairs:`Provide a current-affairs briefing for India/world/business/technology/science/sports/education as requested. Prefer current verifiable information and clearly label uncertainty. Then give 5 quiz questions.\n${input}`,search:`Research this topic and return a concise factual summary, key entities, major points, and useful source names/URLs. Clearly separate known facts from uncertainty. Topic: ${input}`,news:`Give the latest available India/world news for this request. Use web search. Return 8-12 concise headlines, each with a short source name and the source URL when available. Do not invent URLs. Request: ${input}`,jobs:`Find and summarize current Indian government jobs, recruitment and exam updates relevant to the request. Use web search and official recruitment sources where possible. Include organization, post/exam, deadline if verified, and official URL when available. Never invent deadlines or URLs.\n${input}`};const text=await geminiText(prompts[type]||input,type==='current_affairs'||type==='jobs'||type==='news');return json({text})}catch(e){return json({error:String(e.message||e)},500)}});
