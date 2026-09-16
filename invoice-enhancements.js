let editingInvoiceId=null;

function invoiceFormData(){
  const customer=customers.find(c=>String(c.id)===String($('#customer-select').value));
  const items=$$('.item-row').map(r=>({description:r.querySelector('.desc').value.trim(),months:'1',quantity:r.querySelector('.qty').value,unit_price:r.querySelector('.rate').value,service_charge:r.querySelector('.service')?.value||'0',tax_rate:r.querySelector('.tax').value}));
  return {customer,items,payload:{number:$('#invoice-number').value.trim(),customer:customer?+customer.id:null,issue_date:$('#issue-date').value,due_date:$('#due-date').value,invoice_type:$('#invoice-type').value,tax_type:$('#tax-type').value,invoice_period:$('#invoice-period').value.trim(),contract_name:$('#contract-name').value.trim(),status:'SENT',discount:String(calculate().discount),notes:$('#notes').value,items}};
}

function validateInvoiceForm(){
  const {customer,items}=invoiceFormData();
  if(!customer){toast('Please select a customer');return false}
  if(!$('#invoice-number').value.trim()){toast('Invoice number is required');return false}
  if(!$('#issue-date').value||!$('#due-date').value){toast('Issue date and due date are required');return false}
  if($('#due-date').value<$('#issue-date').value){toast('Due date cannot be before issue date');return false}
  if(!items.length||items.some(x=>!x.description)){toast('Enter a description for every item');return false}
  if(items.some(x=>+x.quantity<=0)){toast('Quantity must be greater than zero');return false}
  if(items.some(x=>+x.unit_price<0||+x.service_charge<0||+x.tax_rate<0)){toast('Amounts and tax cannot be negative');return false}
  return true;
}

function resetInvoiceEditor(){editingInvoiceId=null;$('#save-invoice').textContent='Save Invoice';$('#invoice-number').readOnly=false}

$('#invoice-form').addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  if(!validateInvoiceForm())return;
  const {payload}=invoiceFormData();
  if($('#invoice-revenue-account').value)payload.revenue_account=+$('#invoice-revenue-account').value;
  const button=$('#save-invoice');button.disabled=true;button.textContent=editingInvoiceId?'Updating…':'Saving…';
  try{
    await api(editingInvoiceId?`/invoices/${editingInvoiceId}/`:'/invoices/',{method:editingInvoiceId?'PUT':'POST',body:JSON.stringify(payload)});
    const wasEdit=Boolean(editingInvoiceId);resetInvoiceEditor();e.target.reset();$('#items').innerHTML='';updateTaxType();await Promise.all([loadPhaseOne(),loadAccounting()]);showView('invoices');toast(wasEdit?'Invoice updated successfully':'Invoice saved successfully');
  }catch(error){toast(error.message)}finally{button.disabled=false;if(!editingInvoiceId)button.textContent='Save Invoice'}
},true);

function loadInvoiceIntoForm(invoice,duplicate=false){
  showView('create');
  editingInvoiceId=duplicate?null:invoice.id;
  $('#invoice-number').value=duplicate?`INV-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}`:invoice.number;
  $('#invoice-number').readOnly=!duplicate;
  const duplicateDue=new Date();duplicateDue.setDate(duplicateDue.getDate()+14);
  $('#invoice-type').value=invoice.invoiceType;$('#tax-type').value=invoice.taxType||'PST';$('#issue-date').value=duplicate?today():invoice.issueDate;$('#due-date').value=duplicate?duplicateDue.toISOString().slice(0,10):invoice.dueDate;$('#invoice-period').value=invoice.invoicePeriod||'';$('#contract-name').value=invoice.contractName||'';$('#customer-select').value=invoice.customer.id;$('#notes').value=invoice.notes||'';$('#discount').value=invoice.discount||0;$('#discount-type').value='fixed';
  updateInvoiceLayout(false);$('#items').innerHTML='';invoice.items.forEach(item=>addItem(item));
  $('#save-invoice').textContent=duplicate?'Save Duplicate':'Update Invoice';calculate();toast(duplicate?'Duplicate loaded with a new invoice number':'Invoice loaded for editing');
}
window.editInvoice=id=>{const invoice=invoices.find(x=>String(x.id)===String(id));if(invoice)loadInvoiceIntoForm(invoice,false)};
window.duplicateInvoice=id=>{const invoice=invoices.find(x=>String(x.id)===String(id));if(invoice)loadInvoiceIntoForm(invoice,true)};

