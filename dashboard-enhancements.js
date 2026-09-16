let dashboardRange={start:null,end:null,label:'This Month'};
const dateOnly=value=>String(value||'').slice(0,10);
const inDashboardRange=value=>{const date=dateOnly(value);return (!dashboardRange.start||date>=dashboardRange.start)&&(!dashboardRange.end||date<=dashboardRange.end)};
const isoDate=date=>date.toISOString().slice(0,10);

function setDashboardPeriod(period){
  const now=new Date(),end=isoDate(now);let start=null,label='All Time';
  if(period==='today'){start=end;label='Today'}
  if(period==='week'){const d=new Date(now);d.setDate(d.getDate()-((d.getDay()+6)%7));start=isoDate(d);label='This Week'}
  if(period==='month'){start=`${end.slice(0,7)}-01`;label='This Month'}
  dashboardRange={start,end:period==='all'?null:end,label};$('#dashboard-from').value=start||'';$('#dashboard-to').value=period==='all'?'':end;$$('.period-btn').forEach(b=>b.classList.toggle('active',b.dataset.period===period));renderDashboard();
}

$$('.period-btn').forEach(button=>button.onclick=()=>setDashboardPeriod(button.dataset.period));
$('#dashboard-apply').onclick=()=>{const start=$('#dashboard-from').value||null,end=$('#dashboard-to').value||null;if(start&&end&&start>end)return toast('From date cannot be after To date');dashboardRange={start,end,label:'Custom Range'};$$('.period-btn').forEach(b=>b.classList.remove('active'));renderDashboard()};

