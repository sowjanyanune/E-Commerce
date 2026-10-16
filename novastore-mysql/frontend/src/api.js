// Frontend API calls ONLY. All database access and business logic stays in backend/.
export async function api(path,options={}){
 const response=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers}});
 let data;try{data=await response.json();}catch{throw new Error('Server response was not JSON. Is the backend running?');}
 if(!response.ok)throw new Error(data.error||'Request failed');return data;
}
export const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
export const put=(path,body)=>api(path,{method:'PUT',body:JSON.stringify(body)});
export const del=path=>api(path,{method:'DELETE'});