function previewInvoice(){
  if(!validateInvoiceForm())return;
  const {customer,items}=invoiceFormData(),taxType=$('#tax-type').value,hr=$('#invoice-type').value==='HR',totals=calculate(),logo=new URL('assets/ample-global-logo.jpg',location.href).href;
  const rows=items.map((x,n)=>{const q=+x.quantity,w=+x.unit_price,s=+x.service_charge,t=+x.tax_rate,tax=s*t/100;if(hr)return `<tr><td>${n+1}</td><td>${escapeHtml(x.description)}</td><td>${q}</td><td>${money(w)}</td><td>${money(q*w)}</td><td>${money(s)}</td><td>${t}%<br>${money(tax)}</td><td>${money(s+tax)}</td><td>${money(q*(s+tax))}</td><td>${money(q*w+q*(s+tax))}</td></tr>`;const base=q*w;return `<tr><td>${n+1}</td><td>${escapeHtml(x.description)}</td><td>${q}</td><td>${money(base)}</td><td>${t}%</td><td>${money(base*(1+t/100))}</td></tr>`}).join('');
  const heads=hr?`<th>SR#</th><th>Description</th><th>Qty</th><th>Minimum Wage</th><th>Total Wages</th><th>Service Charge</th><th>${taxType}</th><th>Service + ${taxType}</th><th>Total Service</th><th>Total Cost</th>`:`<th>SR#</th><th>Description</th><th>Qty</th><th>Cost excluding Tax</th><th>${taxType}</th><th>Total Cost</th>`;
  $('#invoice-preview-title').textContent='Invoice Preview';
  $('#invoice-preview-content').innerHTML=`<div class="invoice-preview-sheet"><div class="preview-top"><div><img src="${logo}"><strong>Ample Global Enterprises Pvt Ltd</strong></div><div class="preview-meta"><h2>INVOICE</h2><b>${escapeHtml($('#invoice-number').value)}</b><br>${$('#issue-date').value}</div></div><div class="preview-customer"><b>BILL TO: ${escapeHtml(customer.name)}</b></div><p>${escapeHtml(customer.address||'')} &nbsp; ${escapeHtml(customer.tax||'')}</p><table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table><div class="preview-total">Grand Total: ${money(totals.total)}</div><h4>Notes</h4><p>${escapeHtml($('#notes').value).replaceAll('\n','<br>')}</p></div>`;
  $('#invoice-preview-actions').innerHTML='<button type="button" class="primary full" id="close-invoice-preview-bottom">Back to Editing</button>';
  $('#close-invoice-preview-bottom').onclick=()=>$('#invoice-preview-dialog').close();
  if(!$('#invoice-preview-dialog').open)$('#invoice-preview-dialog').showModal();
}
$('#preview-invoice').onclick=previewInvoice;$('#close-invoice-preview').onclick=$('#close-invoice-preview-bottom').onclick=()=>$('#invoice-preview-dialog').close();

