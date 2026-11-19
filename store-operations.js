
    (()=>{
      const $=id=>document.getElementById(id),fmt=n=>'NT$ '+Math.round(n).toLocaleString('zh-TW');
      const storeData=window.NATIONWIDE_TNKH_STORES||{stores:[]};
      const num=id=>Math.max(0,Number($(id).value)||0);
      const materialDefs=[
        {id:'copperWire',name:'銅線／線圈',rate:'rateCopper',unit:'kg'},
        {id:'copperPipe',name:'銅管／銅材',rate:'rateCopper',unit:'kg'},
        {id:'aluminum',name:'鋁材',rate:'rateAluminum',unit:'kg'},
        {id:'steel',name:'鐵／鋼材',rate:'rateSteel',unit:'kg'},
        {id:'board',name:'電路板',rate:'rateBoard',unit:'kg'},
        {id:'plastic',name:'塑膠／其他料',rate:'ratePlastic',unit:'kg'},
        {id:'compressor',name:'壓縮機',rate:'rateCompressor',unit:'件'},
        {id:'motor',name:'馬達',rate:'rateMotor',unit:'件'}
      ];
      const quarterSamples={
        1:{units:[32,36,41],weight:[960,1120,1290],net:[14000,16500,19100]},
        2:{units:[38,34,45],weight:[1170,1030,1430],net:[17300,15400,21500]},
        3:{units:[42,47,44],weight:[1350,1540,1430],net:[20500,23000,21700]},
        4:{units:[39,46,51],weight:[1220,1480,1660],net:[18200,21300,23900]}
      };
      let toastTimer,techReportSubmitted=false;
      function localDateTime(){const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}
      function render(){
        const rows=materialDefs.map(m=>({name:m.name,qty:num(m.id),rate:num(m.rate),amount:num(m.id)*num(m.rate),unit:m.unit}));
        const gross=rows.reduce((s,r)=>s+r.amount,0);
        const labor=num('laborHours')*num('laborRate');
        const transport=num('transportKm')*num('transportRate')*num('roundTrip');
        const process=num('processCost');
        const totalCost=labor+transport+process,net=gross-totalCost;
        const techRate=Math.min(100,num('shareRate'))/100;
        const tech=Math.max(0,net)*techRate,hq=Math.max(0,net)*(1-techRate),deficit=Math.max(0,-net);
        const storeWeight=num('storeWeight'),plantWeight=num('plantWeight');
        const matchRate=storeWeight>0&&plantWeight>0?Math.max(0,1-Math.abs(storeWeight-plantWeight)/Math.max(storeWeight,plantWeight))*100:null;
        const receiptReady=$('plantReceipt').value.trim()&&$('receivedDate').value;
        $('grossValue').textContent=fmt(gross);$('techShare').textContent=fmt(tech);$('hqShare').textContent=fmt(hq);
        $('negativeNote').classList.toggle('show',deficit>0);
        const status=$('reconcileStatus'),box=$('reconcileBox');status.className='status';box.className='reconcile-box';
        if(!storeWeight){status.innerHTML='<i></i>待門市出貨秤重';box.classList.add('warn');$('weightStatus').textContent='尚無門市出貨重量';$('weightMatch').textContent='先秤記整機出貨重量，處理廠回磅後才能核對；分潤目前僅為預估。';}
        else if(!plantWeight){status.innerHTML='<i></i>待處理廠核秤';box.classList.add('warn');$('weightStatus').textContent='分潤暫估，尚未結算';$('weightMatch').textContent=`門市出貨重量 ${storeWeight.toFixed(1)} kg；等待處理廠收件回磅。`}
        else if(matchRate<95){status.innerHTML='<i></i>重量差異待覆核';box.classList.add('warn');$('weightStatus').textContent=`吻合率 ${matchRate.toFixed(1)}%｜凍結分潤`;$('weightMatch').textContent=`門市 ${storeWeight.toFixed(1)} kg／處理廠 ${plantWeight.toFixed(1)} kg，未達示範門檻 95%；轉人工查核。`}
        else if(deficit>0){status.innerHTML='<i></i>負殘值待核准';box.classList.add('warn');$('weightStatus').textContent=`重量吻合率 ${matchRate.toFixed(1)}%｜需補貼審核`;$('weightMatch').textContent='回收價值低於成本，不自動分潤；由總部人工審核運費／處理補貼。'}
        else if(!receiptReady){status.innerHTML='<i></i>待補收件資料';box.classList.add('warn');$('weightStatus').textContent=`重量吻合率 ${matchRate.toFixed(1)}%｜待聯單確認`;$('weightMatch').textContent='補上處理廠聯單編號與收件日期後，才能進入人工對帳。'}
        else{status.innerHTML='<i></i>待人工對帳';box.classList.add('ok');$('weightStatus').textContent=`重量吻合率 ${matchRate.toFixed(1)}%｜建議 T+7 結算`;$('weightMatch').textContent='重量達示範門檻且收件資料齊全；仍須人工核對後才可撥款。'}
        $('valueBreakdown').innerHTML=rows.filter(r=>r.qty>0).map(r=>`<div class="value-row"><span>${r.name}　${r.qty} ${r.unit} × ${fmt(r.rate)}</span><strong>${fmt(r.amount)}</strong></div>`).join('')+
          `<div class="value-row"><span>拆解人工（${num('laborHours')} 人時）</span><strong>− ${fmt(labor)}</strong></div>`+
          `<div class="value-row"><span>運輸（${num('transportKm')} km × ${num('roundTrip')}）</span><strong>− ${fmt(transport)}</strong></div>`+
          `<div class="value-row"><span>暫存／處理廠費</span><strong>− ${fmt(process)}</strong></div>`+
          `<div class="value-row"><span>回收處理成本合計</span><strong>− ${fmt(totalCost)}</strong></div>`+
          `<div class="value-row net"><span>${net>=0?'可分潤淨殘值':'負殘值／補貼需求'}</span><strong>${fmt(Math.abs(net))}</strong></div>`;
        const brand=$('brand').value.trim()||'未填品牌',years=$('years').value?`${num('years')} 年`:'未填年數';
        const store=$('store').selectedOptions[0]?.textContent||'未選門市';
        $('recordSummary').textContent=`${store}｜${$('appliance').value}｜${brand}｜使用 ${years}。品牌與年數作追溯分析，材料金額按重量／件數與展示單價計算。`;
        const warnings=[];
        if(!$('orderNo').value.trim())warnings.push('訂單編號未填');
        if(!$('qrCode').value.trim())warnings.push('QR 序號未填');
        if(!$('technicianCode').value.trim())warnings.push('師傅代碼未填');
        if(!$('serviceTime').value)warnings.push('服務時間未填');
        if(!$('brand').value.trim())warnings.push('請補品牌');
        if(!$('years').value)warnings.push('請補使用年數');
        if(!$('model').value.trim())warnings.push('請補型號／容量');
        if(num('storeWeight')<=0)warnings.push('門市出貨重量未登錄');
        if($('photos').files.length<2)warnings.push('現場照片少於 2 張');
        if(rows.every(r=>r.qty===0))warnings.push('尚未輸入可回收材料');
        const copper=num('copperWire')+num('copperPipe');if(copper>15)warnings.push('銅材重量偏高，建議核對秤重與照片');
        if($('complete').value!=='完整')warnings.push('機體不完整，請留存拆解前後照片');
        if(deficit>0)warnings.push('回收價值低於拆解／運輸／處理成本，轉總部人工審核補貼');
        $('auditText').innerHTML=techReportSubmitted?'<strong>師傅回報已送出（示範）</strong>　等待總公司 AI／人工比對訂單、照片、材料與處理廠秤重；核對完成前不撥款。':warnings.length?`<strong>尚待補齊／覆核</strong>　${warnings.join('；')}`:'<strong>欄位初步完整</strong>　仍須師傅送出，並由總公司及處理廠資料覆核。';
        $('techReportStatus').textContent=techReportSubmitted?'已送出示範回報；款項仍待總公司覆核，未觸發撥款。':warnings.length?'待補資料／檢核：'+warnings.slice(0,3).join('、')+(warnings.length>3?'…':''):'欄位初步完整；送出後仍由總公司覆核，不會自動撥款。';
        $('techReportStatus').className='tech-report-status'+(techReportSubmitted?' ok':'');
        renderQuarterDashboard();
      }
      function renderQuarterDashboard(){
        const quarter=Number($('quarterSelect').value)||4,year=new Date().getFullYear(),storeCode=$('store').value||'store';
        const quarterMonths=[0,1,2].map(index=>`${(quarter-1)*3+index+1} 月`);
        const storeName=$('store').selectedOptions[0]?.textContent||'所選門市';
        const seed=[...storeCode].reduce((sum,char)=>sum+char.charCodeAt(0),quarter*17),factor=.94+(seed%13)/100;
        const sample=quarterSamples[quarter],previous=quarterSamples[quarter===1?4:quarter-1];
        const values={units:sample.units.map(value=>Math.round(value*factor)),weight:sample.weight.map(value=>Math.round(value*factor/10)*10),net:sample.net.map(value=>Math.round(value*factor/500)*500)};
        const previousUnits=Math.round(previous.units.reduce((sum,value)=>sum+value,0)*factor),totalUnits=values.units.reduce((sum,value)=>sum+value,0),totalWeight=values.weight.reduce((sum,value)=>sum+value,0),totalNet=values.net.reduce((sum,value)=>sum+value,0);
        const target=145+(seed%21),achievement=totalUnits/target*100,delta=previousUnits?((totalUnits-previousUnits)/previousUnits*100):0;
        $('quarterTitle').textContent=`${year} 年第 ${quarter} 季回收業績`;
        $('quarterSubheading').textContent=`${storeName}｜季度模擬業績與營運建議`;
        $('quarterUnits').textContent=`${totalUnits.toLocaleString('zh-TW')} 台`;
        $('quarterUnitsDelta').textContent=`較上季 ${delta>=0?'＋':''}${delta.toFixed(1)}%`;
        $('quarterWeight').textContent=`${totalWeight.toLocaleString('zh-TW')} kg`;
        $('quarterNet').textContent=fmt(totalNet);
        $('quarterGoal').textContent=`${achievement.toFixed(0)}%`;
        $('quarterGoalDetail').textContent=`模擬目標 ${target} 台｜${totalUnits>=target?'已達標':'尚差 '+(target-totalUnits)+' 台'}`;
        $('quarterChartLabel').textContent=`${storeName}｜${year} 年第 ${quarter} 季`;
        const activeMetric=document.querySelector('[data-quarter-metric].active')?.dataset.quarterMetric||'units';
        const metricValues=values[activeMetric],maxValue=Math.max(...metricValues,1);
        const unit=activeMetric==='units'?'台':activeMetric==='weight'?'kg':'';
        const chartValue=value=>activeMetric==='net'?fmt(value):`${value.toLocaleString('zh-TW')} ${unit}`;
        $('quarterChart').innerHTML=metricValues.map((value,index)=>`<div class="quarter-bar"><strong class="bar-value">${chartValue(value)}</strong><div class="bar-track" role="img" aria-label="${quarterMonths[index]} ${chartValue(value)}"><span style="height:${Math.max(7,value/maxValue*100)}%"></span></div><span class="bar-month">${quarterMonths[index]}</span></div>`).join('');
        const peakIndex=values.units.indexOf(Math.max(...values.units)),first=values.units[0],last=values.units[2],trend=first?((last-first)/first*100):0,averageWeight=totalUnits?totalWeight/totalUnits:0;
        const goalAdvice=achievement<90?`目前模擬回收 ${totalUnits} 台，距離季度目標還差 ${Math.max(0,target-totalUnits)} 台。可優先追蹤已詢問未預約的顧客，並安排同區集中收運。`:`目前模擬達成率 ${achievement.toFixed(0)}%，已接近或超過季度目標；可將高效收運時段分享給鄰近門市。`;
        const trendAdvice=trend>=0?`圖表顯示回收台數由 ${quarterMonths[0]} ${first} 台增至 ${quarterMonths[2]} ${last} 台；高峰落在 ${quarterMonths[peakIndex]}。建議沿用高峰月份的排班與預約提醒節奏。`:`圖表顯示回收台數由 ${quarterMonths[0]} ${first} 台降至 ${quarterMonths[2]} ${last} 台，約下降 ${Math.abs(trend).toFixed(0)}%。可檢視預約取消、派工時段與服務區覆蓋。`;
        const weightAdvice=`平均每台回收重量約 ${averageWeight.toFixed(1)} kg；可依大型家電比例安排併車與處理廠送貨批次，並持續核對門市出貨與處理廠回磅差異。`;
        $('aiAdviceList').innerHTML=[goalAdvice,trendAdvice,weightAdvice].map((advice,index)=>`<li><strong>${['目標進度','月度趨勢','收運效率'][index]}：</strong>${advice}</li>`).join('');
      }
      function showToast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200);}
      function updateDeviceModelPrompt(){
        const copy={'冷氣':['冷氣型號／冷房能力','例：型號或冷房能力'],'冰箱':['冰箱型號／容量','例：型號或容量（L）'],'洗衣機':['洗衣機型號／洗衣容量','例：型號或容量（kg）'],'其他大型家電':['設備型號／規格','輸入型號或主要規格']}[$('appliance').value];
        $('modelLabel').textContent=copy[0];$('model').placeholder=copy[1];
      }
      function submitTechReport(){
        const missing=[];
        if(!$('orderNo').value.trim())missing.push('訂單編號');
        if(!$('qrCode').value.trim())missing.push('舊機 QR');
        if(!$('technicianCode').value.trim())missing.push('師傅代碼');
        if(!$('serviceTime').value)missing.push('服務時間');
        if(!$('brand').value.trim())missing.push('品牌');
        if(!$('model').value.trim())missing.push('型號／容量');
        if(!$('years').value)missing.push('使用年數');
        if(num('storeWeight')<=0)missing.push('門市出貨整機重量');
        if($('photos').files.length<2)missing.push('至少 2 張現場照片');
        if(materialDefs.every(m=>num(m.id)===0))missing.push('至少一項拆解零件／材料');
        if(missing.length){techReportSubmitted=false;render();$('techReportStatus').className='tech-report-status warn';$('techReportStatus').textContent='尚缺：'+missing.join('、')+'。補齊後再送總公司覆核。';showToast('現場回報資料尚未完整');return;}
        techReportSubmitted=true;render();$('techReportStatus').textContent='示範回報已建立；後續由總公司比對影像、QR、規格與重量，核准前不撥款。';showToast('已完成示範回報檢查；未實際傳送或撥款');
      }
      function fillStores(){
        const stores=(storeData.stores||[]).slice().sort((a,b)=>a.city.localeCompare(b.city,'zh-Hant')||a.district.localeCompare(b.district,'zh-Hant')||a.name.localeCompare(b.name,'zh-Hant'));
        $('store').innerHTML=stores.map(s=>`<option value="${String(s.code).replaceAll('"','&quot;')}">${s.city} ${s.district}｜${s.name}</option>`).join('');
      }
      function downloadRecord(){
        const s=storeData.stores.find(x=>String(x.code)===$('store').value)||{};
        const gross=materialDefs.reduce((sum,m)=>sum+num(m.id)*num(m.rate),0);
        const labor=num('laborHours')*num('laborRate'),transport=num('transportKm')*num('transportRate')*num('roundTrip'),process=num('processCost');
        const totalCost=labor+transport+process;
        const storeWeight=num('storeWeight'),plantWeight=num('plantWeight');
        const match=storeWeight>0&&plantWeight>0?`${(Math.max(0,1-Math.abs(storeWeight-plantWeight)/Math.max(storeWeight,plantWeight))*100).toFixed(1)}%`: '待核秤';
        const fields=[['紀錄下載時間',new Date().toLocaleString('zh-TW')],['門市',s.name||''],['門市代碼',s.code||''],['師傅代碼',$('technicianCode').value],['師傅到府／收機時間',$('serviceTime').value],['訂單／收機單號',$('orderNo').value],['舊機QR',$('qrCode').value],['家電類型',$('appliance').value],['品牌',$('brand').value],['型號／容量',$('model').value],['使用年數',$('years').value],['收機狀況',$('condition').value],['完整度',$('complete').value],['門市出貨整機重量kg',$('storeWeight').value],['現場照片檔名',[...$('photos').files].map(f=>f.name).join('；')],['處理廠聯單',$('plantReceipt').value],['處理廠實際重量kg',$('plantWeight').value],['處理廠收件日期',$('receivedDate').value],['重量吻合率',match]];
        materialDefs.forEach(m=>fields.push([m.name+` (${m.unit})`,$(m.id).value]));
        fields.push(['材料預估回收價值',fmt(gross)],['拆解人工成本',fmt(labor)],['運輸成本',fmt(transport)],['暫存／處理廠成本',fmt(process)],['回收處理成本合計',fmt(totalCost)],['淨殘值',fmt(gross-totalCost)],['師傅估算分潤',$('techShare').textContent],['總部估算分潤',$('hqShare').textContent],['估值類型','展示假設，非正式價目']);
        const csv='\ufeff'+fields.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
        const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`回收估值_${$('orderNo').value||'未編號'}.csv`;a.click();URL.revokeObjectURL(url);showToast('已下載本機 CSV 估值紀錄');
      }
      function loadSample(){
        $('orderNo').value='DEMO-REC-001';$('qrCode').value='QR-DEMO-001';$('technicianCode').value='TECH-DEMO-01';$('serviceTime').value=localDateTime();$('appliance').value='冷氣';$('brand').value='國際牌';$('years').value=10;$('model').value='示範型號';$('condition').value='無法啟動／待檢';$('complete').value='完整';$('storeWeight').value=32;$('plantReceipt').value='DEMO-PLANT-001';$('plantWeight').value=31.2;$('receivedDate').value=new Date().toISOString().slice(0,10);updateDeviceModelPrompt();
        $('copperWire').value=0.8;$('copperPipe').value=1.6;$('aluminum').value=1;$('steel').value=8;$('board').value=0.4;$('plastic').value=1.5;$('compressor').value=1;$('motor').value=1;$('laborHours').value=0.5;$('laborRate').value=300;$('transportKm').value=15;$('transportRate').value=15;$('roundTrip').value=2;$('processCost').value=150;render();showToast('已載入示範回收紀錄；單價與成本為假設值');
      }
      function resetForm(){
        techReportSubmitted=false;$('orderNo').value='';$('qrCode').value='';$('technicianCode').value='';$('serviceTime').value=localDateTime();$('appliance').value='冷氣';$('brand').value='';$('years').value='';$('model').value='';$('condition').value='無法啟動／待檢';$('complete').value='完整';$('storeWeight').value=0;$('plantReceipt').value='';$('plantWeight').value=0;$('receivedDate').value='';updateDeviceModelPrompt();
        materialDefs.forEach(m=>$(m.id).value=0);$('laborHours').value=0.5;$('laborRate').value=300;$('transportKm').value=0;$('transportRate').value=15;$('roundTrip').value=2;$('processCost').value=150;$('photos').value='';$('photoList').textContent='照片只在此頁顯示檔名，不會上傳。';render();showToast('已清空本筆欄位');
      }
      fillStores();
      $('quarterSelect').value=String(Math.ceil((new Date().getMonth()+1)/3));
      if(!$('serviceTime').value)$('serviceTime').value=localDateTime();
      updateDeviceModelPrompt();
      document.querySelectorAll('[data-quarter-metric]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-quarter-metric]').forEach(item=>item.classList.toggle('active',item===button));renderQuarterDashboard();}));
      document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>{techReportSubmitted=false;render();}));
      document.querySelectorAll('select').forEach(el=>el.addEventListener('change',()=>{techReportSubmitted=false;updateDeviceModelPrompt();render();}));
      $('photos').addEventListener('change',()=>{$('photoList').textContent=[...$('photos').files].map(f=>f.name).join('、')||'照片只在此頁顯示檔名，不會上傳。';});
      $('sampleButton').addEventListener('click',loadSample);$('exportButton').addEventListener('click',downloadRecord);$('resetButton').addEventListener('click',resetForm);$('techSubmitButton').addEventListener('click',submitTechReport);
      render();
    })();
  