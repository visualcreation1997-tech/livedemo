/* ===== FRONTEND APP ===== */

function demoFill(e,p){document.getElementById("email").value=e;document.getElementById("password").value=p}

const SUPABASE_URL='demo',SUPABASE_ANON_KEY='demo';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);let user=null,employee=null,report=null,actPhoto=null,inPhoto=null,outPhoto=null;
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),months=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const today=()=>{let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};const fmt=d=>{if(!d)return'-';let x=new Date(d+'T00:00:00');return String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0')+'/'+x.getFullYear()};
function admin(){return user?.app_metadata?.role==='admin'}
async function login(){
  const email=$('email').value.trim(), password=$('password').value;
  const errorBox=$('authError'), button=document.querySelector('button[onclick="login()"]');
  errorBox.textContent='';
  if(!email||!password){errorBox.textContent='Email dan password wajib diisi.';return;}
  if(!window.supabase){errorBox.textContent='Library Supabase gagal dimuat. Periksa koneksi internet lalu refresh halaman.';return;}
  if(button){button.disabled=true;button.textContent='Memeriksa...';}
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){errorBox.textContent='Login gagal: '+error.message;return;}
    user=data.user||null;
    await init();
  }catch(err){
    errorBox.textContent='Tidak dapat login karena terjadi kesalahan koneksi/aplikasi: '+(err?.message||String(err));
  }finally{
    if(button){button.disabled=false;button.textContent='Login';}
  }
}
async function logout(){await sb.auth.signOut();location.reload()}
async function init(){let s=await sb.auth.getSession();user=s.data?.session?.user||null;if(!user){$('authBox').classList.remove('hidden');$('appBox').classList.add('hidden');return;}$('authBox').classList.add('hidden');$('appBox').classList.remove('hidden');$('dbstat').textContent='terhubung';$('dbstat').classList.add('ok');let e=await sb.from('employees').select('*').eq('user_id',user.id).maybeSingle();employee=e.data;if(employee){$('pName').textContent=employee.name||'-';$('pNumber').textContent=employee.employee_number||'-';$('pDept').textContent=employee.department||'-';$('pPosition').textContent=employee.position||'-'}else if(admin()){$('pName').textContent=user.email;$('pNumber').textContent='ADMIN';$('pDept').textContent='-';$('pPosition').textContent='Administrator';$('tAdmin').classList.remove('hidden')}else alert('Akun ini belum memiliki data pada tabel employees.');if(admin()){$('tAdmin').classList.remove('hidden');$('tReport').classList.add('hidden');$('tAttendance').classList.add('hidden')}let d=new Date();$('year').value=d.getFullYear();$('month').value=d.getMonth()+1;$('actDate').value=today();$('attDate').value=today();if(admin()){tab('admin');await loadAdmin()}else{await openReport();await loadAttendance()}}
async function openReport(){if(!employee){if(admin())return;return}let y=Number($('year').value),m=Number($('month').value);let q=await sb.from('reports').select('*').eq('employee_id',employee.id).eq('year',y).eq('month',m).order('id').limit(1);if(q.error){alert(q.error.message);return}report=q.data?.[0]||null;if(!report){let x=await sb.from('reports').insert({employee_id:employee.id,year:y,month:m,status:'draft'}).select('*').single();if(x.error){alert(x.error.message);return}report=x.data}$('reportInfo').innerHTML='Laporan <b>'+months[m]+' '+y+'</b> — status: <b>'+esc(report.status||'draft')+'</b>';await renderActivities()}
async function submitReport(){if(!report){await openReport();if(!report)return}let q=await sb.from('reports').update({status:'submitted'}).eq('id',report.id).select('*').single();if(q.error)alert(q.error.message);else{report=q.data;$('reportInfo').innerHTML='Laporan <b>'+months[report.month]+' '+report.year+'</b> — status: <b>submitted</b>'}}
function resize(file){return new Promise((res,rej)=>{let r=new FileReader();r.onload=e=>{let i=new Image();i.onload=()=>{let s=Math.min(1,1000/i.width),c=document.createElement('canvas');c.width=Math.max(1,i.width*s);c.height=Math.max(1,i.height*s);c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(Error('Gagal memproses foto')),'image/jpeg',.75)};i.onerror=()=>rej(Error('File gambar tidak valid'));i.src=e.target.result};r.onerror=()=>rej(r.error);r.readAsDataURL(file)})}
async function cloud(file){let b=await resize(file);return await new Promise((ok,no)=>{let r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(b)})}
function photoInput(fileId,boxId,setter){$(fileId).addEventListener('change',async e=>{let f=e.target.files?.[0];if(!f)return;try{$(boxId).textContent='Mengunggah...';let u=await cloud(f);setter(u);$(boxId).innerHTML='<img src="'+esc(u)+'"><input id="'+fileId+'" type="file" accept="image/*">';photoInput(fileId,boxId,setter)}catch(x){$(boxId).textContent='Upload gagal';alert(x.message)}})}photoInput('actFile','actBox',u=>actPhoto=u);photoInput('inFile','inBox',u=>inPhoto=u);photoInput('outFile','outBox',u=>outPhoto=u);
async function addActivity(){if(!report){await openReport();if(!report)return}let date=$('actDate').value,desc=$('actDesc').value.trim(),time=$('actTime').value;if(!date||!desc)return alert('Tanggal dan uraian wajib diisi');let p={report_id:report.id,activity_date:date,description:desc,photo_url:actPhoto||null};if(time)p.activity_time=new Date(date+'T'+time+':00').toISOString();let q=await sb.from('activities').insert(p);if(q.error)return alert(q.error.message);$('actDesc').value='';$('actTime').value='';actPhoto=null;$('actBox').innerHTML='Klik untuk memilih foto<input id="actFile" type="file" accept="image/*">';photoInput('actFile','actBox',u=>actPhoto=u);await renderActivities()}
async function renderActivities(){if(!report){$('actTable').innerHTML='<div class="small">Belum ada laporan.</div>';return}let q=await sb.from('activities').select('*').eq('report_id',report.id).order('activity_date').order('activity_time');if(q.error)return $('actTable').innerHTML='<div class="error">'+esc(q.error.message)+'</div>';$('actCount').textContent=q.data?.length||0;if(!q.data?.length)return $('actTable').innerHTML='<div class="small" style="padding:20px;text-align:center">Belum ada kegiatan.</div>';let h='<table><tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Foto</th><th>Uraian</th><th>Aksi</th></tr>';q.data.forEach((x,i)=>h+='<tr><td>'+(i+1)+'</td><td>'+fmt(x.activity_date)+'</td><td>'+esc(x.activity_time?new Date(x.activity_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-')+'</td><td>'+(x.photo_url?'<img class="photo" src="'+esc(x.photo_url)+'">':'-')+'</td><td class="left">'+esc(x.description)+'</td><td><button class="danger" onclick="delAct(\''+x.id+'\')">Hapus</button></td></tr>');$('actTable').innerHTML=h+'</table>'}
async function delAct(id){if(!confirm('Hapus kegiatan ini?'))return;let q=await sb.from('activities').delete().eq('id',id);if(q.error)alert(q.error.message);else renderActivities()}
async function getReportForDate(date){let d=new Date(date+'T00:00:00'),y=d.getFullYear(),m=d.getMonth()+1,q=await sb.from('reports').select('*').eq('employee_id',employee.id).eq('year',y).eq('month',m).order('id').limit(1);if(q.error)return{error:q.error};if(q.data?.[0])return{data:q.data[0]};let x=await sb.from('reports').insert({employee_id:employee.id,year:y,month:m,status:'draft'}).select('*').single();return x.error?{error:x.error}:{data:x.data}}
function position(){return new Promise(r=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>r([p.coords.latitude,p.coords.longitude]),()=>r(null),{enableHighAccuracy:true,timeout:8000}):r(null))}
function attDateVal(){return $('attDate')?.value||today()}
function stampAt(date){let n=new Date(),t=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');return new Date(date+'T'+t).toISOString()}
async function checkIn(){if(!employee)return;let date=attDateVal(),r=await getReportForDate(date);if(r.error)return alert(r.error.message);let q=await sb.from('attendance').select('*').eq('report_id',r.data.id).eq('attendance_date',date).order('id').limit(1),old=q.data?.[0];if(old?.check_in_time)return alert('Sudah check-in hari ini');let pos=await position(),p={report_id:r.data.id,attendance_date:date,check_in_time:stampAt(date),check_in_photo:inPhoto||null};if(pos){p.check_in_latitude=pos[0];p.check_in_longitude=pos[1]}let x=old?await sb.from('attendance').update(p).eq('id',old.id):await sb.from('attendance').insert(p);if(x.error)alert(x.error.message);else{inPhoto=null;$('inBox').innerHTML='Pilih foto<input id="inFile" type="file" accept="image/*">';photoInput('inFile','inBox',u=>inPhoto=u);loadAttendance()}}
async function checkOut(){if(!employee)return;let date=attDateVal(),r=await getReportForDate(date);if(r.error)return alert(r.error.message);let q=await sb.from('attendance').select('*').eq('report_id',r.data.id).eq('attendance_date',date).order('id').limit(1),old=q.data?.[0];if(!old?.check_in_time)return alert('Check-in terlebih dahulu');if(old.check_out_time)return alert('Sudah check-out hari ini');let p={check_out_time:stampAt(date),check_out_photo:outPhoto||null},x=await sb.from('attendance').update(p).eq('id',old.id);if(x.error)alert(x.error.message);else{outPhoto=null;$('outBox').innerHTML='Pilih foto<input id="outFile" type="file" accept="image/*">';photoInput('outFile','outBox',u=>outPhoto=u);loadAttendance()}}
async function loadAttendance(){if(!employee)return;let date=attDateVal(),r=await getReportForDate(date);if(r.error)return;$('attInfo').textContent='Tanggal '+fmt(date);let q=await sb.from('attendance').select('*').eq('report_id',r.data.id).eq('attendance_date',date).order('id').limit(1),a=q.data?.[0];$('attInfo').innerHTML='Tanggal: <b>'+fmt(date)+'</b> | Check-in: <b>'+(a?.check_in_time?new Date(a.check_in_time).toLocaleTimeString('id-ID'):'belum')+'</b> | Check-out: <b>'+(a?.check_out_time?new Date(a.check_out_time).toLocaleTimeString('id-ID'):'belum')+'</b>';let rs=await sb.from('reports').select('id').eq('employee_id',employee.id);let ids=(rs.data||[]).map(x=>x.id);if(!ids.length)return;$('attTable').innerHTML='';let z=await sb.from('attendance').select('*').in('report_id',ids).order('attendance_date',{ascending:false}).limit(100);if(z.error)return $('attTable').innerHTML='<div class="error">'+esc(z.error.message)+'</div>';let h='<table><tr><th>Tanggal</th><th>Check-in</th><th>Check-out</th><th>Foto In</th><th>Foto Out</th></tr>';(z.data||[]).forEach(x=>h+='<tr><td>'+fmt(x.attendance_date)+'</td><td>'+esc(x.check_in_time?new Date(x.check_in_time).toLocaleTimeString('id-ID'):'-')+'</td><td>'+esc(x.check_out_time?new Date(x.check_out_time).toLocaleTimeString('id-ID'):'-')+'</td><td>'+(x.check_in_photo?'<a target="_blank" href="'+esc(x.check_in_photo)+'">Lihat</a>':'-')+'</td><td>'+(x.check_out_photo?'<a target="_blank" href="'+esc(x.check_out_photo)+'">Lihat</a>':'-')+'</td></tr>');$('attTable').innerHTML=h+'</table>'}
function tab(x){['report','attendance','admin'].forEach(n=>{$(n+'Tab').classList.toggle('hidden',n!==x);$('t'+n[0].toUpperCase()+n.slice(1)).classList.toggle('active',n===x)});if(x==='admin')loadAdmin()}
async function loadAdmin(){
 if(!admin())return;
 let [e,r,a,at]=await Promise.all([
  sb.from('employees').select('id,name,employee_number,department,position,is_active').order('name'),
  sb.from('reports').select('id,employee_id,year,month,status,submitted_at'),
  sb.from('activities').select('id',{count:'exact',head:true}),
  sb.from('attendance').select('id',{count:'exact',head:true})
 ]);
 $('sEmp').textContent=(e.data||[]).filter(x=>x.is_active).length;
 $('sRep').textContent=r.data?.length||0;
 $('sAct').textContent=a.count??0;
 $('sAtt').textContent=at.count??0;
 const sel=$('adminEmployeeSelect');
 sel.innerHTML='<option value="">-- Pilih nama pegawai --</option>'+(e.data||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' — '+esc(x.employee_number)+'</option>').join('');
 let d=new Date();$('adminYear').value=d.getFullYear();$('adminMonth').value=d.getMonth()+1;
}
async function deleteAllReports(){
 if(!admin())return alert('Hanya admin yang dapat menghapus laporan.');
 if(!confirm('PERINGATAN: Semua laporan, kegiatan, dan absensi SEMUA pegawai akan dihapus permanen. Lanjutkan?'))return;
 const k=prompt('Ketik HAPUS (huruf besar) untuk memastikan:');
 if(k!=='HAPUS')return alert('Dibatalkan. Tidak ada data yang dihapus.');
 const info=$('deleteAllInfo');info.textContent='Menghapus...';
 const steps=[['attendance','absensi'],['activities','kegiatan'],['reports','laporan']];
 for(const [t,n] of steps){
  const q=await sb.from(t).delete().not('id','is',null);
  if(q.error){info.innerHTML='<span class="error">Gagal menghapus '+n+': '+esc(q.error.message)+'</span>';return;}
 }
 info.textContent='Semua laporan, kegiatan, dan absensi berhasil dihapus.';
 $('adminReportResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Pilih pegawai lalu klik Cek Laporan.</div>';
 $('adminAttendanceResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Pilih pegawai lalu klik Cek Absensi.</div>';
 await loadAdmin();
}
async function deleteReportsByMonth(){
 if(!admin())return alert('Hanya admin yang dapat menghapus laporan.');
 const year=Number($('adminYear').value),month=Number($('adminMonth').value);
 if(!year||!month)return alert('Pilih tahun dan bulan pada Periode Laporan terlebih dahulu.');
 const label=months[month]+' '+year,info=$('deleteAllInfo');
 const r=await sb.from('reports').select('id').eq('year',year).eq('month',month);
 if(r.error)return alert('Gagal membaca laporan: '+r.error.message);
 const ids=(r.data||[]).map(x=>x.id);
 if(!ids.length)return alert('Tidak ada laporan pada '+label+'.');
 if(!confirm('PERINGATAN: '+ids.length+' laporan SEMUA pegawai pada '+label+' beserta kegiatan dan absensinya akan dihapus permanen. Lanjutkan?'))return;
 const k=prompt('Ketik HAPUS (huruf besar) untuk memastikan:');
 if(k!=='HAPUS')return alert('Dibatalkan. Tidak ada data yang dihapus.');
 info.textContent='Menghapus '+label+'...';
 for(const t of ['attendance','activities']){
  const q=await sb.from(t).delete().in('report_id',ids);
  if(q.error){info.innerHTML='<span class="error">Gagal menghapus '+t+': '+esc(q.error.message)+'</span>';return;}
 }
 const d=await sb.from('reports').delete().in('id',ids);
 if(d.error){info.innerHTML='<span class="error">Gagal menghapus laporan: '+esc(d.error.message)+'</span>';return;}
 info.textContent='Laporan '+label+' ('+ids.length+' laporan) berhasil dihapus.';
 $('adminReportResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Pilih pegawai lalu klik Cek Laporan.</div>';
 $('adminAttendanceResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Pilih pegawai lalu klik Cek Absensi.</div>';
 const y=$('adminYear').value,m=$('adminMonth').value;
 await loadAdmin();
 $('adminYear').value=y;$('adminMonth').value=m;
}
function adminSelectedEmployee(){
 const id=$('adminEmployeeSelect').value;
 if(!id){alert('Pilih nama pegawai terlebih dahulu.');return null;}
 return id;
}
async function adminGetReport(){
 const employeeId=adminSelectedEmployee();if(!employeeId)return null;
 const year=Number($('adminYear').value),month=Number($('adminMonth').value);
 let q=await sb.from('reports').select('*').eq('employee_id',employeeId).eq('year',year).eq('month',month).order('id').limit(1);
 if(q.error){alert('Gagal membaca laporan: '+q.error.message);return null;}
 return q.data?.[0]||null;
}
async function adminCheckReport(){
 const employeeId=adminSelectedEmployee();if(!employeeId)return;
 const report=await adminGetReport();
 const empName=$('adminEmployeeSelect').selectedOptions[0]?.textContent||'';
 if(!report){
  $('adminSelectedInfo').textContent=empName+' — belum memiliki laporan untuk '+months[Number($('adminMonth').value)]+' '+$('adminYear').value+'.';
  $('adminReportResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Belum ada laporan pada periode tersebut.</div>';
  return;
 }
 $('adminSelectedInfo').textContent=empName+' — '+months[report.month]+' '+report.year+' — status: '+(report.status||'draft');
 let q=await sb.from('activities').select('*').eq('report_id',report.id).order('activity_date').order('activity_time');
 if(q.error){$('adminReportResult').innerHTML='<div class="error">'+esc(q.error.message)+'</div>';return;}
 if(!q.data?.length){$('adminReportResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Laporan ada, tetapi belum ada kegiatan.</div>';return;}
 let h='<table><tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Foto</th><th>Uraian Kegiatan</th></tr>';
 q.data.forEach((x,i)=>h+='<tr><td>'+(i+1)+'</td><td>'+fmt(x.activity_date)+'</td><td>'+esc(x.activity_time?new Date(x.activity_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'-')+'</td><td>'+(x.photo_url?'<a target="_blank" href="'+esc(x.photo_url)+'"><img class="photo" src="'+esc(x.photo_url)+'"></a>':'-')+'</td><td class="left">'+esc(x.description)+'</td></tr>');
 $('adminReportResult').innerHTML=h+'</table>';
}
async function adminCheckAttendance(){
 const employeeId=adminSelectedEmployee();if(!employeeId)return;
 const year=Number($('adminYear').value),month=Number($('adminMonth').value);
 let r=await sb.from('reports').select('id').eq('employee_id',employeeId).eq('year',year).eq('month',month).order('id').limit(1);
 if(r.error){alert('Gagal membaca laporan: '+r.error.message);return;}
 const empName=$('adminEmployeeSelect').selectedOptions[0]?.textContent||'';
 if(!r.data?.[0]){ $('adminAttendanceResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Belum ada laporan/absensi pada periode tersebut.</div>';return; }
 let q=await sb.from('attendance').select('*').eq('report_id',r.data[0].id).order('attendance_date',{ascending:false});
 if(q.error){$('adminAttendanceResult').innerHTML='<div class="error">'+esc(q.error.message)+'</div>';return;}
 $('adminSelectedInfo').textContent=empName+' — absensi '+months[month]+' '+year;
 if(!q.data?.length){$('adminAttendanceResult').innerHTML='<div class="small" style="padding:20px;text-align:center">Belum ada data absensi.</div>';return;}
 let h='<table><tr><th>Tanggal</th><th>Check-in</th><th>Check-out</th><th>Foto In</th><th>Foto Out</th><th>Lokasi</th></tr>';
 q.data.forEach(x=>h+='<tr><td>'+fmt(x.attendance_date)+'</td><td>'+esc(x.check_in_time?new Date(x.check_in_time).toLocaleTimeString('id-ID'):'-')+'</td><td>'+esc(x.check_out_time?new Date(x.check_out_time).toLocaleTimeString('id-ID'):'-')+'</td><td>'+(x.check_in_photo?'<a target="_blank" href="'+esc(x.check_in_photo)+'">Lihat</a>':'-')+'</td><td>'+(x.check_out_photo?'<a target="_blank" href="'+esc(x.check_out_photo)+'">Lihat</a>':'-')+'</td><td>'+((x.check_in_latitude!=null&&x.check_in_longitude!=null)?esc(Number(x.check_in_latitude).toFixed(5)+', '+Number(x.check_in_longitude).toFixed(5)):'-')+'</td></tr>');
 $('adminAttendanceResult').innerHTML=h+'</table>';
}
function reportWordCss(){return `
@page{size:A4 portrait;margin:1.2cm 1cm 1.2cm 1cm}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;margin:0}
.title{text-align:center;font-weight:700;font-size:14pt;margin:0 0 3pt}
.subtitle{text-align:center;font-weight:700;font-size:11pt;margin:0 0 6pt}
table{border-collapse:collapse}
.meta{width:100%;margin:2pt 0 7pt;table-layout:fixed;border:none;border-collapse:collapse}
.meta td{border:none;padding:0;vertical-align:top;font-size:10pt;outline:none}
.meta .schedule{width:40%;text-align:left;font-size:9pt;line-height:13pt;padding-left:0;vertical-align:top}
.report{width:100%;table-layout:fixed}
.report th,.report td{border:1px solid #000;padding:4pt;vertical-align:middle}
.report th{text-align:center;font-weight:700;height:24pt}
.report thead{display:table-header-group}.report .identity-row{page-break-after:avoid}.report .identity-row td{border:none}
.report tr{page-break-inside:avoid}
.report .repeat-meta{font-weight:700;text-align:left;font-size:10pt;line-height:16pt;padding:0 0 4pt;border:none;background:#fff;outline:none;mso-border-alt:none}
.report .repeat-meta .meta{display:table;width:100%}
.report td:nth-child(1){text-align:center}
.report td:nth-child(2){text-align:center;font-weight:600}
.report td:nth-child(3){text-align:center}
.report td:nth-child(4){text-align:center;font-weight:600}
.report img{width:5.2cm;height:4.1cm;object-fit:cover;display:block;margin:0 auto}
.sign{width:100%;margin-top:28pt;table-layout:fixed;border-collapse:collapse}
.sign td{border:0;text-align:center;vertical-align:top;width:50%;font-size:10pt;line-height:16pt;padding:0}
`;}
function attendanceWordCss(){return `
@page{size:A4 portrait;margin:1.0cm 1.0cm 1.0cm 1.0cm}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;margin:0}
.title{text-align:center;font-weight:700;font-size:15pt;margin:0 0 7pt}
.subtitle{text-align:center;font-weight:700;font-size:11pt;margin:0 0 6pt}
.meta{width:100%;margin:2pt 0 7pt;border-collapse:collapse;table-layout:fixed;border:none}
.meta td{border:none;padding:0;vertical-align:top;font-size:10pt;outline:none}
.meta .schedule{width:40%;text-align:left;padding-left:0;line-height:13pt;font-weight:400;font-size:9pt}
.att{width:100%;border-collapse:collapse;table-layout:fixed}
.att th,.att td{border:1px solid #000;vertical-align:middle}
.att th{padding:4pt 2pt;text-align:center;font-weight:700;font-size:9pt;line-height:11pt}
.att thead{display:table-header-group}.att .identity-row{page-break-after:avoid}.att .identity-row td{border:none}
.att tr{page-break-inside:avoid}
.att .meta td{text-align:left;font-size:10pt;font-weight:700;line-height:16pt}
.att .meta td.schedule{font-size:9pt;line-height:13pt;font-weight:400}
.att .repeat-meta{font-weight:700;text-align:left;font-size:10pt;line-height:16pt;padding:0 0 4pt;border:none;background:#fff;outline:none;box-shadow:none;mso-border-alt:none}
.att td{padding:2pt;text-align:center;font-size:9pt}
.att .num{width:6%;font-weight:700}
.att .date{width:14%;font-weight:700}
.att .photo{width:40%}
.att tr.data-row td{height:150pt}
.att img{width:4.4cm;height:4.4cm;object-fit:cover;display:block;margin:0 auto}
.sign{width:100%;margin-top:18pt;border-collapse:collapse;table-layout:fixed}
.sign td{border:1px dashed #cfcfcf;text-align:center;vertical-align:top;width:50%;font-size:10pt;line-height:14pt;padding:8pt 4pt}
.sign .blank{height:120pt}
.sign .right{padding-top:8pt}
`;}

function saveDocSubtitle(v){
  localStorage.setItem('attendance_doc_subtitle',(v||'').trim());
}

function getDocSubtitle(adminMode=false){
  const el=$(adminMode?'adminDocSubtitle':'docSubtitle');
  const v=(el?.value||'').trim();
  const fallback='Belanja Jasa Tenaga Kebersihan (Satgas)';
  if(v)localStorage.setItem('attendance_doc_subtitle',v);
  return v||localStorage.getItem('attendance_doc_subtitle')||fallback;
}
function restoreDocSubtitle(){
  const v=localStorage.getItem('attendance_doc_subtitle')||'Belanja Jasa Tenaga Kebersihan (Satgas)';
  ['docSubtitle','adminDocSubtitle'].forEach(id=>{if($(id))$(id).value=v;});
}

function attendancePhoto(url){
  return url ? '<img src="'+esc(url)+'" width="166" height="166" style="width:4.4cm;height:4.4cm;object-fit:cover;display:block;margin:0 auto">' : '-';
}
function downloadBlob(blob,filename){
  if(!blob)return alert('Dokumen Word gagal dibuat.');
  const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1500);
}

function attendanceSignHtml(name,ppkName,ppkPosition,ppkNip){
  return '<table class="sign"><tr>'+
    '<td><div> </div><div class="blank"></div></td>'+
    '<td class="right">Mengetahui,<br>PPK,<br><br><br><br><br><br><br><u>'+esc(ppkName||'')+'</u><br>'+esc(ppkPosition||'')+'<br>NIP. '+esc(ppkNip||'')+'</td>'+
    '</tr></table>';
}

/* Identitas Nama & Bulan berada di THEAD agar otomatis berulang pada setiap halaman Word/PDF. */
function splitHtmlRows(rows){return String(rows||'').match(/<tr[\s\S]*?<\/tr>/gi)||[];}
/* Nama/Bulan berada di header tabel dan otomatis diulang oleh Word pada setiap halaman. */
function metaBlock(name,period){
  return '<table class="meta"><tr><td style="width:60%;font-weight:700;line-height:16pt;text-align:left;border:0">Nama : '+esc(name||'')+'<br>Bulan : '+esc(period)+'</td><td class="schedule" style="width:40%">'+scheduleHtml()+'</td></tr></table>';
}
function pagedTables(cls,name,period,rows,head,firstCount){
  const all=splitHtmlRows(rows);if(!all.length)return "";
  /*
   * Halaman 1: Nama, Bulan & Jadwal Kerja sejajar (tabel pertama).
   * Halaman berikutnya: hanya Nama & Bulan yang berulang (THEAD tabel kedua).
   * Garis dihilangkan dengan border:none (tanpa !important) + atribut border="0".
   */
  const noB='border:none;border-top:none;border-right:none;border-bottom:none;border-left:none;mso-border-alt:none;outline:none;background:#fff;';
  const sch=scheduleHtml();
  const isAtt=cls==='att';
  /* perkiraan jumlah baris yang muat di halaman 1, menyesuaikan tinggi jadwal kerja */
  const schLines=sch?sch.split('<br>').reduce((n,l)=>n+Math.max(1,Math.ceil(l.length/45)),0):0;
  const avail=(isAtt?685:698)-Math.max(32,schLines*13);
  const n=Math.max(1,Math.floor(avail/(isAtt?200:135)));
  const nameCell=(w)=>'<td style="width:'+w+';'+noB+'padding:0;vertical-align:top;text-align:left;font-size:10pt;line-height:16pt;font-weight:700">Nama : '+esc(name||'')+'<br>Bulan : '+esc(period)+'</td>';
  const schCell='<td class="schedule" style="width:40%;'+noB+'padding:0;vertical-align:top;text-align:left;font-size:9pt;line-height:13pt;font-weight:400">'+sch+'</td>';
  const metaRow=(withSchedule)=>'<tr class="identity-row">'+
    '<td colspan="4" class="repeat-meta" style="'+noB+'text-align:left;font-weight:700;padding:0 0 5pt;vertical-align:top">'+
    '<table border="0" cellspacing="0" cellpadding="0" class="meta" style="width:100%;margin:0;'+noB+'border-collapse:collapse;table-layout:fixed"><tr>'+
    (withSchedule?nameCell('60%')+schCell:nameCell('100%'))+
    '</tr></table></td></tr>';
  /* Absensi halaman 1: baris jadwal kerja TIDAK di THEAD agar tidak ikut berulang di halaman berikutnya */
  const build=(rs,withSchedule)=>(isAtt&&withSchedule)
    ?'<table class="'+cls+'" border="0" cellspacing="0" cellpadding="0"><tbody>'+metaRow(true)+head+rs.join('')+'</tbody></table>'
    :'<table class="'+cls+'" border="0" cellspacing="0" cellpadding="0"><thead>'+metaRow(withSchedule)+head+'</thead><tbody>'+rs.join('')+'</tbody></table>';
  let out=build(all.slice(0,n),true);
  if(all.length>n){
    out+='<p style="page-break-before:always;margin:0;padding:0;font-size:1pt;line-height:1pt">&nbsp;</p>'+build(all.slice(n),false);
  }
  return out;
}
function reportPagedTables(name,period,rows){
  return pagedTables('report',name,period,rows,'<tr><th style="width:6%">No</th><th style="width:14%">Tanggal</th><th style="width:40%">Dokumentasi Kegiatan</th><th style="width:40%">Uraian Kegiatan</th></tr>',4);
}
function attendancePagedTables(empName,period,rows){
  return pagedTables('att',empName,period,rows,'<tr><th class="num">No</th><th class="date">Tanggal</th><th class="photo">Data Dukung Kehadiran Datang</th><th class="photo">Data Dukung Kehadiran Pulang</th></tr>',4);
}
function saveSchedule(){
  const e=$('scheduleWork'),a=$('adminScheduleWork');
  const active=(document.activeElement===a?a:e);
  const v=active?.value||'';
  /* simpan apa adanya (tanpa trim) agar spasi/enter bisa diketik; field yang sedang diketik tidak ditimpa */
  localStorage.setItem('work_schedule',v);
  const other=(active===a?e:a);
  if(other)other.value=v;
}
function getSchedule(){
  return (localStorage.getItem('work_schedule')||'').trim();
}
function restoreSchedule(){
  const v=getSchedule();
  ['scheduleWork','adminScheduleWork'].forEach(id=>{if($(id))$(id).value=v;});
}
function scheduleHtml(){
  const v=getSchedule();
  return v ? esc(v).replace(/\r?\n/g,'<br>') : '';
}
function buildAttendanceWordHtml(rows,empName,empNumber,department,position,period,ppkName,ppkPosition,ppkNip,subtitle){
  return '<html><head><meta charset="utf-8"><style>'+attendanceWordCss()+'</style></head><body>'+
    '<div class="title">DAFTAR HADIR</div>'+
    '<div class="subtitle">'+esc(subtitle||'Belanja Jasa Tenaga Kebersihan (Satgas)')+'</div>'+
    attendancePagedTables(empName,period,rows)+
    attendanceSignHtml(empName,ppkName,ppkPosition,ppkNip)+
    '</body></html>';
}

async function attendanceWord(){
  if(!employee)return alert('Data pegawai belum tersedia.');
  let rs=await sb.from('reports').select('id,year,month').eq('employee_id',employee.id);
  if(rs.error)return alert('Gagal membaca laporan: '+rs.error.message);
  let ids=(rs.data||[]).map(x=>x.id);
  if(!ids.length)return alert('Belum ada data absensi untuk pegawai ini.');
  let q=await sb.from('attendance').select('*').in('report_id',ids).order('attendance_date',{ascending:true}).limit(1000);
  if(q.error)return alert('Gagal membaca absensi: '+q.error.message);
  if(!q.data?.length)return alert('Belum ada data absensi untuk diunduh.');
  let rows='';
  q.data.forEach((x,i)=>{rows+='<tr class="data-row"><td class="num">'+(i+1)+'</td><td class="date">'+fmt(x.attendance_date)+'</td><td class="photo">'+attendancePhoto(x.check_in_photo)+'</td><td class="photo">'+attendancePhoto(x.check_out_photo)+'</td></tr>';});
  let ppkName=$('ppkName')?.value||'',ppkPosition=$('ppkPosition')?.value||'',ppkNip=$('ppkNip')?.value||'';
  let first=rs.data?.[0],period=first?(months[first.month]+' '+first.year):'';
  let h=buildAttendanceWordHtml(rows,employee.name,employee.employee_number,employee.department,employee.position,period,ppkName,ppkPosition,ppkNip,getDocSubtitle(false));
  downloadBlob(htmlDocx.asBlob(h),'Absensi_'+(employee.name||'Employee').replace(/\s+/g,'_')+'.docx');
}

async function adminAttendanceWord(){
  const employeeId=adminSelectedEmployee();if(!employeeId)return;
  let emp=await sb.from('employees').select('name,employee_number,department,position').eq('id',employeeId).single();
  if(emp.error)return alert('Gagal membaca pegawai: '+emp.error.message);
  let year=Number($('adminYear').value),month=Number($('adminMonth').value);
  let r=await sb.from('reports').select('id').eq('employee_id',employeeId).eq('year',year).eq('month',month).order('id').limit(1);
  if(r.error)return alert('Gagal membaca laporan: '+r.error.message);
  if(!r.data?.[0])return alert('Belum ada laporan/absensi pada periode tersebut.');
  let q=await sb.from('attendance').select('*').eq('report_id',r.data[0].id).order('attendance_date',{ascending:true});
  if(q.error)return alert('Gagal membaca absensi: '+q.error.message);
  if(!q.data?.length)return alert('Belum ada data absensi untuk diunduh.');
  let rows='';
  q.data.forEach((x,i)=>{rows+='<tr class="data-row"><td class="num">'+(i+1)+'</td><td class="date">'+fmt(x.attendance_date)+'</td><td class="photo">'+attendancePhoto(x.check_in_photo)+'</td><td class="photo">'+attendancePhoto(x.check_out_photo)+'</td></tr>';});
  let h=buildAttendanceWordHtml(rows,emp.data.name,emp.data.employee_number,emp.data.department,emp.data.position,months[month]+' '+year,$('adminPpkName')?.value||'',$('adminPpkPosition')?.value||'',$('adminPpkNip')?.value||'',getDocSubtitle(true));
  downloadBlob(htmlDocx.asBlob(h),'Absensi_'+(emp.data.name||'Employee').replace(/\s+/g,'_')+'_'+year+'_'+String(month).padStart(2,'0')+'.docx');
}

async function adminDownloadWord(){
  const employeeId=adminSelectedEmployee();if(!employeeId)return;
  const report=await adminGetReport();
  if(!report){alert('Belum ada laporan untuk pegawai dan periode tersebut.');return;}
  let emp=await sb.from('employees').select('name,employee_number,department,position').eq('id',employeeId).single();
  if(emp.error){alert('Gagal membaca pegawai: '+emp.error.message);return;}
  let q=await sb.from('activities').select('*').eq('report_id',report.id).order('activity_date').order('activity_time');
  if(q.error)return alert('Gagal membaca kegiatan: '+q.error.message);
  if(!q.data?.length)return alert('Belum ada kegiatan untuk diunduh.');
  let rows='';q.data.forEach((x,i)=>rows+='<tr><td style="text-align:center;width:6%">'+(i+1)+'</td><td style="text-align:center;width:14%;font-weight:600">'+fmt(x.activity_date)+'</td><td style="text-align:center;width:40%;height:145px">'+(x.photo_url?'<img src="'+esc(x.photo_url)+'" width="197" height="155" style="width:5.2cm;height:4.1cm;display:block;margin:0 auto">':'-')+'</td><td style="text-align:center;width:40%;font-weight:600">'+esc(x.description)+'</td></tr>');
  const name=emp.data.name||'Employee';
  const html='<html><head><meta charset="utf-8"><style>'+reportWordCss()+'</style></head><body>'+
    '<div class="title">LAPORAN KEGIATAN</div>'+
    '<div class="subtitle">'+esc(getDocSubtitle(true))+'</div>'+
    reportPagedTables(name,months[report.month]+' '+report.year,rows)+
    '<table class="sign"><tr><td style="text-align:center;vertical-align:top;">Mengetahui,<br>PPK,<br><br><br><br><br><br><br><u>'+esc($('adminPpkName').value||'')+'</u><br>'+esc($('adminPpkPosition').value||'')+'<br>NIP. '+esc($('adminPpkNip').value||'')+'</td><td style="text-align:center;vertical-align:top;"><br>Yang Membuat Laporan,<br><br><br><br><br><br><br><u>'+esc(name)+'</u></td></tr></table>'+
    '</body></html>';
  downloadBlob(htmlDocx.asBlob(html),'Laporan_'+name.replace(/\s+/g,'_')+'_'+report.year+'_'+String(report.month).padStart(2,'0')+'.docx');
}

async function word(){
  if(!report)return alert('Buka laporan terlebih dahulu');
  let q=await sb.from('activities').select('*').eq('report_id',report.id).order('activity_date').order('activity_time');
  if(q.error)return alert(q.error.message);if(!q.data?.length)return alert('Belum ada kegiatan');
  let rows='';q.data.forEach((x,i)=>rows+='<tr><td style="text-align:center;width:6%">'+(i+1)+'</td><td style="text-align:center;width:14%;font-weight:600">'+fmt(x.activity_date)+'</td><td style="text-align:center;width:40%;height:145px">'+(x.photo_url?'<img src="'+esc(x.photo_url)+'" width="197" height="155" style="width:5.2cm;height:4.1cm;display:block;margin:0 auto">':'-')+'</td><td style="text-align:center;width:40%;font-weight:600">'+esc(x.description)+'</td></tr>');
  let name=employee?.name||user.email;
  let html='<html><head><meta charset="utf-8"><style>'+reportWordCss()+'</style></head><body>'+
    '<div class="title">LAPORAN KEGIATAN</div>'+
    '<div class="subtitle">'+esc(getDocSubtitle(false))+'</div>'+
    reportPagedTables(name,months[report.month]+' '+report.year,rows)+
    '<table class="sign"><tr><td style="text-align:center;vertical-align:top;">Mengetahui,<br>PPK,<br><br><br><br><br><br><br><u>'+esc($('ppkName').value||'')+'</u><br>'+esc($('ppkPosition').value||'')+'<br>NIP. '+esc($('ppkNip').value||'')+'</td><td style="text-align:center;vertical-align:top;"><br>Yang Membuat Laporan,<br><br><br><br><br><br><br><u>'+esc(name)+'</u></td></tr></table>'+
    '</body></html>';
  downloadBlob(htmlDocx.asBlob(html),'Laporan_'+name.replace(/\s+/g,'_')+'_'+report.year+'_'+report.month+'.docx');
}
restoreDocSubtitle();
restoreSchedule();
init();