function sixMonthData(){
  const rows=[];const now=new Date();
  for(let n=5;n>=0;n--){const d=new Date(now.getFullYear(),now.getMonth()-n,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;rows.push({key,label:d.toLocaleString('en',{month:'short'}),revenue:0,expense:0})}
  payments.forEach(p=>{const row=rows.find(x=>dateOnly(p.date).startsWith(x.key));if(row)row.revenue+=p.amount});expenses.forEach(e=>{const row=rows.find(x=>dateOnly(e.date).startsWith(x.key));if(row)row.expense+=e.amount});return rows;
}

function renderDashboardChart(){
  const rows=sixMonthData(),max=Math.max(1,...rows.flatMap(x=>[x.revenue,x.expense]));
  $('#dashboard-chart').innerHTML=rows.map(x=>`<div class="chart-month"><div class="chart-bars" title="Revenue ${money(x.revenue)} | Expenses ${money(x.expense)}"><i class="chart-bar revenue" style="height:${Math.max(2,x.revenue/max*100)}%"></i><i class="chart-bar expense" style="height:${Math.max(2,x.expense/max*100)}%"></i></div><small>${x.label}</small></div>`).join('')+`<div class="chart-legend"><span>🔵 Revenue</span><span>🟠 Expense</span></div>`;
}

renderDashboard=function(){
  const filteredInvoices=invoices.filter(i=>inDashboardRange(i.issueDate)),filteredPayments=payments.filter(p=>inDashboardRange(p.date)),filteredExpenses=expenses.filter(e=>inDashboardRange(e.date));
  const invoiced=filteredInvoices.reduce((a,i)=>a+i.total,0),received=filteredPayments.reduce((a,p)=>a+p.amount,0),cost=filteredExpenses.reduce((a,e)=>a+e.amount,0),outstanding=Math.max(0,invoiced-received),net=received-cost,max=Math.max(received,cost,outstanding,1);
  $('#stat-total').textContent=money(invoiced);$('#stat-paid').textContent=money(received);$('#stat-due').textContent=money(outstanding);$('#stat-count').textContent=filteredInvoices.length;$('#dash-received').textContent=money(received);$('#dash-expenses').textContent=money(cost);$('#dash-outstanding').textContent=money(outstanding);$('#dash-net-profit').textContent=money(net);$('#dash-net-profit').className=net>=0?'green':'orange';$('#dashboard-period-label').textContent=dashboardRange.label;
  $('#received-bar').style.width=`${received/max*100}%`;$('#expense-bar').style.width=`${cost/max*100}%`;$('#outstanding-bar').style.width=`${outstanding/max*100}%`;
  const counts={Active:0,Planned:0,Completed:0,'On Hold':0};projects.forEach(p=>counts[p.status]=(counts[p.status]||0)+1);$('#project-overview').innerHTML=`<div class="project-ring" style="--progress:${projects.length?Math.round(counts.Completed/projects.length*100):0}%"><strong>${projects.length}</strong><small>Total</small></div><div class="project-counts"><span><b>${counts.Active}</b> Active</span><span><b>${counts.Planned}</b> Planned</span><span><b>${counts.Completed}</b> Completed</span><span><b>${counts['On Hold']}</b> On hold</span></div>`;
  const now=dateOnly(new Date().toISOString()),outstandingRows=filteredInvoices.map(i=>{const paid=payments.filter(p=>String(p.invoiceId)===String(i.id)).reduce((a,p)=>a+p.amount,0);return {...i,due:Math.max(0,i.total-paid)}}).filter(i=>i.due>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,6);
  $('#dashboard-outstanding-list').innerHTML=outstandingRows.length?outstandingRows.map(i=>`<div class="outstanding-row ${i.dueDate<now?'overdue':''}"><div><strong>${escapeHtml(i.customer.name)}</strong><small>${escapeHtml(i.number)} · Due ${i.dueDate}</small></div><b>${money(i.due)}</b><button class="secondary small" data-go="payments">Payment</button></div>`).join(''):'<p class="muted">No outstanding invoices in this period.</p>';
  const overdue=outstandingRows.filter(i=>i.dueDate<now).length,ocrFailed=(typeof documents!=='undefined'?documents:[]).filter(d=>['FAILED','PENDING'].includes(d.ocr_status)).length,syncFailed=(typeof documents!=='undefined'?documents:[]).filter(d=>d.sheet_sync_status==='FAILED').length;
  const alerts=[];if(overdue)alerts.push(`<div class="danger"><b>${overdue} overdue invoice(s)</b><br>Payment follow-up required.</div>`);if(ocrFailed)alerts.push(`<div><b>${ocrFailed} OCR document(s) need attention</b><br>Review or retry processing.</div>`);if(syncFailed)alerts.push(`<div><b>${syncFailed} Sheet sync failure(s)</b><br>Check Google connection.</div>`);if(!alerts.length)alerts.push('<div class="ok"><b>All clear</b><br>No urgent issue detected.</div>');$('#dashboard-alert-list').innerHTML=alerts.join('');
  renderDashboardChart();
  const activity=[...invoices.slice(0,2).map(i=>({date:i.createdAt||i.issueDate,text:`Invoice ${i.number} created`,meta:i.customer.name})),...payments.slice(0,2).map(p=>({date:p.date,text:`Payment received: ${money(p.amount)}`,meta:p.customer})),...expenses.slice(0,2).map(e=>({date:e.date,text:`Expense added: ${e.title}`,meta:e.category}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);$('#recent-activity').innerHTML=activity.length?activity.map(a=>`<div><span class="activity-dot"></span><p><strong>${escapeHtml(a.text)}</strong><small>${escapeHtml(a.meta)} · ${dateOnly(a.date)}</small></p></div>`).join(''):'<p class="muted">Your latest activity will appear here.</p>';
};

$('#dash-add-expense').onclick=()=>$('#add-expense').click();$('#dash-add-payment').onclick=()=>$('#add-payment').click();$('#dash-upload-document').onclick=()=>$('#add-document').click();
$('#dashboard-outstanding-list').onclick=e=>{if(e.target.closest('[data-go="payments"]'))showView('payments')};
setDashboardPeriod('month');