function savedInvoicePreview(invoice){
  const hr=invoice.invoiceType==='HR',taxType=invoice.taxType||'PST',logo=new URL('assets/ample-global-logo.jpg',location.href).href;
  const rows=(invoice.items||[]).map((x,n)=>{const q=+(x.qty??x.quantity??0),w=+(x.rate??x.unit_price??0),s=+(x.service??x.service_charge??0),t=+(x.tax??x.tax_rate??0),tax=s*t/100;if(hr)return `<tr><td>${n+1}</td><td>${escapeHtml(x.description||'')}</td><td>${q}</td><td>${money(w)}</td><td>${money(q*w)}</td><td>${money(s)}</td><td>${t}%<br>${money(tax)}</td><td>${money(s+tax)}</td><td>${money(q*(s+tax))}</td><td>${money(q*w+q*(s+tax))}</td></tr>`;const base=q*w;return `<tr><td>${n+1}</td><td>${escapeHtml(x.description||'')}</td><td>${q}</td><td>${money(base)}</td><td>${t}%</td><td>${money(base*(1+t/100))}</td></tr>`}).join('');
  const heads=hr?`<th>SR#</th><th>Description</th><th>Qty</th><th>Minimum Wage</th><th>Total Wages</th><th>Service Charge</th><th>${taxType}</th><th>Service + ${taxType}</th><th>Total Service</th><th>Total Cost</th>`:`<th>SR#</th><th>Description</th><th>Qty</th><th>Cost excluding Tax</th><th>${taxType}</th><th>Total Cost</th>`;
  const type=invoice.invoiceType==='FBR'?'FBR Sales Tax':invoice.invoiceType==='NORMAL'?'Normal':'HR / Payroll';
  $('#invoice-preview-title').textContent=`Invoice ${invoice.number}`;
  $('#invoice-preview-content').innerHTML=`<div class="invoice-preview-sheet"><div class="preview-top"><div><img src="${logo}"><strong>Ample Global Enterprises Pvt Ltd</strong></div><div class="preview-meta"><h2>INVOICE</h2><b>${escapeHtml(invoice.number)}</b><br>${escapeHtml(invoice.issueDate||'')}</div></div><div class="preview-customer"><b>BILL TO: ${escapeHtml(invoice.customer?.name||'')}</b></div><p>${escapeHtml(invoice.customer?.address||'')} &nbsp; ${escapeHtml(invoice.customer?.tax||'')}</p><div class="invoice-detail-status"><span><b>Type:</b> ${type}</span><span><b>Status:</b> ${escapeHtml(invoice.status||'')}</span>${invoice.invoiceType==='FBR'?`<span><b>FBR:</b> ${escapeHtml(invoice.fbrStatus||'PENDING')}</span>`:''}</div><table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table><div class="preview-total">Grand Total: ${money(invoice.total)}</div><h4>Notes</h4><p>${escapeHtml(invoice.notes||'-').replaceAll('\n','<br>')}</p></div>`;
  const submitted=invoice.fbrStatus==='SUBMITTED';
  $('#invoice-preview-actions').innerHTML=`<button type="button" class="secondary" onclick="printInvoice('${invoice.id}')">Download PDF</button><button type="button" class="secondary" onclick="editInvoice('${invoice.id}');document.querySelector('#invoice-preview-dialog').close()">Edit Invoice</button>${invoice.invoiceType==='FBR'&&!submitted?`<button type="button" class="secondary" onclick="validateFBR('${invoice.id}')">Validate FBR</button><button type="button" class="primary" onclick="submitInvoiceFromPreview('${invoice.id}')">Submit to FBR</button>`:''}${submitted?'<span class="badge paid">Submitted to FBR</span>':''}<button type="button" class="secondary" onclick="document.querySelector('#invoice-preview-dialog').close()">Close</button>`;
  if(!$('#invoice-preview-dialog').open)$('#invoice-preview-dialog').showModal();
}
window.viewInvoice=id=>{const invoice=invoices.find(x=>String(x.id)===String(id));if(invoice)savedInvoicePreview(invoice)};
window.submitInvoiceFromPreview=async id=>{await submitFBR(id);const invoice=invoices.find(x=>String(x.id)===String(id));if(invoice)savedInvoicePreview(invoice);if(typeof renderFbr==='function')renderFbr()};

const originalCalculate=calculate;
calculate=function(){const result=originalCalculate();const box=$('#hr-live-breakdown');if(box){if($('#invoice-type').value==='HR'){let wages=0,service=0,tax=0;$$('.item-row').forEach(r=>{const q=+r.querySelector('.qty').value,w=+r.querySelector('.rate').value,s=+r.querySelector('.service').value,t=+r.querySelector('.tax').value/100;wages+=q*w;service+=q*s;tax+=q*s*t});box.innerHTML=`<h4>HR Live Calculation</h4><p><span>Total wages</span><b>${money(wages)}</b></p><p><span>Service charges</span><b>${money(service)}</b></p><p><span>${$('#tax-type').value} on service</span><b>${money(tax)}</b></p><p><span>Total service with tax</span><b>${money(service+tax)}</b></p>`}else box.innerHTML=''}return result};

table=data=>!data.length?'<div style="padding:28px;text-align:center;color:#6c768b">No invoices yet.</div>':`<table><thead><tr><th>Invoice</th><th>Type / FBR</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead><tbody>${data.map(i=>`<tr><td><strong>${escapeHtml(i.number)}</strong></td><td>${i.invoiceType==='FBR'?`FBR Sales Tax<br><span class="badge ${i.fbrStatus==='SUBMITTED'?'paid':''}">${escapeHtml(i.fbrStatus)}</span>`:i.invoiceType==='NORMAL'?'Normal':'HR / Payroll'}</td><td>${escapeHtml(i.customer.name)}</td><td>${i.issueDate}</td><td><span class="badge ${i.status.toLowerCase().replaceAll(' ','-')}">${i.status}</span></td><td><strong>${money(i.total)}</strong></td><td class="actions"><button onclick="printInvoice('${i.id}')">PDF</button><button onclick="editInvoice('${i.id}')">Edit</button><button onclick="duplicateInvoice('${i.id}')">Duplicate</button><button onclick="emailDocument('invoices','${i.id}')">Email</button>${i.invoiceType==='FBR'?`<button onclick="validateFBR('${i.id}')">Validate FBR</button><button onclick="submitFBR('${i.id}')">Submit FBR</button>`:''}</td></tr>`).join('')}</tbody></table>`;
