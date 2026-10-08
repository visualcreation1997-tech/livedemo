/* ===== DEMO INFRASTRUCTURE / BACKEND ADAPTER ===== */

/* ===== BACKEND DEMO (data fiktif, tersimpan di localStorage browser) ===== */
(function(){
const KEY='kanri_demo_db_v1',SKEY='kanri_demo_session_v1';
const rnd=(s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(20261007);
const pick=a=>a[Math.floor(rnd()*a.length)],p2=n=>String(n).padStart(2,'0'),iso=()=>new Date().toISOString();
const uid=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{let r=Math.random()*16|0;return(c=='x'?r:r&3|8).toString(16)});
const F=['Budi','Siti','Agus','Dewi','Rina','Hendra','Wulan','Joko','Putri','Eko','Dimas','Fajar','Ayu','Bayu','Indah','Rizki'],L=['Santoso','Wijaya','Pratama','Kusuma','Hidayat','Saputra','Lestari','Nugroho','Setiawan','Rahayu','Permana','Utami'];
const DEP=['Kebersihan','Taman','Gedung','Umum'],POS=['Petugas Kebersihan','Koordinator Lapangan','Petugas Taman','Petugas Gedung'];
const ACT=['Membersihkan lantai dan koridor lantai 1','Menyapu dan mengepel ruang rapat','Membersihkan toilet dan mengisi perlengkapan','Merapikan taman depan gedung','Mengangkut dan memilah sampah','Membersihkan kaca dan jendela area lobi','Membersihkan ruang kerja dan meja pegawai','Menyiram tanaman dan memangkas rumput','Membersihkan area parkir','Persiapan ruang untuk kegiatan rapat'];
function ph(t,h){const c=document.createElement('canvas');c.width=240;c.height=180;const x=c.getContext('2d');x.fillStyle='hsl('+h+',45%,78%)';x.fillRect(0,0,240,180);x.fillStyle='#334';x.textAlign='center';x.font='bold 20px Arial';x.fillText(t,120,88);x.font='13px Arial';x.fillText('Foto contoh (demo)',120,112);return c.toDataURL('image/jpeg',.5)}
function seed(){
const n=new Date(),Y=n.getFullYear(),M=n.getMonth()+1,pm=M==1?12:M-1,py=M==1?Y-1:Y;
const D={users:[{id:uid(),email:'admin@demo.test',password:'admin123',app_metadata:{role:'admin'},user_metadata:{}}],employees:[],reports:[],activities:[],attendance:[]};
const photos=[0,1,2,3,4,5].map(i=>ph('Kegiatan '+(i+1),i*55)),pin=ph('Check-in',140),pout=ph('Check-out',20),used={};
for(let i=1;i<=12;i++){let nm;do{nm=pick(F)+' '+pick(L)}while(used[nm]);used[nm]=1;
const u={id:uid(),email:'pegawai'+p2(i)+'@demo.test',password:'pegawai123',app_metadata:{},user_metadata:{}};D.users.push(u);
const e={id:uid(),user_id:u.id,employee_number:'DEMO-'+String(i).padStart(3,'0'),name:nm,department:pick(DEP),position:pick(POS),is_active:true,created_at:iso(),updated_at:iso()};D.employees.push(e);
[[py,pm,pick(['approved','approved','submitted'])],[Y,M,pick(['draft','submitted','revision','approved'])]].forEach(([y,m,st])=>{
const r={id:uid(),employee_id:e.id,year:y,month:m,status:st,submitted_at:st=='draft'?null:iso(),created_at:iso(),updated_at:iso()};D.reports.push(r);
const last=(y==Y&&m==M)?n.getDate():new Date(y,m,0).getDate();
for(let k=0;k<4;k++){const ds=y+'-'+p2(m)+'-'+p2(1+Math.floor(rnd()*last));D.activities.push({id:uid(),report_id:r.id,activity_date:ds,activity_time:new Date(ds+'T'+p2(8+k*2)+':00:00').toISOString(),description:pick(ACT),photo_url:pick(photos),created_at:iso(),updated_at:iso()})}});
for(let b=1,c=0;c<10;b++){const d=new Date(n);d.setDate(n.getDate()-b);if(d.getDay()%6==0)continue;c++;
const ds=d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()),r=D.reports.find(r=>r.employee_id==e.id&&r.year==d.getFullYear()&&r.month==d.getMonth()+1);if(!r)continue;
const la=-7.2575+(rnd()-.5)*.002,lo=112.7521+(rnd()-.5)*.002;
D.attendance.push({id:uid(),report_id:r.id,attendance_date:ds,check_in_time:new Date(ds+'T07:'+p2(rnd()*30|0)+':00').toISOString(),check_out_time:new Date(ds+'T16:'+p2(rnd()*30|0)+':00').toISOString(),check_in_photo:pin,check_out_photo:pout,check_in_latitude:la,check_in_longitude:lo,check_out_latitude:la,check_out_longitude:lo,created_at:iso(),updated_at:iso()})}}
return D}
let DB;function save(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){console.warn('Penyimpanan penuh',e)}}
function load(){try{DB=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!DB||!DB.users){DB=seed();save()}}
window.demoReset=()=>{try{localStorage.removeItem(KEY);sessionStorage.removeItem(SKEY)}catch(e){}location.reload()};
class Q{constructor(t){this.t=t;this.op='select';this.f=[];this.o=[];this.l=null;this.one=0;this.opt={};this.ret=false}
select(c,o){if(this.op=='select')this.opt=o||{};else this.ret=true;return this}
insert(p){this.op='insert';this.p=p;return this}update(p){this.op='update';this.p=p;return this}delete(){this.op='delete';return this}
eq(c,v){this.f.push(r=>r[c]===v);return this}in(c,a){this.f.push(r=>a.includes(r[c]));return this}
not(c,op,v){this.f.push(r=>v===null?r[c]!=null:true);return this}
order(c,o){this.o.push([c,!(o&&o.ascending===false)]);return this}limit(n){this.l=n;return this}
single(){this.one=1;return this}maybeSingle(){this.one=2;return this}
then(a,b){return Promise.resolve(this.run()).then(a,b)}
run(){const T=DB[this.t],m=T.filter(r=>this.f.every(f=>f(r)));let out=m;
if(this.op=='insert'){out=[].concat(this.p).map(p=>Object.assign({id:uid(),created_at:iso(),updated_at:iso()},p));if(this.t=='reports')out.forEach(r=>{r.submitted_at=r.submitted_at||null});T.push(...out);save()}
else if(this.op=='update'){m.forEach(r=>{Object.assign(r,this.p,{updated_at:iso()});if(this.t=='reports'&&this.p.status=='submitted')r.submitted_at=iso()});save()}
else if(this.op=='delete'){DB[this.t]=T.filter(r=>!m.includes(r));if(this.t=='reports'){const ids=m.map(r=>r.id);['activities','attendance'].forEach(k=>DB[k]=DB[k].filter(r=>!ids.includes(r.report_id)))}save()}
if(this.op!='select'&&!this.ret)return{data:null,error:null};
out=JSON.parse(JSON.stringify(out));
this.o.slice().reverse().forEach(([c,asc])=>out.sort((a,b)=>{const x=a[c],y=b[c];if(x==y)return 0;if(x==null)return 1;if(y==null)return -1;return(x>y?1:-1)*(asc?1:-1)}));
const count=out.length;if(this.l!=null)out=out.slice(0,this.l);
if(this.opt.head)return{data:null,count,error:null};
if(this.one==1)return out.length==1?{data:out[0],error:null}:{data:null,error:{message:'Data tidak ditemukan'}};
if(this.one==2)return{data:out[0]||null,error:null};
return{data:out,count,error:null}}}
const client={from:t=>new Q(t),auth:{
async signInWithPassword({email,password}){const u=DB.users.find(u=>u.email==String(email).toLowerCase()&&u.password==password);if(!u)return{data:{user:null},error:{message:'Email atau password salah'}};sessionStorage.setItem(SKEY,u.id);const {password:_,...user}=u;return{data:{user,session:{user}},error:null}},
async getSession(){const u=DB.users.find(u=>u.id==sessionStorage.getItem(SKEY));if(!u)return{data:{session:null}};const {password:_,...user}=u;return{data:{session:{user}}}},
async signOut(){sessionStorage.removeItem(SKEY);return{error:null}}}};
load();window.supabase={createClient:()=>client};
})();
