(()=>{
  const officialRates=window.NATIONWIDE_SERVICE_RATES||null;
  const demoRates=window.DEMO_SERVICE_RATES||null;
  const rates=officialRates||demoRates||null;
  const isDemoRates=!officialRates&&!!demoRates;
  const branchData=window.NATIONWIDE_TNKH_STORES||{stores:[]};
  const stores=(branchData.stores||[]).filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lon)));
  const $=id=>document.getElementById(id);
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const num=id=>Math.max(0,Number($(id).value)||0);
  const fmt=n=>'NT$ '+Math.round(n).toLocaleString('zh-TW');
  const normalize=s=>String(s||'').replaceAll('台','臺');
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const applianceMeta={
    ac:{name:'冷氣',modelLabel:'冷氣型號／冷房能力',modelHint:'例：機型代碼或冷房能力',base:[300,1200]},
    fridge:{name:'冰箱',modelLabel:'冰箱型號／容量',modelHint:'例：機型代碼或公升數',base:[250,900]},
    washer:{name:'洗衣機',modelLabel:'洗衣機型號／洗衣容量',modelHint:'例：機型代碼或公斤數',base:[180,650]}
  };
  const ageFactor=years=>years<=5?1.15:years<=10?1:years<=15?.8:.6;
  const usageFactor={normal:1.25,intermittent:1,unusable:.85};
  const appearanceFactor={good:1,minor:.92,damaged:.72,missing:.55};
  const roundDown50=n=>Math.floor(n/50)*50,roundUp50=n=>Math.ceil(n/50)*50,roundNear50=n=>Math.round(n/50)*50;
  let branchDistances=[],selectedStoreCode='',searching=false,usedStreetFallback=false,toastTimer,nextDeviceId=1;
  const oldDevices=[];
  let currentResidual={low:0,high:0,lines:[]},currentPickup=null,currentInstall=0;

  function getOldItems(){const currentYear=new Date().getFullYear();return oldDevices.filter(x=>x.qty>0).map(x=>({...x,qty:Number(x.qty),manufacturingYear:Number(x.manufacturingYear),years:Math.max(0,currentYear-Number(x.manufacturingYear))}));}
  function getInputs(){return {city:$('city').value,address:$('customerAddress').value.trim(),distanceKm:Number($('distanceValue').dataset.km)||0,floor:num('floor')||1,elevator:$('elevator').value,special:$('special').checked,oldItems:getOldItems()};}
  function validRateTable(r){
    if(!r||!r.effectiveDate||!r.fees||!r.fees.install||!r.fees.removal||!r.fees.distance)return false;
    const required=[r.fees.install.ac,r.fees.install.fridge,r.fees.install.washer,r.fees.removal.ac,r.fees.removal.fridge,r.fees.removal.washer,r.fees.applicationFee,r.fees.distance.ratePerKm,r.fees.distance.includedKm,r.fees.distance.tripMultiplier,r.fees.floorNoElevator,r.fees.specialWork,r.fees.tradeInCreditRate];
    return required.every(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0);
  }
  function syncDeviceCounts(){
    Object.keys(applianceMeta).forEach(type=>{$(type).value=oldDevices.filter(x=>x.type===type&&x.qty>0).reduce((sum,x)=>sum+Number(x.qty),0);});
  }
  function renderResidualEditor(){
    const entry=document.querySelector('.residual-entry');
    document.querySelector('#residualSection .card-head p').textContent='品牌、製造年份、外觀與使用狀態請先填好，再加入舊機清單。';
    entry.innerHTML=`<div class="entry-heading"><span class="entry-icon" aria-hidden="true">＋</span><div><h3>先填寫舊機資料</h3><p>完成必填欄位後再加入；型號可略過。</p></div></div>
      <div class="device-picker-row"><div class="field"><label for="appliancePicker">家電品項</label><select class="control" id="appliancePicker"><option value="ac">冷氣</option><option value="fridge">冰箱</option><option value="washer">洗衣機</option></select></div><div class="field"><label for="applianceQuantity">數量</label><div class="unit"><input class="control" id="applianceQuantity" type="number" min="1" max="10" value="1"><span>台</span></div></div></div>
      <div class="device-entry-form">
        <label class="device-field"><span>品牌 <b class="required-mark">必填</b></span><input class="control" id="deviceBrand" type="text" list="brandList" placeholder="例如：日立、國際牌" required></label>
        <label class="device-field"><span>製造年份 <b class="required-mark">必填</b></span><select class="control" id="manufactureYear" required><option value="">請選擇年份</option></select></label>
        <label class="device-field device-model"><span>型號 <small>選填</small></span><input class="control" id="deviceModel" type="text" placeholder="可填機身標示的型號"></label>
        <label class="device-field"><span>外觀 <b class="required-mark">必填</b></span><select class="control" id="deviceAppearance" required><option value="">請選擇外觀</option><option value="good">外觀良好</option><option value="minor">輕微刮痕／泛黃</option><option value="damaged">明顯凹損／破裂</option><option value="missing">零件缺漏</option></select></label>
        <label class="device-field"><span>目前使用狀態 <b class="required-mark">必填</b></span><select class="control" id="deviceUsage" required><option value="">請選擇使用狀態</option><option value="normal">可正常使用</option><option value="intermittent">偶有異常</option><option value="unusable">無法使用</option></select></label>
      </div>
      <button class="btn add-device" id="addApplianceButton" type="button"><span aria-hidden="true">＋</span>加入舊機清單</button>
      <div class="selected-heading"><h3>已加入舊機</h3><span id="selectedApplianceCount">0 台</span></div>
      <div class="selected-appliances" id="selectedAppliances"><div class="empty-device"><b>清單目前是空的</b><span>填好上方資料後再加入舊機</span></div></div>
      <input id="ac" type="hidden" value="0"><input id="fridge" type="hidden" value="0"><input id="washer" type="hidden" value="0">
      <datalist id="brandList"><option>國際牌</option><option>日立</option><option>東元</option><option>聲寶</option><option>三洋</option><option>三菱重工</option><option>LG</option><option>Samsung</option><option>其他</option></datalist>`;
    const yearSelect=$('manufactureYear'),currentYear=new Date().getFullYear();
    for(let year=currentYear;year>=1970;year--){const option=document.createElement('option');option.value=String(year);option.textContent=`${year} 年`;yearSelect.append(option);}
  }
  function renderDeviceSelection(){
    syncDeviceCounts();
    const items=getOldItems();
    const total=items.reduce((sum,item)=>sum+item.qty,0);
    $('selectedApplianceCount').textContent=`${total} 台`;
    $('selectedAppliances').innerHTML=items.length?items.map(item=>{
      const meta=applianceMeta[item.type],appearanceLabel={good:'外觀良好',minor:'輕微刮痕／泛黃',damaged:'明顯凹損／破裂',missing:'零件缺漏'}[item.appearance],usageLabel={normal:'可正常使用',intermittent:'偶有異常',unusable:'無法使用'}[item.usage];
      return `<article class="selected-device"><div class="selected-device-head"><div><span class="device-kicker">${meta.name}・${item.qty} 台</span><h4>${escapeHtml(item.brand)}<small>${item.manufacturingYear} 年製</small></h4></div><button class="remove-device" type="button" data-remove-device-id="${item.id}" aria-label="移除${meta.name}">移除</button></div><dl class="device-summary"><div><dt>型號</dt><dd>${escapeHtml(item.model||'未填')}</dd></div><div><dt>外觀</dt><dd>${appearanceLabel}</dd></div><div><dt>目前使用狀態</dt><dd>${usageLabel}</dd></div></dl></article>`;
    }).join(''):'<div class="empty-device"><b>清單目前是空的</b><span>填好上方資料後再加入舊機</span></div>';
  }
  function getGoogleMapsUrl(store){return store.mapLink||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;}
  function setLocationStatus(text,kind=''){const el=$('locationStatus');el.textContent=text;el.className='location-status'+(kind?' '+kind:'');}
  async function geocode(query){
    const url='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({format:'jsonv2',limit:'1',countrycodes:'tw',q:query});
    const response=await fetch(url,{headers:{'Accept':'application/json','Accept-Language':'zh-TW'}});
    if(!response.ok)throw new Error('地址定位服務暫時無法使用，請稍後再試。');
    return response.json();
  }
  function streetLevelQuery(city,address){
    let street=address.replaceAll(city,'');
    street=street.replace(/\d+(?:[.,-]\d+|、\d+)*(?:號|樓).*$/,'');
    street=street.replace(/\d+(?:[.,-]\d+|、\d+)*$/,'').trim();
    return `${city} ${street}`.trim();
  }
  function renderSelectedStore(){
    const entry=branchDistances.find(x=>String(x.store.code)===String(selectedStoreCode));
    if(!entry){$('distanceCard').hidden=true;$('distanceValue').dataset.km='';renderAll();return;}
    $('distanceCard').hidden=false;$('distanceValue').dataset.km=String(entry.km);$('distanceValue').textContent=entry.km.toFixed(1)+' 公里';
    $('selectedStoreName').textContent=`${entry.store.name}（${entry.store.city} ${entry.store.district}）`;
    $('selectedStoreAddress').textContent=entry.store.address;$('selectedStoreMap').href=getGoogleMapsUrl(entry.store);renderAll();
  }
  async function findStores(){
    if(searching)return;
    const address=$('customerAddress').value.trim(),city=$('city').value;
    if(!address){setLocationStatus('請先輸入服務地址。','error');$('customerAddress').focus();return;}
    if(!$('geoConsent').checked){setLocationStatus('請先勾選地址定位同意，系統才會向地圖服務查詢座標。','error');$('geoConsent').focus();return;}
    if(!stores.length){setLocationStatus('門市清單載入失敗，請重新整理頁面。','error');return;}
    searching=true;usedStreetFallback=false;$('findStoreButton').disabled=true;$('findStoreButton').textContent='正在定位地址並計算路徑…';$('storeSelect').disabled=true;$('distanceCard').hidden=true;
    setLocationStatus(`正在定位地址，並計算至台南、高雄 ${stores.length} 間門市的行車距離…`,'loading');
    try{
      let geocoded=await geocode(`${city} ${address}`),chosen=geocoded[0],expected=normalize(city);
      if(!chosen||!normalize(chosen.display_name).includes(expected)){
        const broadQuery=streetLevelQuery(city,address);
        if(broadQuery===`${city} ${address}`.trim())throw new Error('找不到此地址，請補上縣市、區域、路名與門牌號碼。');
        setLocationStatus('門牌地址無法精確定位，改以道路位置估算，請核對下方距離。','loading');
        await new Promise(resolve=>setTimeout(resolve,1100));geocoded=await geocode(broadQuery);chosen=geocoded[0];usedStreetFallback=true;
      }
      if(!chosen)throw new Error('找不到此地址，請確認縣市、區域與路名是否正確。');
      if(!normalize(chosen.display_name).includes(expected))throw new Error(`定位結果似乎不在${city}，請確認地址或縣市選擇。`);
      const origin=`${chosen.lon},${chosen.lat}`,destinations=stores.map(s=>`${s.lon},${s.lat}`),coords=[origin,...destinations].join(';');
      const destIndexes=stores.map((_,i)=>String(i+1)).join(';');
      const routeUrl=`https://router.project-osrm.org/table/v1/driving/${coords}?sources=${destIndexes}&destinations=0&annotations=distance`;
      const routeResponse=await fetch(routeUrl,{headers:{'Accept':'application/json'}});
      if(!routeResponse.ok)throw new Error('路徑服務暫時無法計算，請稍後再試。');
      const route=await routeResponse.json(),distances=route.distances&&route.distances.map(row=>row&&row[0]);
      if(route.code!=='Ok'||!distances)throw new Error('目前無法取得行車距離，請稍後再試。');
      branchDistances=stores.map((store,i)=>({store,meters:distances[i]})).filter(x=>Number.isFinite(x.meters)).map(x=>({...x,km:Math.max(0,x.meters)/1000})).sort((a,b)=>a.km-b.km);
      if(!branchDistances.length)throw new Error('沒有可行駛路徑的門市，請確認服務地址。');
      selectedStoreCode=String(branchDistances[0].store.code);
      $('storeSelect').innerHTML=branchDistances.map((x,i)=>`<option value="${String(x.store.code).replaceAll('"','&quot;')}">${i===0?'★ 最近推薦｜':''}${x.store.name}｜${x.store.city}${x.store.district}｜${x.km.toFixed(1)} km</option>`).join('');
      $('storeSelect').value=selectedStoreCode;$('storeSelect').disabled=false;
      setLocationStatus(`${usedStreetFallback?'門牌未精確定位，以下距離以道路位置近似；':''}已定位「${chosen.display_name.split(',').slice(0,3).join('、')}」，依行車路徑排序 ${branchDistances.length} 間門市。最近門市已預選，您也可以自行更換。`,'success');renderSelectedStore();
    }catch(error){setLocationStatus(error.message||'地址定位失敗，請確認網路後重試。','error');branchDistances=[];selectedStoreCode='';$('storeSelect').innerHTML='<option>請重新搜尋地址</option>';$('storeSelect').disabled=true;renderAll();}
    finally{searching=false;$('findStoreButton').disabled=false;$('findStoreButton').innerHTML='尋找最近門市並計算距離 <span aria-hidden="true">→</span>';}
  }

  function renderResidualEstimate(){
    const items=getInputs().oldItems;
    if(!items.length){residualEstimate={low:0,high:0,lines:[]};$('residualStatus').innerHTML='<i></i>等待舊機資料';$('residualRange').textContent='請先加入舊機';$('residualNote').textContent='先填品牌、製造年份、外觀與使用狀態，再加入舊機即可估算。';$('residualBreakdown').style.display='none';return residualEstimate;}
    const base={ac:[300,1200],fridge:[250,900],washer:[180,650]};
    const lines=items.map(item=>{
      const years=Math.max(0,Number(item.years)||0),age=ageFactor(years),condition=(usageFactor[item.usage]||.85)*(appearanceFactor[item.appearance]||.72),b=base[item.type];
      return {item,low:roundDown50(b[0]*age*condition*item.qty),high:roundUp50(b[1]*age*condition*item.qty)};
    });
    residualEstimate={low:lines.reduce((s,x)=>s+x.low,0),high:lines.reduce((s,x)=>s+x.high,0),lines};
    $('residualStatus').innerHTML=isDemoRates?'<i></i>模擬殘值區間（非正式估價）':'<i style="background:#167b68"></i>公司殘值估值資料';
    $('residualRange').textContent=`${fmt(residualEstimate.low)}–${fmt(residualEstimate.high)}`;
    $('residualNote').textContent='展示區間依家電類型、製造年份、外觀與使用狀態估算；品牌與型號供辨識，不套用品牌溢價。';
    $('residualBreakdown').style.display='block';
    $('residualBreakdown').innerHTML=lines.map(({item,low,high})=>`<div class="break-row"><span>${applianceMeta[item.type].name} × ${item.qty}｜${escapeHtml(item.brand)}｜${item.manufacturingYear} 年製｜使用 ${item.years} 年</span><strong>${fmt(low)}–${fmt(high)}</strong></div>`).join('')+`<div class="break-row total"><span>舊機合計殘值區間</span><strong>${fmt(residualEstimate.low)}–${fmt(residualEstimate.high)}</strong></div>`;
    return residualEstimate;
  }
  function calculatePickup(){
    const i=getInputs(),selected=branchDistances.find(x=>String(x.store.code)===String(selectedStoreCode));
    if(!i.oldItems.length||!selected||!validRateTable(rates))return null;
    const f=rates.fees,count=i.oldItems.reduce((s,x)=>s+x.qty,0);
    const chargeableKm=Math.max(0,selected.km-Number(f.distance.includedKm))*Number(f.distance.tripMultiplier);
    const removal=i.oldItems.reduce((s,x)=>s+x.qty*Number(f.removal[x.type]||0),0);
    const distanceFee=chargeableKm*Number(f.distance.ratePerKm);
    const floorFee=i.elevator==='no'?Math.max(0,i.floor-1)*count*Number(f.floorNoElevator):0;
    const applicationFee=Number(f.applicationFee),specialFee=i.special?Number(f.specialWork):0;
    const lines=[['舊機上門搬運回收',removal],['門市至地址行車里程',distanceFee],['無電梯樓層搬運',floorFee],['申請／資料檢核處理費',applicationFee],['特殊搬運／施工',specialFee]];
    return {selected,count,lines,total:lines.reduce((sum,row)=>sum+row[1],0)};
  }
  function renderPickupEstimate(){
    const calc=calculatePickup();currentPickup=calc;
    if(!getInputs().oldItems.length){$('pickupStatus').innerHTML='<i></i>等待舊機資料';$('pickupAmount').textContent='請先加入舊機';$('pickupNote').textContent='此方案獨立估算上門回收費，含展示版申請／檢核處理費。';$('pickupLocked').style.display='block';$('pickupBreakdown').style.display='none';return null;}
    if(!selectedStoreCode||!branchDistances.length){$('pickupStatus').innerHTML='<i></i>等待選定估算門市';$('pickupAmount').textContent='請先選定門市';$('pickupNote').textContent='請在上方輸入地址並選擇／確認估算門市，回收費才會依該門市里程計算。';$('pickupLocked').style.display='block';$('pickupBreakdown').style.display='none';return null;}
    if(!validRateTable(rates)){ $('pickupStatus').innerHTML='<i></i>費率資料尚未同步';$('pickupAmount').textContent='暫無法估算';$('pickupNote').textContent='公司核准價目尚未載入。';$('pickupLocked').style.display='block';$('pickupBreakdown').style.display='none';return null; }
    $('pickupStatus').innerHTML=isDemoRates?'<i></i>模擬費率（非官方）':'<i style="background:#167b68"></i>公司正式費率';
    $('pickupAmount').textContent=fmt(calc.total);$('pickupNote').textContent=`單純回收估算｜最近門市 ${calc.selected.store.name}，行車 ${calc.selected.km.toFixed(1)} km；已含申請處理費。`;
    $('pickupLocked').style.display='none';$('pickupBreakdown').style.display='block';
    $('pickupBreakdown').innerHTML=calc.lines.map(([label,value])=>`<div class="break-row"><span>${label}</span><strong>${label.includes('里程')?`${calc.selected.km.toFixed(1)} km · ${fmt(value)}`:fmt(value)}</strong></div>`).join('')+`<div class="break-row total"><span>單純上門回收預估費</span><strong>${fmt(calc.total)}</strong></div>`;
    return calc.total;
  }
  function renderTradeInEstimate(){
    const items=getInputs().oldItems,calc=calculatePickup(),price=Math.max(0,Number($('newProductPrice').value)||0);
    if(!items.length||!calc||!validRateTable(rates)){
      $('tradeinCredit').textContent='待舊機與門市估算';$('tradeinNoInstall').textContent='請完成共用資料';$('tradeinWithInstall').textContent='請完成共用資料';
      $('tradeinNoInstallDetail').textContent='請加入舊機、輸入地址並在上方選定估算門市；無需先操作回收方案卡。';$('tradeinWithInstallDetail').textContent='新機安裝費依舊機品項與台數作展示估算。';return;
    }
    const f=rates.fees;currentInstall=items.reduce((s,x)=>s+x.qty*Number(f.install[x.type]||0),0);
    const creditLow=roundNear50(residualEstimate.low*Number(f.tradeInCreditRate)),creditHigh=roundNear50(residualEstimate.high*Number(f.tradeInCreditRate));
    $('tradeinCredit').textContent=`${fmt(creditLow)}–${fmt(creditHigh)}`;
    const noInstall=[Math.max(0,price+calc.total-creditHigh),Math.max(0,price+calc.total-creditLow)];
    const withInstall=[Math.max(0,price+calc.total+currentInstall-creditHigh),Math.max(0,price+calc.total+currentInstall-creditLow)];
    if(price<=0){$('tradeinNoInstall').textContent='請輸入新機價格';$('tradeinWithInstall').textContent='請輸入新機價格';$('tradeinNoInstallDetail').textContent=`服務部分：回收 ${fmt(calc.total)}－展示折抵 ${fmt(creditLow)}–${fmt(creditHigh)}`;$('tradeinWithInstallDetail').textContent=`服務部分另加新機安裝費 ${fmt(currentInstall)}`;}
    else{$('tradeinNoInstall').textContent=`${fmt(noInstall[0])}–${fmt(noInstall[1])}`;$('tradeinWithInstall').textContent=`${fmt(withInstall[0])}–${fmt(withInstall[1])}`;$('tradeinNoInstallDetail').textContent=`新機 ${fmt(price)}＋上門回收 ${fmt(calc.total)}－展示折抵`;$('tradeinWithInstallDetail').textContent=`新機 ${fmt(price)}＋回收 ${fmt(calc.total)}＋安裝 ${fmt(currentInstall)}－展示折抵`;}
    $('tradeinDisclaimer').textContent=`汰舊換新估算固定包含上門回收；安裝費依上方舊機品項／數量假設新品相同。展示折抵率 ${Math.round(Number(f.tradeInCreditRate)*100)}%，不代表正式優惠；以公司核准郵件為準。`;
  }
  function renderAll(){const residual=renderResidualEstimate();renderPickupEstimate();renderTradeInEstimate(residual);}
  function fillStores(){
    const sorted=stores.slice().sort((a,b)=>a.city.localeCompare(b.city,'zh-Hant')||a.district.localeCompare(b.district,'zh-Hant')||a.name.localeCompare(b.name,'zh-Hant'));
    $('storeSelect').innerHTML=sorted.map(s=>`<option value="${String(s.code).replaceAll('"','&quot;')}">${s.city} ${s.district}｜${s.name}</option>`).join('');
  }
  function showToast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);}
  function openApplicationPreview(kind){
    const items=getInputs().oldItems,calc=calculatePickup();
    if(!items.length){showToast('請先加入舊機資料，再選擇要申請的方案。');return;}
    if(!calc){showToast('請先輸入地址、選定上方估算門市並加入舊機資料；無需先點其他估算卡。');return;}
    const isTradeIn=kind==='tradein',price=Math.max(0,Number($('newProductPrice').value)||0);
    if(isTradeIn&&price<=0){$('newProductPrice').focus();showToast('請先填寫新機預計購買總價。');return;}
    if(isTradeIn){renderTradeInEstimate();$('applicationPreviewTitle').textContent='汰舊換新申請預覽';$('applicationSummary').textContent=`汰舊換新｜新機預算 ${fmt(price)}｜含門市回收及申請處理；目前整體估價為「${$('tradeinWithInstall').textContent}」（含安裝）。`;}
    else{$('applicationPreviewTitle').textContent='單純上門回收申請預覽';$('applicationSummary').textContent=`單純回收｜最近門市 ${calc.selected.store.name}｜行車 ${calc.selected.km.toFixed(1)} km｜服務費預估 ${fmt(calc.total)}（含申請處理）。`}
    $('applicationPreview').classList.add('open');
  }
  function closeApplicationPreview(){$('applicationPreview').classList.remove('open');}

  renderResidualEditor();fillStores();renderDeviceSelection();renderAll();
  $('findStoreButton').addEventListener('click',findStores);
  $('storeSelect').addEventListener('change',()=>{selectedStoreCode=$('storeSelect').value;renderSelectedStore();});
  $('customerAddress').addEventListener('input',()=>{if(branchDistances.length){branchDistances=[];selectedStoreCode='';$('storeSelect').innerHTML='<option>請重新搜尋地址</option>';$('storeSelect').disabled=true;$('distanceCard').hidden=true;setLocationStatus('地址已變更，請重新尋找最近門市。');renderAll();}});
  $('city').addEventListener('change',()=>{if(branchDistances.length){branchDistances=[];selectedStoreCode='';$('storeSelect').innerHTML='<option>請重新搜尋地址</option>';$('storeSelect').disabled=true;$('distanceCard').hidden=true;setLocationStatus('縣市已變更，請重新尋找最近門市。');renderAll();}});
  $('addApplianceButton').addEventListener('click',()=>{
    const requiredFields=[$('deviceBrand'),$('manufactureYear'),$('deviceAppearance'),$('deviceUsage')];
    const invalid=requiredFields.find(field=>!field.checkValidity());
    if(invalid){invalid.reportValidity();return;}
    const type=$('appliancePicker').value,qty=Math.max(1,clamp(Number($('applianceQuantity').value)||1,1,10));
    oldDevices.push({id:nextDeviceId++,type,qty,brand:$('deviceBrand').value.trim(),manufacturingYear:Number($('manufactureYear').value),model:$('deviceModel').value.trim(),appearance:$('deviceAppearance').value,usage:$('deviceUsage').value});
    $('deviceBrand').value='';$('manufactureYear').value='';$('deviceModel').value='';$('deviceAppearance').value='';$('deviceUsage').value='';$('applianceQuantity').value='1';
    renderDeviceSelection();renderAll();showToast(`已加入${applianceMeta[type].name} ${qty} 台`);
  });
  $('selectedAppliances').addEventListener('click',event=>{
    const id=Number(event.target.closest('[data-remove-device-id]')?.dataset.removeDeviceId);
    if(!id)return;
    const index=oldDevices.findIndex(x=>x.id===id);if(index>=0)oldDevices.splice(index,1);renderDeviceSelection();renderAll();
  });
  $('estimateForm').addEventListener('submit',event=>{event.preventDefault();renderAll();if(!branchDistances.length)showToast('請先輸入服務地址並尋找最近門市。');});
  $('estimateForm').addEventListener('reset',()=>setTimeout(()=>{
    branchDistances=[];selectedStoreCode='';oldDevices.splice(0,oldDevices.length);nextDeviceId=1;
    $('appliancePicker').value='ac';$('applianceQuantity').value=1;$('deviceBrand').value='';$('manufactureYear').value='';$('deviceModel').value='';$('deviceAppearance').value='';$('deviceUsage').value='';$('newProductPrice').value='';
    renderDeviceSelection();$('storeSelect').innerHTML='<option>請先搜尋地址</option>';$('storeSelect').disabled=true;$('distanceCard').hidden=true;
    setLocationStatus(`請輸入台南市或高雄市地址後查找門市；系統將比較兩市共 ${stores.length} 間門市。`);renderAll();
  },0));
  document.querySelectorAll('#floor,#elevator,#special').forEach(el=>el.addEventListener('input',renderAll));
  $('newProductPrice').addEventListener('input',renderTradeInEstimate);
  $('applyPickupButton').addEventListener('click',()=>openApplicationPreview('pickup'));
  $('applyTradeInButton').addEventListener('click',()=>openApplicationPreview('tradein'));
  $('closeApplicationPreview').addEventListener('click',closeApplicationPreview);
  $('applicationPreview').addEventListener('click',event=>{if(event.target===$('applicationPreview'))closeApplicationPreview();});
  $('memberLoginButton').addEventListener('click',()=>$('memberModal').classList.add('open'));
  $('closeMemberModal').addEventListener('click',()=>$('memberModal').classList.remove('open'));
  $('memberModal').addEventListener('click',event=>{if(event.target===$('memberModal'))$('memberModal').classList.remove('open');});
  $('menuToggle').addEventListener('click',()=>{const open=$('mainNav').classList.toggle('open');$('menuToggle').setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('#mainNav a').forEach(link=>link.addEventListener('click',()=>{$('mainNav').classList.remove('open');$('menuToggle').setAttribute('aria-expanded','false');}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('memberModal').classList.remove('open');closeApplicationPreview();}});
})();
