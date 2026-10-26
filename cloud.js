// みんなで記録を自動共有する部分(Firebase Firestore)
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,setDoc,deleteDoc,onSnapshot}
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {config} from './firebase-config.js';

export const enabled=!!(config&&config.projectId);

// 写真は1件ずつ別の書類(photos)に分けて保存し、記録(visits)にはその番号だけを持たせる
export function connect(fid,onChange,onStatus){
  const app=initializeApp(config);
  const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
  const vc=collection(db,'families',fid,'visits'),pc=collection(db,'families',fid,'photos');
  let visits=new Map(),photos=new Map(),rev=new Map();
  const fail=e=>onStatus&&onStatus('error',e);
  const emit=()=>onChange([...visits.values()].map(v=>({...v,photos:(v.photoIds||[]).map(id=>photos.get(id)).filter(Boolean)})));
  onSnapshot(vc,s=>{visits=new Map(s.docs.map(d=>[d.id,{...d.data(),id:d.id}]));emit();onStatus&&onStatus('ok')},fail);
  onSnapshot(pc,s=>{photos=new Map(s.docs.map(d=>[d.id,d.data().data]));rev=new Map([...photos].map(([k,v])=>[v,k]));emit()},fail);
  const used=(id,except)=>[...visits.values()].some(v=>v.id!==except&&(v.photoIds||[]).includes(id));
  return{
    put(o){
      const {photos:urls=[],...rest0}=o,rest=JSON.parse(JSON.stringify(rest0)),old=(visits.get(o.id)||{}).photoIds||[],ids=[];
      for(const u of urls){
        let id=rev.get(u);
        if(!id){id=crypto.randomUUID();photos.set(id,u);rev.set(u,id);setDoc(doc(pc,id),{data:u}).catch(fail)}
        ids.push(id);
      }
      visits.set(o.id,{...rest,photoIds:ids});emit();
      setDoc(doc(vc,o.id),{...rest,photoIds:ids}).catch(fail);
      old.filter(id=>!ids.includes(id)&&!used(id,o.id)).forEach(id=>{deleteDoc(doc(pc,id)).catch(fail)});
    },
    rm(id){
      const ids=(visits.get(id)||{}).photoIds||[];
      visits.delete(id);emit();
      deleteDoc(doc(vc,id)).catch(fail);
      ids.filter(p=>!used(p,id)).forEach(p=>{deleteDoc(doc(pc,p)).catch(fail)});
    }
  };
}
